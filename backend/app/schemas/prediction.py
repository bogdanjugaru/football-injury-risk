from pydantic import BaseModel


class PredictionInput(BaseModel):
    varsta: float = 25.0
    bmi: float = 23.0
    ani_experienta_pro: float = 5.0
    scor_fitness: float = 75.0
    pozitie: str = "ST"
    inaltime_cm: float = 180.0
    greutate_kg: float = 75.0
    minute_jucate: float = 2000.0
    meciuri_jucate: float = 25.0
    distanta_totala_km: float = 300.0
    sprinturi_totale: float = 1500.0
    indice_incarcare: float = 60.0
    cartonase_galbene: float = 3.0
    total_prev_injuries: float = 1.0
    # New expanded features (optional)
    injury_frequency: float | None = None
    avg_days_absent: float | None = None
    max_severity_prev: float | None = None
    recurrence_rate: float | None = None
    workload_change: float | None = None
