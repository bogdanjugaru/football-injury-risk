import json
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.services.player_service import get_players_list, get_player_detail
from app.ml.predictor import predictor
from app.models import Player, Injury, SeasonStat
from app.models.prediction import PredictionLog
from collections import Counter

router = APIRouter(prefix="/api", tags=["Players"])


@router.get("/players/search")
def search_players_for_prediction(q: str = "", db: Session = Depends(get_db)):
    """Search players for prediction dropdown."""
    query = db.query(Player)
    if q:
        query = query.filter(Player.nume.ilike(f"%{q}%"))
    players = query.order_by(Player.nume).limit(50).all()
    return [
        {
            "player_id": p.player_id,
            "nume": p.nume,
            "club": p.club,
            "pozitie": p.pozitie,
            "varsta": p.varsta,
        }
        for p in players
    ]


@router.get("/players")
def get_players(
    search: Optional[str] = None,
    pozitie: Optional[str] = None,
    club: Optional[str] = None,
    nationalitate: Optional[str] = None,
    sort_by: str = "risk",
    order: str = "desc",
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
):
    return get_players_list(db, search, pozitie, club, nationalitate, sort_by, order, page, per_page)


@router.get("/players/timeline/{player_id}")
def get_player_injury_timeline(player_id: str, db: Session = Depends(get_db)):
    """Get full injury timeline and summary stats for a player."""
    player = db.query(Player).filter(Player.player_id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    injuries = (
        db.query(Injury)
        .filter(Injury.player_id == player_id)
        .order_by(Injury.data_accidentare.asc())
        .all()
    )

    injuries_list = [
        {
            "data_accidentare": inj.data_accidentare,
            "data_revenire": inj.data_revenire,
            "tip_accidentare": inj.tip_accidentare,
            "parte_corp": inj.parte_corp,
            "severitate": inj.severitate,
            "zile_absenta": inj.zile_absenta,
            "mecanism": inj.mecanism,
            "context": inj.context,
            "recidiva": inj.recidiva,
            "sezon": inj.sezon,
        }
        for inj in injuries
    ]

    total = len(injuries)
    total_days = sum(inj.zile_absenta or 0 for inj in injuries)

    # Most common body part
    body_parts = Counter(inj.parte_corp for inj in injuries if inj.parte_corp)
    most_common_body = body_parts.most_common(1)
    most_common_body_part = (
        {"parte": most_common_body[0][0], "count": most_common_body[0][1]}
        if most_common_body
        else {"parte": None, "count": 0}
    )

    # Most common injury type
    injury_types = Counter(inj.tip_accidentare for inj in injuries if inj.tip_accidentare)
    most_common_type_val = injury_types.most_common(1)
    most_common_type = (
        {"tip": most_common_type_val[0][0], "count": most_common_type_val[0][1]}
        if most_common_type_val
        else {"tip": None, "count": 0}
    )

    # Average recovery by severity
    by_severity = {}
    for inj in injuries:
        sev = inj.severitate or "Necunoscuta"
        if sev not in by_severity:
            by_severity[sev] = {"count": 0, "total_days": 0}
        by_severity[sev]["count"] += 1
        by_severity[sev]["total_days"] += inj.zile_absenta or 0
    for sev, data in by_severity.items():
        data["avg_days"] = round(data["total_days"] / max(data["count"], 1), 1)
        del data["total_days"]

    # By body part breakdown
    by_body_part = []
    for parte, count in body_parts.most_common():
        part_days = sum(inj.zile_absenta or 0 for inj in injuries if inj.parte_corp == parte)
        by_body_part.append({"parte": parte, "count": count, "total_days": part_days})

    # Recurrence rate
    recurrences = sum(1 for inj in injuries if inj.recidiva == "Da")
    recurrence_rate = round((recurrences / max(total, 1)) * 100, 1)

    return {
        "player_id": player_id,
        "player_name": player.nume,
        "injuries": injuries_list,
        "summary": {
            "total": total,
            "total_days": total_days,
            "avg_recovery": round(total_days / max(total, 1), 1),
            "most_common_body_part": most_common_body_part,
            "most_common_type": most_common_type,
            "by_severity": by_severity,
            "by_body_part": by_body_part,
            "recurrence_rate": recurrence_rate,
        },
    }


@router.get("/players/{player_id}/predict")
def predict_existing_player(player_id: str, db: Session = Depends(get_db)):
    """Predict risk for an existing player using their real data from the database."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Modelul nu este incarcat")

    p = db.query(Player).filter(Player.player_id == player_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    latest_stat = (
        db.query(SeasonStat)
        .filter(SeasonStat.player_id == player_id)
        .order_by(SeasonStat.sezon.desc())
        .first()
    )

    injuries = db.query(Injury).filter(Injury.player_id == player_id).all()
    total_injuries = len(injuries)
    total_days = sum(inj.zile_absenta or 0 for inj in injuries)
    serious_injuries = [inj for inj in injuries if (inj.zile_absenta or 0) > 28]
    recurrences = sum(1 for inj in injuries if inj.recidiva == "Da")

    input_data = {
        "varsta": p.varsta or 25,
        "bmi": p.bmi or 23.0,
        "ani_experienta_pro": p.ani_experienta_pro or 5,
        "scor_fitness": p.scor_fitness or 75,
        "pozitie": p.pozitie or "ST",
        "inaltime_cm": p.inaltime_cm or 180,
        "greutate_kg": p.greutate_kg or 75,
        "minute_jucate": latest_stat.minute_jucate if latest_stat else 2000,
        "meciuri_jucate": latest_stat.meciuri_jucate if latest_stat else 25,
        "distanta_totala_km": latest_stat.distanta_totala_km if latest_stat else 300,
        "sprinturi_totale": latest_stat.sprinturi_totale if latest_stat else 1500,
        "indice_incarcare": latest_stat.indice_incarcare if latest_stat else 60,
        "cartonase_galbene": latest_stat.cartonase_galbene if latest_stat else 3,
        "total_prev_injuries": total_injuries,
        "injury_frequency": total_injuries / max(p.ani_experienta_pro or 1, 1),
        "avg_days_absent": total_days / max(total_injuries, 1),
        "max_severity_prev": max((inj.zile_absenta or 0) for inj in injuries) if injuries else 0,
        "recurrence_rate": recurrences / max(total_injuries, 1),
    }

    try:
        result = predictor.predict(input_data)
        result["player"] = {
            "player_id": p.player_id,
            "nume": p.nume,
            "club": p.club,
            "pozitie": p.pozitie,
            "varsta": p.varsta,
            "inaltime_cm": p.inaltime_cm,
            "greutate_kg": p.greutate_kg,
            "bmi": p.bmi,
            "scor_fitness": p.scor_fitness,
            "nationalitate": p.nationalitate,
        }
        result["input_used"] = input_data
        result["injury_summary"] = {
            "total": total_injuries,
            "serious": len(serious_injuries),
            "total_days": total_days,
            "recurrences": recurrences,
            "avg_days": round(total_days / max(total_injuries, 1), 1),
        }

        log = PredictionLog(
            input_json=json.dumps(input_data),
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            model_used=result["model_used"],
            shap_values_json=json.dumps(result.get("shap_values")),
            recommendations_json=json.dumps(result["recommendations"], ensure_ascii=False),
        )
        db.add(log)
        db.commit()

        return result
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)})


@router.get("/players/squad")
def get_squad_overview(club: str, db: Session = Depends(get_db)):
    """Get all players from a club with risk scores and injury stats."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Modelul nu este incarcat")

    from app.ml.predictor import risk_category
    from sqlalchemy import func as sqlfunc

    players = db.query(Player).filter(Player.club == club).order_by(Player.nume).all()
    if not players:
        raise HTTPException(status_code=404, detail="Clubul nu a fost gasit")

    result = []
    for p in players:
        injuries = db.query(Injury).filter(Injury.player_id == p.player_id).all()
        total_inj = len(injuries)
        total_days = sum(inj.zile_absenta or 0 for inj in injuries)
        serious = sum(1 for inj in injuries if (inj.zile_absenta or 0) > 28)

        risk_score = predictor.get_risk_score(p.player_id, age=p.varsta, position=p.pozitie)
        rc = risk_category(risk_score)

        result.append({
            "player_id": p.player_id,
            "nume": p.nume,
            "pozitie": p.pozitie,
            "varsta": p.varsta,
            "nationalitate": p.nationalitate,
            "scor_fitness": p.scor_fitness,
            "risk_score": risk_score,
            "risk_level": rc["level"],
            "risk_color": rc["color"],
            "total_injuries": total_inj,
            "serious_injuries": serious,
            "total_days": total_days,
        })

    result.sort(key=lambda x: x["risk_score"], reverse=True)

    # Squad stats
    risk_scores = [r["risk_score"] for r in result]
    avg_risk = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0
    high_risk = sum(1 for r in risk_scores if r >= 50)
    critical = sum(1 for r in risk_scores if r >= 75)

    # Get all clubs for dropdown
    all_clubs = [row[0] for row in db.query(Player.club).distinct().order_by(Player.club).all()]

    return {
        "club": club,
        "players": result,
        "summary": {
            "total_players": len(result),
            "avg_risk": avg_risk,
            "high_risk": high_risk,
            "critical": critical,
            "total_injuries": sum(r["total_injuries"] for r in result),
        },
        "all_clubs": all_clubs,
    }


