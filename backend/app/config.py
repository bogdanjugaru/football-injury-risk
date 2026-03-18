import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'football_risk.db')}"
MODEL_DIR = os.path.join(BASE_DIR, "app", "ml", "saved_models")
FRONTEND_DIST = os.path.join(BASE_DIR, "..", "frontend", "dist")
CORS_ORIGINS = ["*"]
