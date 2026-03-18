from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime
from datetime import datetime, timezone
from app.database import Base


class ModelResult(Base):
    __tablename__ = "model_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String, index=True)
    accuracy = Column(Float)
    auc_roc = Column(Float)
    precision_score = Column(Float)
    recall_score = Column(Float)
    f1_score = Column(Float)
    confusion_matrix_json = Column(Text)
    roc_curve_json = Column(Text)
    feature_importances_json = Column(Text)
    shap_global_json = Column(Text, nullable=True)
    hyperparameters_json = Column(Text)
    training_samples = Column(Integer)
    test_samples = Column(Integer)
    cv_scores_json = Column(Text, nullable=True)
    is_best = Column(Boolean, default=False)
    trained_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PredictionLog(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    input_json = Column(Text)
    risk_score = Column(Float)
    risk_level = Column(String)
    model_used = Column(String)
    shap_values_json = Column(Text, nullable=True)
    recommendations_json = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
