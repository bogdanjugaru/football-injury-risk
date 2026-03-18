"""
Feature Engineering Pipeline - construieste matricea de features din baza de date.
Expandat de la 14 la ~24 features pentru performanta ML superioara.
"""
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.models import Player, Injury, SeasonStat

SERIOUS_SEVERITY = [
    "Moderată (8–28 zile)",
    "Severă (29–90 zile)",
    "Foarte severă (>90 zile)",
]

SEVERITY_MAP = {
    "Ușoară (1–7 zile)": 1,
    "Moderată (8–28 zile)": 2,
    "Severă (29–90 zile)": 3,
    "Foarte severă (>90 zile)": 4,
}

FEATURES = [
    # --- Original 14 ---
    "varsta",
    "bmi",
    "ani_experienta_pro",
    "scor_fitness",
    "pozitie_enc",
    "inaltime_cm",
    "greutate_kg",
    "minute_jucate",
    "meciuri_jucate",
    "distanta_totala_km",
    "sprinturi_totale",
    "indice_incarcare",
    "cartonase_galbene",
    "total_prev_injuries",
    # --- New engineered features ---
    "injury_frequency",
    "avg_days_absent",
    "max_severity_prev",
    "recurrence_rate",
    "minutes_per_match",
    "sprint_intensity",
    "workload_change",
    "age_squared",
    "bmi_category",
    "position_risk_group",
]

FEATURE_LABELS = {
    "varsta": "Vârstă",
    "bmi": "Indice de masă corporală",
    "ani_experienta_pro": "Ani experiență profesionistă",
    "scor_fitness": "Scor fitness",
    "pozitie_enc": "Poziție (encoded)",
    "inaltime_cm": "Înălțime (cm)",
    "greutate_kg": "Greutate (kg)",
    "minute_jucate": "Minute jucate",
    "meciuri_jucate": "Meciuri jucate",
    "distanta_totala_km": "Distanță totală (km)",
    "sprinturi_totale": "Sprinturi totale",
    "indice_incarcare": "Indice încărcare",
    "cartonase_galbene": "Cartonașe galbene",
    "total_prev_injuries": "Accidentări anterioare",
    "injury_frequency": "Frecvență accidentări/sezon",
    "avg_days_absent": "Media zilelor de absență",
    "max_severity_prev": "Severitate max. anterioară",
    "recurrence_rate": "Rată recidivă (%)",
    "minutes_per_match": "Minute per meci",
    "sprint_intensity": "Intensitate sprinturi/km",
    "workload_change": "Variația încărcării",
    "age_squared": "Vârstă²",
    "bmi_category": "Categorie IMC",
    "position_risk_group": "Grup risc poziție",
}

POSITION_GROUPS = {
    "GK": 0,
    "CB": 1, "LB": 1, "RB": 1, "RWB": 1, "LWB": 1,
    "CDM": 2, "CM": 2, "CAM": 2, "LM": 2, "RM": 2,
    "ST": 3, "CF": 3, "LW": 3, "RW": 3, "SS": 3,
}


