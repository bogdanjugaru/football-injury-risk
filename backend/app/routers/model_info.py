import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.prediction import ModelResult
from app.ml.predictor import predictor

router = APIRouter(prefix="/api", tags=["Model"])


@router.get("/model/info")
def model_info(db: Session = Depends(get_db)):
    """Get info about the best model."""
    best = db.query(ModelResult).filter(ModelResult.is_best == True).first()
    if not best:
        return {"error": "Nu exista modele antrenate"}

    return {
        "accuracy": best.accuracy,
        "auc_roc": best.auc_roc,
        "precision": best.precision_score,
        "recall": best.recall_score,
        "f1": best.f1_score,
        "n_features": len(predictor.feature_names) if predictor.is_loaded else 0,
        "training_samples": best.training_samples,
        "test_samples": best.test_samples,
        "feature_importances": json.loads(best.feature_importances_json) if best.feature_importances_json else {},
        "positions": predictor.label_encoder.classes_.tolist() if predictor.is_loaded and predictor.label_encoder else [],
        "algorithm": best.model_name,
        "hyperparameters": json.loads(best.hyperparameters_json) if best.hyperparameters_json else {},
        "target_distribution": _get_target_dist(db),
    }


@router.get("/model/comparison")
def model_comparison(db: Session = Depends(get_db)):
    """Compare all 4 models side by side."""
    models = db.query(ModelResult).order_by(ModelResult.auc_roc.desc()).all()
    if not models:
        return {"models": []}

    return {
        "models": [
            {
                "name": m.model_name,
                "accuracy": m.accuracy,
                "auc_roc": m.auc_roc,
                "precision": m.precision_score,
                "recall": m.recall_score,
                "f1": m.f1_score,
                "is_best": m.is_best,
                "hyperparameters": json.loads(m.hyperparameters_json) if m.hyperparameters_json else {},
                "feature_importances": json.loads(m.feature_importances_json) if m.feature_importances_json else {},
                "cv_scores": json.loads(m.cv_scores_json) if m.cv_scores_json else {},
                "training_samples": m.training_samples,
                "test_samples": m.test_samples,
            }
            for m in models
        ]
    }


@router.get("/model/roc-curves")
def roc_curves(db: Session = Depends(get_db)):
    """Get ROC curve data points for all models."""
    models = db.query(ModelResult).all()
    return {
        m.model_name: json.loads(m.roc_curve_json) if m.roc_curve_json else {}
        for m in models
    }


@router.get("/model/confusion")
def confusion_matrices(db: Session = Depends(get_db)):
    """Get confusion matrices for all models."""
    models = db.query(ModelResult).all()
    return {
        m.model_name: json.loads(m.confusion_matrix_json) if m.confusion_matrix_json else []
        for m in models
    }


@router.get("/model/shap/global")
def global_shap(db: Session = Depends(get_db)):
    """Get global SHAP feature importance for the best model."""
    best = db.query(ModelResult).filter(ModelResult.is_best == True).first()
    if not best or not best.shap_global_json:
        return {"shap_values": None, "message": "SHAP values nu sunt disponibile"}
    return {"shap_values": json.loads(best.shap_global_json)}


@router.post("/model/retrain")
def retrain_model(db: Session = Depends(get_db)):
    """Retrain all models."""
    from app.ml.trainer import train_all_models
    results = train_all_models(db)
    # Reload predictor
    predictor.load()
    return {"status": "ok", "best_model": results["best_model"]}


def _get_target_dist(db: Session) -> dict:
    """Get target variable distribution from latest training."""
    from app.ml.pipeline import build_feature_matrix
    try:
        X, y, *_ = build_feature_matrix(db)
        return {
            "class_0": int((y == 0).sum()),
            "class_1": int((y == 1).sum()),
        }
    except Exception:
        return {"class_0": 0, "class_1": 0}
