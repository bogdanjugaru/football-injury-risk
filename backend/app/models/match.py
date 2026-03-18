from sqlalchemy import Column, String, Integer, Float
from app.database import Base


class Match(Base):
    __tablename__ = "meciuri"

    match_id = Column(String, primary_key=True)
    sezon = Column(String, index=True)
    data_meci = Column(String)
    competitie = Column(String)
    echipa_acasa = Column(String)
    echipa_deplasare = Column(String)
    goluri_acasa = Column(Integer)
    goluri_deplasare = Column(Integer)
    rezultat = Column(String)
    suprafata_teren = Column(String)
    conditii_meteo = Column(String)
    temperatura_c = Column(Float, nullable=True)
    spectatori = Column(Integer, nullable=True)
