"""
Seed script - importa datele din CSV-uri in SQLite.
Ruleaza: cd backend && python -m scripts.seed_db
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from app.database import engine, SessionLocal, Base
from app.models import Player, Injury, SeasonStat, Match
from app.config import DATA_DIR


def read_csv(filename):
    path = os.path.join(DATA_DIR, filename)
    df = pd.read_csv(path)
    df.columns = [c.lstrip("\ufeff") for c in df.columns]
    return df


def seed():
    print("[*] Creare tabele...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Player).count() > 0:
            print("[OK] Baza de date deja populata. Se sare peste seed.")
            return

        # 1. Players
        print("[*] Import jucatori.csv...")
        players = read_csv("jucatori.csv")
        for _, row in players.iterrows():
            db.add(Player(
                player_id=row["player_id"],
                nume=row["nume"],
                data_nastere=str(row.get("data_nastere", "")),
                varsta=int(row["varsta"]) if pd.notna(row.get("varsta")) else None,
                nationalitate=str(row.get("nationalitate", "")),
                club=str(row.get("club", "")),
                pozitie=str(row.get("pozitie", "")),
                picior_dominant=str(row.get("picior_dominant", "")),
                inaltime_cm=float(row["inaltime_cm"]) if pd.notna(row.get("inaltime_cm")) else None,
                greutate_kg=float(row["greutate_kg"]) if pd.notna(row.get("greutate_kg")) else None,
                bmi=float(row["bmi"]) if pd.notna(row.get("bmi")) else None,
                ani_experienta_pro=int(row["ani_experienta_pro"]) if pd.notna(row.get("ani_experienta_pro")) else None,
                scor_fitness=float(row["scor_fitness"]) if pd.notna(row.get("scor_fitness")) else None,
                valoare_piata_eur=float(row["valoare_piata_eur"]) if pd.notna(row.get("valoare_piata_eur")) else None,
            ))
        db.commit()
        print(f"  -> {db.query(Player).count()} jucatori inserati")

        # 2. Injuries
        print("[*] Import accidentari.csv...")
        injuries = read_csv("accidentari.csv")
        for _, row in injuries.iterrows():
            db.add(Injury(
                injury_id=row["injury_id"],
                player_id=row["player_id"],
                sezon=str(row.get("sezon", "")),
                data_accidentare=str(row.get("data_accidentare", "")),
                data_revenire=str(row.get("data_revenire", "")),
                tip_accidentare=str(row.get("tip_accidentare", "")),
                parte_corp=str(row.get("parte_corp", "")),
                severitate=str(row.get("severitate", "")),
                zile_absenta=int(row["zile_absenta"]) if pd.notna(row.get("zile_absenta")) else None,
                mecanism=str(row.get("mecanism", "")),
                context=str(row.get("context", "")),
                minut_accidentare=int(row["minut_accidentare"]) if pd.notna(row.get("minut_accidentare")) else None,
                suprafata_teren=str(row.get("suprafata_teren", "")),
                conditii_meteo=str(row.get("conditii_meteo", "")),
                temperatura_c=float(row["temperatura_c"]) if pd.notna(row.get("temperatura_c")) else None,
                recidiva=str(row.get("recidiva", "")),
                interventie_chirurgicala=str(row.get("interventie_chirurgicala", "")),
            ))
        db.commit()
        print(f"  -> {db.query(Injury).count()} accidentari inserate")

        # 3. Season Stats
        print("[*] Import statistici_sezon.csv...")
        stats = read_csv("statistici_sezon.csv")
        for _, row in stats.iterrows():
            db.add(SeasonStat(
                stat_id=row["stat_id"],
                player_id=row["player_id"],
                sezon=str(row.get("sezon", "")),
                meciuri_jucate=int(row["meciuri_jucate"]) if pd.notna(row.get("meciuri_jucate")) else None,
                meciuri_titular=int(row["meciuri_titular"]) if pd.notna(row.get("meciuri_titular")) else None,
                minute_jucate=int(row["minute_jucate"]) if pd.notna(row.get("minute_jucate")) else None,
                goluri=int(row["goluri"]) if pd.notna(row.get("goluri")) else None,
                pase_decisive=int(row["pase_decisive"]) if pd.notna(row.get("pase_decisive")) else None,
                suturi=int(row["suturi"]) if pd.notna(row.get("suturi")) else None,
                precizie_pase_pct=float(row["precizie_pase_pct"]) if pd.notna(row.get("precizie_pase_pct")) else None,
                tackle_uri=int(row["tackle_uri"]) if pd.notna(row.get("tackle_uri")) else None,
                dueluri_castigate=int(row["dueluri_castigate"]) if pd.notna(row.get("dueluri_castigate")) else None,
                distanta_totala_km=float(row["distanta_totala_km"]) if pd.notna(row.get("distanta_totala_km")) else None,
                sprinturi_totale=int(row["sprinturi_totale"]) if pd.notna(row.get("sprinturi_totale")) else None,
                cartonase_galbene=int(row["cartonase_galbene"]) if pd.notna(row.get("cartonase_galbene")) else None,
                cartonase_rosii=int(row["cartonase_rosii"]) if pd.notna(row.get("cartonase_rosii")) else None,
                indice_incarcare=float(row["indice_incarcare"]) if pd.notna(row.get("indice_incarcare")) else None,
            ))
        db.commit()
        print(f"  -> {db.query(SeasonStat).count()} statistici inserate")

        # 4. Matches
        print("[*] Import meciuri.csv...")
        matches = read_csv("meciuri.csv")
        for _, row in matches.iterrows():
            db.add(Match(
                match_id=row["match_id"],
                sezon=str(row.get("sezon", "")),
                data_meci=str(row.get("data_meci", "")),
                competitie=str(row.get("competitie", "")),
                echipa_acasa=str(row.get("echipa_acasa", "")),
                echipa_deplasare=str(row.get("echipa_deplasare", "")),
                goluri_acasa=int(row["goluri_acasa"]) if pd.notna(row.get("goluri_acasa")) else None,
                goluri_deplasare=int(row["goluri_deplasare"]) if pd.notna(row.get("goluri_deplasare")) else None,
                rezultat=str(row.get("rezultat", "")),
                suprafata_teren=str(row.get("suprafata_teren", "")),
                conditii_meteo=str(row.get("conditii_meteo", "")),
                temperatura_c=float(row["temperatura_c"]) if pd.notna(row.get("temperatura_c")) else None,
                spectatori=int(row["spectatori"]) if pd.notna(row.get("spectatori")) else None,
            ))
        db.commit()
        print(f"  -> {db.query(Match).count()} meciuri inserate")

        print("\n[OK] Seed complet!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
