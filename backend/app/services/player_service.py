"""Player service - listing, filtering, details."""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Player, Injury, SeasonStat
from app.ml.predictor import predictor, risk_category
from app.ml.pipeline import SERIOUS_SEVERITY


def get_players_list(
    db: Session,
    search: str | None = None,
    pozitie: str | None = None,
    club: str | None = None,
    nationalitate: str | None = None,
    sort_by: str = "risk",
    order: str = "desc",
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = db.query(Player)

    if search:
        query = query.filter(Player.nume.ilike(f"%{search}%"))
    if pozitie:
        query = query.filter(Player.pozitie == pozitie)
    if club:
        query = query.filter(Player.club == club)
    if nationalitate:
        query = query.filter(Player.nationalitate == nationalitate)

    players = query.all()

    # Build result with injury count and risk
    records = []
    for p in players:
        inj_count = db.query(func.count(Injury.injury_id)).filter(Injury.player_id == p.player_id).scalar()
        score = predictor.get_risk_score(p.player_id)
        rc = risk_category(score)
        records.append({
            "player_id": p.player_id,
            "nume": p.nume,
            "data_nastere": p.data_nastere,
            "varsta": p.varsta,
            "nationalitate": p.nationalitate,
            "club": p.club,
            "pozitie": p.pozitie,
            "picior_dominant": p.picior_dominant,
            "inaltime_cm": p.inaltime_cm,
            "greutate_kg": p.greutate_kg,
            "bmi": p.bmi,
            "ani_experienta_pro": p.ani_experienta_pro,
            "scor_fitness": p.scor_fitness,
            "valoare_piata_eur": p.valoare_piata_eur,
            "n_injuries": inj_count,
            "risk_score": score,
            "risk_level": rc["level"],
            "risk_color": rc["color"],
            "risk_badge": rc["badge"],
        })

    # Sort
    sort_map = {
        "risk": "risk_score",
        "injuries": "n_injuries",
        "name": "nume",
        "age": "varsta",
        "fitness": "scor_fitness",
    }
    sort_key = sort_map.get(sort_by, "risk_score")
    reverse = order == "desc"
    records.sort(key=lambda x: x.get(sort_key) or 0, reverse=reverse)

    # Pagination
    total = len(records)
    start = (page - 1) * per_page
    page_records = records[start: start + per_page]

    # Filters
    positions = sorted(set(p.pozitie for p in db.query(Player.pozitie).distinct() if p.pozitie))
    clubs = sorted(set(p.club for p in db.query(Player.club).distinct() if p.club))
    nationalities = sorted(set(p.nationalitate for p in db.query(Player.nationalitate).distinct() if p.nationalitate))

    return {
        "players": page_records,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
        "filters": {
            "positions": positions,
            "clubs": clubs,
            "nationalities": nationalities,
        },
    }


def get_player_detail(db: Session, player_id: str) -> dict | None:
    p = db.query(Player).filter(Player.player_id == player_id).first()
    if not p:
        return None

    player = {
        "player_id": p.player_id,
        "nume": p.nume,
        "data_nastere": p.data_nastere,
        "varsta": p.varsta,
        "nationalitate": p.nationalitate,
        "club": p.club,
        "pozitie": p.pozitie,
        "picior_dominant": p.picior_dominant,
        "inaltime_cm": p.inaltime_cm,
        "greutate_kg": p.greutate_kg,
        "bmi": p.bmi,
        "ani_experienta_pro": p.ani_experienta_pro,
        "scor_fitness": p.scor_fitness,
        "valoare_piata_eur": p.valoare_piata_eur,
    }

    # Injuries
    injuries = (
        db.query(Injury)
        .filter(Injury.player_id == player_id)
        .order_by(Injury.data_accidentare.desc())
        .all()
    )
    injuries_list = [
        {
            "injury_id": inj.injury_id,
            "sezon": inj.sezon,
            "data_accidentare": inj.data_accidentare,
            "data_revenire": inj.data_revenire,
            "tip_accidentare": inj.tip_accidentare,
            "parte_corp": inj.parte_corp,
            "severitate": inj.severitate,
            "zile_absenta": inj.zile_absenta,
            "mecanism": inj.mecanism,
            "context": inj.context,
            "minut_accidentare": inj.minut_accidentare,
            "suprafata_teren": inj.suprafata_teren,
            "conditii_meteo": inj.conditii_meteo,
            "temperatura_c": inj.temperatura_c,
            "recidiva": inj.recidiva,
            "interventie_chirurgicala": inj.interventie_chirurgicala,
        }
        for inj in injuries
    ]

    # Season stats
    stats = (
        db.query(SeasonStat)
        .filter(SeasonStat.player_id == player_id)
        .order_by(SeasonStat.sezon)
        .all()
    )
    stats_list = [
        {
            "stat_id": s.stat_id,
            "sezon": s.sezon,
            "meciuri_jucate": s.meciuri_jucate,
            "meciuri_titular": s.meciuri_titular,
            "minute_jucate": s.minute_jucate,
            "goluri": s.goluri,
            "pase_decisive": s.pase_decisive,
            "suturi": s.suturi,
            "precizie_pase_pct": s.precizie_pase_pct,
            "tackle_uri": s.tackle_uri,
            "dueluri_castigate": s.dueluri_castigate,
            "distanta_totala_km": s.distanta_totala_km,
            "sprinturi_totale": s.sprinturi_totale,
            "cartonase_galbene": s.cartonase_galbene,
            "cartonase_rosii": s.cartonase_rosii,
            "indice_incarcare": s.indice_incarcare,
        }
        for s in stats
    ]

    # Risk
    score = predictor.get_risk_score(player_id)
    rc = risk_category(score)

    # Feature contributions
    contributions = []
    if predictor.is_loaded:
        import json
        import os
        from app.config import MODEL_DIR

        stats_path = os.path.join(MODEL_DIR, "feature_stats.json")
        if os.path.exists(stats_path):
            with open(stats_path) as f:
                fstats = json.load(f)

            if hasattr(predictor.model, "feature_importances_"):
                importances = predictor.model.feature_importances_
            elif hasattr(predictor.model, "coef_"):
                import numpy as np
                importances = np.abs(predictor.model.coef_[0])
                importances = importances / importances.sum()
            else:
                import numpy as np
                importances = np.ones(len(predictor.feature_names)) / len(predictor.feature_names)

            for i, f in enumerate(predictor.feature_names):
                mean = float(fstats["mean"].get(f, 0))
                std = float(fstats["std"].get(f, 1))
                if std == 0:
                    std = 1
                contributions.append({
                    "feature": predictor.feature_labels.get(f, f),
                    "key": f,
                    "importance": round(float(importances[i] * 100), 1),
                    "mean": round(mean, 2),
                    "z_score": 0,  # Will be filled if we have player features
                })
            contributions.sort(key=lambda x: x["importance"], reverse=True)

    # Injury stats
    total_inj = len(injuries_list)
    serious_count = sum(1 for inj in injuries_list if inj["severitate"] in SERIOUS_SEVERITY)
    total_days = sum(inj["zile_absenta"] or 0 for inj in injuries_list)
    surgeries = sum(1 for inj in injuries_list if inj["interventie_chirurgicala"] == "Da")
    recurrences = sum(1 for inj in injuries_list if inj["recidiva"] == "Da")

    # By type / by part
    from collections import Counter
    by_type = dict(Counter(inj["tip_accidentare"] for inj in injuries_list).most_common(5))
    by_part = dict(Counter(inj["parte_corp"] for inj in injuries_list).most_common(5))

    return {
        "player": player,
        "injuries": injuries_list,
        "stats": stats_list,
        "injury_stats": {
            "total": total_inj,
            "serious": serious_count,
            "total_days": total_days,
            "surgeries": surgeries,
            "recurrences": recurrences,
            "by_type": by_type,
            "by_part": by_part,
        },
        "risk_score": score,
        "risk_level": rc["level"],
        "risk_color": rc["color"],
        "risk_badge": rc["badge"],
        "feature_contributions": contributions[:8],
    }
