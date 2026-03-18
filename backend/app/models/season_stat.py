from sqlalchemy import Column, String, Integer, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class SeasonStat(Base):
    __tablename__ = "statistici_sezon"

    stat_id = Column(String, primary_key=True)
    player_id = Column(String, ForeignKey("jucatori.player_id"), nullable=False)
    sezon = Column(String, index=True)
    meciuri_jucate = Column(Integer)
    meciuri_titular = Column(Integer)
    minute_jucate = Column(Integer)
    goluri = Column(Integer)
    pase_decisive = Column(Integer)
    suturi = Column(Integer)
    precizie_pase_pct = Column(Float)
    tackle_uri = Column(Integer)
    dueluri_castigate = Column(Integer)
    distanta_totala_km = Column(Float)
    sprinturi_totale = Column(Integer)
    cartonase_galbene = Column(Integer)
    cartonase_rosii = Column(Integer)
    indice_incarcare = Column(Float)

    player = relationship("Player", back_populates="season_stats")

    __table_args__ = (
        Index("idx_stat_player_season", "player_id", "sezon"),
    )