def load_dataframes(db: Session) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load all data from SQLite into pandas DataFrames."""
    players = pd.read_sql(db.query(Player).statement, db.bind)
    injuries = pd.read_sql(db.query(Injury).statement, db.bind)
    stats = pd.read_sql(db.query(SeasonStat).statement, db.bind)
    return players, injuries, stats


def build_feature_matrix(db: Session) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """
    Build the full feature matrix from the database.
    Returns (X_df, y_series, feature_names).
    """
    players_df, injuries_df, stats_df = load_dataframes(db)

    # --- Injury aggregation per (player_id, sezon) ---
    injury_agg = (
        injuries_df.groupby(["player_id", "sezon"])
        .agg(
            n_injuries=("injury_id", "count"),
            n_serious=("severitate", lambda x: sum(x.isin(SERIOUS_SEVERITY))),
            total_days=("zile_absenta", "sum"),
            had_surgery=("interventie_chirurgicala", lambda x: int("Da" in x.values)),
        )
        .reset_index()
    )
    injury_agg["had_serious"] = (injury_agg["n_serious"] > 0).astype(int)

    # --- Base merge: stats + players ---
    df = stats_df.merge(players_df, on="player_id", how="left")

    # --- Original: total previous injuries ---
    prev_inj = injuries_df.groupby("player_id").size().reset_index(name="total_prev_injuries")
    df = df.merge(prev_inj, on="player_id", how="left")
    df["total_prev_injuries"] = df["total_prev_injuries"].fillna(0)

    # --- Target variable ---
    df = df.merge(
        injury_agg[["player_id", "sezon", "had_serious", "n_injuries"]],
        on=["player_id", "sezon"],
        how="left",
    )
    df["had_serious"] = df["had_serious"].fillna(0).astype(int)
    df["n_injuries"] = df["n_injuries"].fillna(0)

    # --- NEW FEATURES ---

    # 1. injury_frequency: injuries per season (historical avg)
    seasons_per_player = injuries_df.groupby("player_id")["sezon"].nunique().reset_index(name="n_seasons_inj")
    count_per_player = injuries_df.groupby("player_id").size().reset_index(name="total_inj_count")
    freq = seasons_per_player.merge(count_per_player, on="player_id")
    freq["injury_frequency"] = freq["total_inj_count"] / freq["n_seasons_inj"].clip(lower=1)
    df = df.merge(freq[["player_id", "injury_frequency"]], on="player_id", how="left")
    df["injury_frequency"] = df["injury_frequency"].fillna(0)

    # 2. avg_days_absent (historical)
    avg_days = injuries_df.groupby("player_id")["zile_absenta"].mean().reset_index(name="avg_days_absent")
    df = df.merge(avg_days, on="player_id", how="left")
    df["avg_days_absent"] = df["avg_days_absent"].fillna(0)

    # 3. max_severity_prev
    injuries_df["severity_ord"] = injuries_df["severitate"].map(SEVERITY_MAP).fillna(0)
    max_sev = injuries_df.groupby("player_id")["severity_ord"].max().reset_index(name="max_severity_prev")
    df = df.merge(max_sev, on="player_id", how="left")
    df["max_severity_prev"] = df["max_severity_prev"].fillna(0)

    # 4. recurrence_rate
    rec = injuries_df.groupby("player_id").agg(
        total=("injury_id", "count"),
        recurrences=("recidiva", lambda x: (x == "Da").sum()),
    ).reset_index()
    rec["recurrence_rate"] = (rec["recurrences"] / rec["total"].clip(lower=1) * 100).round(1)
    df = df.merge(rec[["player_id", "recurrence_rate"]], on="player_id", how="left")
    df["recurrence_rate"] = df["recurrence_rate"].fillna(0)

    # 5. minutes_per_match
    df["minutes_per_match"] = (
        df["minute_jucate"] / df["meciuri_jucate"].clip(lower=1)
    ).round(1)

    # 6. sprint_intensity (sprints per km)
    df["sprint_intensity"] = (
        df["sprinturi_totale"] / df["distanta_totala_km"].clip(lower=1)
    ).round(2)

    # 7. workload_change (vs previous season for same player)
    df = df.sort_values(["player_id", "sezon"])
    df["workload_change"] = df.groupby("player_id")["indice_incarcare"].diff().fillna(0)

    # 8. age_squared
    df["age_squared"] = df["varsta"] ** 2

    # 9. bmi_category (0=underweight, 1=normal, 2=overweight)
    df["bmi_category"] = pd.cut(
        df["bmi"], bins=[0, 18.5, 25, 50], labels=[0, 1, 2]
    ).astype(float).fillna(1)

    # 10. position_risk_group
    df["position_risk_group"] = df["pozitie"].map(POSITION_GROUPS).fillna(2)

    # --- Position encoding ---
    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    df["pozitie_enc"] = le.fit_transform(df["pozitie"].fillna("Unknown"))

    # --- Build X, y ---
    X = df[FEATURES].fillna(df[FEATURES].mean())
    y = df["had_serious"]

    return X, y, FEATURES, le, df
