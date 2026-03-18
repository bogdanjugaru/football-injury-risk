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
