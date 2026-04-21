import json
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.prediction import PredictionInput
from app.ml.predictor import predictor
from app.ml.recovery_predictor import recovery_predictor
from app.models import Injury
from app.models.prediction import PredictionLog


class RecoveryInput(BaseModel):
    varsta: float = 25.0
    bmi: float = 23.0
    scor_fitness: float = 75.0
    pozitie: str = "ST"
    parte_corp: str = "Genunchi"
    tip_accidentare: Optional[str] = None
    severitate: str = "Moderată (8–28 zile)"
    mecanism: str = "non-contact"
    context: str = "antrenament"
    recidiva: str = "Nu"
    total_prev_injuries: float = 0
    avg_days_absent: Optional[float] = None

router = APIRouter(prefix="/api", tags=["Predictions"])


@router.post("/prediction/risk")
def predict_risk(data: PredictionInput, db: Session = Depends(get_db)):
    if not predictor.is_loaded:
        raise HTTPException(status_code=503, detail="Modelul nu este incarcat")

    try:
        input_dict = data.model_dump()
        result = predictor.predict(input_dict)

        # Save to prediction history
        log = PredictionLog(
            input_json=json.dumps(input_dict),
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


@router.get("/predictions/history")
def get_prediction_history(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
):
    total = db.query(PredictionLog).count()
    logs = (
        db.query(PredictionLog)
        .order_by(PredictionLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "predictions": [
            {
                "id": log.id,
                "input": json.loads(log.input_json) if log.input_json else {},
                "risk_score": log.risk_score,
                "risk_level": log.risk_level,
                "model_used": log.model_used,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/prediction/recovery")
def predict_recovery(data: RecoveryInput, db: Session = Depends(get_db)):
    """Predict expected recovery time for an injury."""
    if not recovery_predictor.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Modelul de recuperare nu este incarcat. Antreneaza-l mai intai via POST /api/prediction/recovery/train",
        )

    try:
        input_dict = data.model_dump()
        result = recovery_predictor.predict_recovery(input_dict)

        # Compute similar_injuries_avg from DB
        similar = (
            db.query(Injury)
            .filter(
                Injury.parte_corp == data.parte_corp,
                Injury.severitate == data.severitate,
                Injury.zile_absenta.isnot(None),
                Injury.zile_absenta > 0,
            )
            .all()
        )
        if similar:
            similar_avg = round(
                sum(inj.zile_absenta for inj in similar) / len(similar), 1
            )
        else:
            similar_avg = None

        result["similar_injuries_avg"] = similar_avg
        return result

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)})


@router.post("/prediction/recovery/train")
def train_recovery_model(db: Session = Depends(get_db)):
    """Train the recovery time prediction model from current DB data."""
    try:
        result = recovery_predictor.train(db)
        return result
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e)})
