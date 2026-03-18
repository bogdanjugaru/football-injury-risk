"""Statistics service - all chart data aggregations."""
import pandas as pd
from sqlalchemy.orm import Session
from app.models import Player, Injury, SeasonStat
from app.ml.predictor import predictor


def get_statistics_data(db: Session) -> dict:
    injuries_df = pd.read_sql(db.query(Injury).statement, db.bind)
    players_df = pd.read_sql(db.query(Player).statement, db.bind)

    # Injury types
    inj_types = injuries_df["tip_accidentare"].value_counts().head(15).to_dict()

    # By mechanism
    mechanism = injuries_df["mecanism"].value_counts().to_dict()

    # By context
    context_dist = injuries_df["context"].value_counts().to_dict()

    # By surface
    surface = injuries_df["suprafata_teren"].value_counts().to_dict()

    # By weather
    weather = injuries_df["conditii_meteo"].value_counts().to_dict()

    # By position
    pos_df = injuries_df.merge(players_df[["player_id", "pozitie"]], on="player_id", how="left")
    by_position = (
        pos_df.groupby("pozitie")
        .agg(n=("injury_id", "count"), avg_days=("zile_absenta", "mean"))
        .reset_index()
    )
    by_position["avg_days"] = by_position["avg_days"].round(1)
    by_position = by_position.sort_values("n", ascending=False).to_dict("records")

    # Age group
    age_df = injuries_df.merge(players_df[["player_id", "varsta"]], on="player_id", how="left")
    bins = [15, 20, 23, 26, 29, 32, 35, 45]
    labels = ["16-20", "21-23", "24-26", "27-29", "30-32", "33-35", "36+"]
    age_df["age_group"] = pd.cut(age_df["varsta"], bins=bins, labels=labels, right=True)
    by_age = (
        age_df.groupby("age_group", observed=False)
        .agg(n=("injury_id", "count"), avg_days=("zile_absenta", "mean"))
        .reset_index()
    )
    by_age["avg_days"] = by_age["avg_days"].round(1)
    by_age["age_group"] = by_age["age_group"].astype(str)

    # Avg days by type
    avg_days_type = (
        injuries_df.groupby("tip_accidentare")["zile_absenta"]
        .mean().round(1).sort_values(ascending=False).head(12).to_dict()
    )

    # Surgery rate by type
    surg = (
        injuries_df.groupby("tip_accidentare")
        .agg(total=("injury_id", "count"), surgery=("interventie_chirurgicala", lambda x: (x == "Da").sum()))
        .reset_index()
    )
    surg["rate"] = (surg["surgery"] / surg["total"] * 100).round(1)
    surg = surg[surg["total"] >= 3].sort_values("rate", ascending=False).head(10)

    # Position risk from ML model
    pos_risk = {}
    for pid, score in predictor.risk_scores.items():
        p = db.query(Player.pozitie).filter(Player.player_id == pid).first()
        if p and p.pozitie:
            pos_risk.setdefault(p.pozitie, []).append(score)
    pos_risk_avg = {k: round(sum(v) / len(v), 1) for k, v in pos_risk.items()}
    pos_risk_avg = dict(sorted(pos_risk_avg.items(), key=lambda x: x[1], reverse=True))

    return {
        "injury_types": inj_types,
        "mechanism": mechanism,
        "context": context_dist,
        "surface": surface,
        "weather": weather,
        "by_position": by_position,
        "by_age": by_age.to_dict("records"),
        "avg_days_by_type": avg_days_type,
        "surgery_rate_by_type": surg.to_dict("records"),
        "position_risk": pos_risk_avg,
    }
