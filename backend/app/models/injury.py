from sqlalchemy import Column, String, Integer, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Injury(Base):
    __tablename__ = "accidentari"

    injury_id = Column(String, primary_key=True)
    player_id = Column(String, ForeignKey("jucatori.player_id"), nullable=False)
    sezon = Column(String)
    data_accidentare = Column(String)
    data_revenire = Column(String)
    tip_accidentare = Column(String, index=True)
    parte_corp = Column(String)
    severitate = Column(String, index=True)
    zile_absenta = Column(Integer)
    mecanism = Column(String)
    context = Column(String)
    minut_accidentare = Column(Integer, nullable=True)
    suprafata_teren = Column(String)
    conditii_meteo = Column(String)
    temperatura_c = Column(Float, nullable=True)
    recidiva = Column(String)
    interventie_chirurgicala = Column(String)

    player = relationship("Player", back_populates="injuries")

    __table_args__ = (
        Index("idx_injury_player_season", "player_id", "sezon"),
    )
