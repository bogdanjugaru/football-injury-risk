"""
FootballRisk - Backend API
Analiza si predictia riscului de accidentari la jucatorii de fotbal
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, FRONTEND_DIST
from app.database import engine, Base
from app.models import Player, Injury, SeasonStat, Match, ModelResult, PredictionLog
from app.ml.predictor import predictor
from app.ml.recovery_predictor import recovery_predictor
from app.routers import dashboard, players, predictions, statistics, model_info, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and load models
    Base.metadata.create_all(bind=engine)
    predictor.load()
    recovery_predictor.load()
    yield
    # Shutdown


app = FastAPI(
    title="Football Injury Risk API",
    description="API pentru analiza si predictia riscului de accidentari la fotbalisti",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router)
app.include_router(players.router)
app.include_router(predictions.router)
app.include_router(statistics.router)
app.include_router(model_info.router)
app.include_router(export.router)

# Serve React frontend (production build)
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
