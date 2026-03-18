from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.statistics_service import get_statistics_data

router = APIRouter(prefix="/api", tags=["Statistics"])


@router.get("/statistics")
def get_statistics(db: Session = Depends(get_db)):
    return get_statistics_data(db)
