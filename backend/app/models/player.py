from sqlalchemy import Column, String, Integer, Float, Index
from sqlalchemy.orm import relationship
from app.database import Base


class Player(Base):
    __tablename__ = "jucatori"

    player_id = Column(String, primary_key=True)
    nume = Column(String, nullable=False, index=True)
    data_nastere = Column(String)
    varsta = Column(Integer)
    nationalitate = Column(String, index=True)
    club = Column(String, index=True)
    pozitie = Column(String, index=True)
    picior_dominant = Column(String)
    inaltime_cm = Column(Float)
    greutate_kg = Column(Float)
    bmi = Column(Float)
    ani_experienta_pro = Column(Integer)
    scor_fitness = Column(Float)
    valoare_piata_eur = Column(Float, nullable=True)

    injuries = relationship("Injury", back_populates="player", lazy="dynamic")
    season_stats = relationship("SeasonStat", back_populates="player", lazy="dynamic")