@router.get("/players/benchmark/{player_id}")
def get_position_benchmark(player_id: str, db: Session = Depends(get_db)):
    """Compare a player's stats against the average for their position group."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Modelul nu este incarcat")

    from app.ml.predictor import risk_category

    player = db.query(Player).filter(Player.player_id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")

    position = player.pozitie
    if not position:
        raise HTTPException(status_code=400, detail="Jucatorul nu are pozitie definita")

    # Get all players with the same position
    position_players = db.query(Player).filter(Player.pozitie == position).all()

    # Gather metrics for each player in the position group
    metrics_list = []
    player_metrics = None

    for p in position_players:
        latest_stat = (
            db.query(SeasonStat)
            .filter(SeasonStat.player_id == p.player_id)
            .order_by(SeasonStat.sezon.desc())
            .first()
        )
        injuries = db.query(Injury).filter(Injury.player_id == p.player_id).all()
        total_injuries = len(injuries)
        total_days = sum(inj.zile_absenta or 0 for inj in injuries)

        risk_score = predictor.get_risk_score(p.player_id, age=p.varsta, position=p.pozitie)

        m = {
            "risk_score": risk_score,
            "fitness": p.scor_fitness or 0,
            "total_injuries": total_injuries,
            "total_days_absent": total_days,
            "avg_days_per_injury": round(total_days / max(total_injuries, 1), 1),
            "workload": round(latest_stat.indice_incarcare, 1) if latest_stat and latest_stat.indice_incarcare else 0,
            "minutes_played": latest_stat.minute_jucate if latest_stat else 0,
            "matches_played": latest_stat.meciuri_jucate if latest_stat else 0,
        }
        metrics_list.append(m)

        if p.player_id == player_id:
            rc = risk_category(risk_score)
            player_metrics = {
                **m,
                "name": p.nume,
                "position": position,
                "risk_level": rc["level"],
                "risk_color": rc["color"],
            }

    if not player_metrics:
        raise HTTPException(status_code=500, detail="Eroare la calculul metricilor")

    count = len(metrics_list)
    metric_keys = ["risk_score", "fitness", "total_injuries", "total_days_absent",
                   "avg_days_per_injury", "workload", "minutes_played", "matches_played"]

    # Position averages
    position_avg = {}
    for key in metric_keys:
        values = [m[key] for m in metrics_list]
        position_avg[key] = round(sum(values) / max(len(values), 1), 1)

    # Delta (player - average)
    delta = {}
    for key in metric_keys:
        diff = player_metrics[key] - position_avg[key]
        sign = "+" if diff >= 0 else ""
        delta[key] = f"{sign}{round(diff, 1)}"

    # Percentile rank (percentage of position players the player is equal to or exceeds)
    percentile = {}
    for key in metric_keys:
        val = player_metrics[key]
        below = sum(1 for m in metrics_list if m[key] <= val)
        percentile[key] = round((below / max(count, 1)) * 100)

    return {
        "player": player_metrics,
        "position_avg": position_avg,
        "delta": delta,
        "percentile": percentile,
        "position_players_count": count,
        "position": position,
    }


@router.get("/players/compare")
def compare_players(ids: str, db: Session = Depends(get_db)):
    """Compare 2-3 players side by side. ids = comma-separated player_ids."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Modelul nu este incarcat")

    player_ids = [pid.strip() for pid in ids.split(",") if pid.strip()]
    if len(player_ids) < 2 or len(player_ids) > 3:
        raise HTTPException(status_code=400, detail="Selecteaza 2 sau 3 jucatori")

    results = []
    for pid in player_ids:
        p = db.query(Player).filter(Player.player_id == pid).first()
        if not p:
            continue

        latest_stat = (
            db.query(SeasonStat)
            .filter(SeasonStat.player_id == pid)
            .order_by(SeasonStat.sezon.desc())
            .first()
        )
        injuries = db.query(Injury).filter(Injury.player_id == pid).all()
        total_injuries = len(injuries)
        total_days = sum(inj.zile_absenta or 0 for inj in injuries)
        serious = sum(1 for inj in injuries if (inj.zile_absenta or 0) > 28)
        recurrences = sum(1 for inj in injuries if inj.recidiva == "Da")

        risk_score = predictor.get_risk_score(pid, age=p.varsta, position=p.pozitie)
        from app.ml.predictor import risk_category
        rc = risk_category(risk_score)

        # Top injury types
        from collections import Counter
        injury_types = Counter(inj.tip_accidentare for inj in injuries if inj.tip_accidentare)
        top_injuries = [{"type": k, "count": v} for k, v in injury_types.most_common(3)]

        results.append({
            "player_id": p.player_id,
            "nume": p.nume,
            "club": p.club,
            "pozitie": p.pozitie,
            "varsta": p.varsta,
            "nationalitate": p.nationalitate,
            "inaltime_cm": p.inaltime_cm,
            "greutate_kg": p.greutate_kg,
            "bmi": round(p.bmi, 1) if p.bmi else None,
            "scor_fitness": p.scor_fitness,
            "ani_experienta_pro": p.ani_experienta_pro,
            "risk_score": risk_score,
            "risk_level": rc["level"],
            "risk_color": rc["color"],
            "stats": {
                "meciuri_jucate": latest_stat.meciuri_jucate if latest_stat else 0,
                "minute_jucate": latest_stat.minute_jucate if latest_stat else 0,
                "distanta_totala_km": round(latest_stat.distanta_totala_km, 1) if latest_stat and latest_stat.distanta_totala_km else 0,
                "sprinturi_totale": latest_stat.sprinturi_totale if latest_stat else 0,
                "indice_incarcare": round(latest_stat.indice_incarcare, 1) if latest_stat and latest_stat.indice_incarcare else 0,
                "goluri": latest_stat.goluri if latest_stat else 0,
                "pase_decisive": latest_stat.pase_decisive if latest_stat else 0,
                "sezon": latest_stat.sezon if latest_stat else "N/A",
            },
            "injury_summary": {
                "total": total_injuries,
                "serious": serious,
                "total_days": total_days,
                "recurrences": recurrences,
                "avg_days": round(total_days / max(total_injuries, 1), 1),
                "top_injuries": top_injuries,
            },
        })

    return {"players": results}


@router.get("/players/{player_id}")
def get_player(player_id: str, db: Session = Depends(get_db)):
    result = get_player_detail(db, player_id)
    if not result:
        raise HTTPException(status_code=404, detail="Jucatorul nu a fost gasit")
    return result


@router.get("/players/{player_id}/shap")
def get_player_shap(player_id: str, db: Session = Depends(get_db)):
    """Get SHAP values for a specific player."""
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Modelul nu este incarcat")

    # Build features for this player
    from app.ml.pipeline import build_feature_matrix
    import numpy as np

    X, y, features, le, full_df = build_feature_matrix(db)
    latest = full_df.sort_values("sezon").groupby("player_id").last().reset_index()
    player_row = latest[latest["player_id"] == player_id]

    if player_row.empty:
        raise HTTPException(status_code=404, detail="Date insuficiente pentru acest jucator")

    player_features = player_row[features].fillna(X.mean()).values[0]
    shap_vals = predictor.get_player_shap(np.array(player_features))

    if shap_vals is None:
        return {"shap_values": None, "message": "SHAP disponibil doar pentru modelele tree-based"}

    return {"shap_values": shap_vals}
