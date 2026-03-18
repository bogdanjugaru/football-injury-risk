"""Dashboard service - business logic for KPIs and chart data."""
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Player, Injury, SeasonStat
from app.ml.predictor import predictor


def get_dashboard_data(db: Session) -> dict:
    total_players = db.query(func.count(Player.player_id)).scalar()
    total_injuries = db.query(func.count(Injury.injury_id)).scalar()
    avg_days = db.query(func.avg(Injury.zile_absenta)).scalar() or 0
    surgery_count = db.query(func.count(Injury.injury_id)).filter(Injury.interventie_chirurgicala == "Da").scalar()
    surgery_rate = round(surgery_count / max(total_injuries, 1) * 100, 1)
    recurrence_count = db.query(func.count(Injury.injury_id)).filter(Injury.recidiva == "Da").scalar()
    recurrence_rate = round(recurrence_count / max(total_injuries, 1) * 100, 1)

    # High risk count
    high_risk = sum(1 for s in predictor.risk_scores.values() if s >= 50)

    # Injuries per season
    by_season = (
        db.query(Injury.sezon, func.count(Injury.injury_id).label("count"))
        .group_by(Injury.sezon)
        .order_by(Injury.sezon)
        .all()
    )

    # Severity distribution
    severity_rows = (
        db.query(Injury.severitate, func.count(Injury.injury_id).label("count"))
        .group_by(Injury.severitate)
        .all()
    )
    severity = {r.severitate: r.count for r in severity_rows}

    # Body part distribution (top 10)
    body_parts_rows = (
        db.query(Injury.parte_corp, func.count(Injury.injury_id).label("count"))
        .group_by(Injury.parte_corp)
        .order_by(func.count(Injury.injury_id).desc())
        .limit(10)
        .all()
    )
    body_parts = {r.parte_corp: r.count for r in body_parts_rows}

    # Top 10 most injured players
    top_inj_rows = (
        db.query(
            Injury.player_id,
            func.count(Injury.injury_id).label("count"),
        )
        .group_by(Injury.player_id)
        .order_by(func.count(Injury.injury_id).desc())
        .limit(10)
        .all()
    )
    top_injured = []
    for r in top_inj_rows:
        p = db.query(Player).filter(Player.player_id == r.player_id).first()
        if p:
            top_injured.append({
                "player_id": r.player_id,
                "count": r.count,
                "nume": p.nume,
                "club": p.club,
                "pozitie": p.pozitie,
            })

    # Monthly trend
    injuries_df = pd.read_sql(
        db.query(Injury.data_accidentare).statement, db.bind
    )
    injuries_df["month"] = pd.to_datetime(injuries_df["data_accidentare"], errors="coerce").dt.month
    monthly = injuries_df.dropna(subset=["month"]).groupby("month").size().reset_index(name="count")

    # Best model info
    from app.models.prediction import ModelResult
    best = db.query(ModelResult).filter(ModelResult.is_best == True).first()
    model_accuracy = best.accuracy if best else 0
    model_auc = best.auc_roc if best else 0

    return {
        "kpis": {
            "total_players": total_players,
            "total_injuries": total_injuries,
            "avg_days_absent": round(float(avg_days), 1),
            "surgery_rate": surgery_rate,
            "recurrence_rate": recurrence_rate,
            "high_risk_players": high_risk,
        },
        "by_season": [{"sezon": r.sezon, "count": r.count} for r in by_season],
        "severity_distribution": severity,
        "body_part_distribution": body_parts,
        "top_injured": top_injured,
        "monthly_trend": monthly.to_dict("records"),
        "model_accuracy": model_accuracy,
        "model_auc": model_auc,
    }
