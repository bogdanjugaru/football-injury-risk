"""
Recovery Time Predictor - predicts expected recovery days based on
player features, injury characteristics, and historical injury data.
Uses a RandomForestRegressor trained on the accidentari table.
"""
import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sqlalchemy.orm import Session

from app.config import MODEL_DIR
from app.models import Player, Injury


# Categorical columns that need label encoding
CATEGORICAL_COLS = [
    "parte_corp",
    "tip_accidentare",
    "severitate",
    "mecanism",
    "context",
    "recidiva",
    "pozitie",
]

FEATURE_COLS = [
    "varsta",
    "bmi",
    "scor_fitness",
    "pozitie",
    "parte_corp",
    "tip_accidentare",
    "severitate",
    "mecanism",
    "context",
    "recidiva",
    "total_prev_injuries",
    "avg_days_absent",
]

SEVERITY_CATEGORIES = {
    (1, 7): "Ușoară (1–7 zile)",
    (8, 28): "Moderată (8–28 zile)",
    (29, 90): "Severă (29–90 zile)",
    (91, 9999): "Foarte severă (>90 zile)",
}


def _days_to_severity(days: float) -> str:
    for (lo, hi), label in SEVERITY_CATEGORIES.items():
        if lo <= days <= hi:
            return label
    return "Moderată (8–28 zile)"


class RecoveryPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.encoders: dict[str, LabelEncoder] = {}
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def _model_path(self, filename: str) -> str:
        return os.path.join(MODEL_DIR, filename)

    def train(self, db: Session) -> dict:
        """Train the recovery time model from DB data."""
        # Load all injuries joined with player data
        injuries = db.query(Injury).all()
        players_map = {}
        for p in db.query(Player).all():
            players_map[p.player_id] = p

        rows = []
        # Group injuries by player to compute historical stats
        player_injuries: dict[str, list] = {}
        for inj in injuries:
            pid = inj.player_id
            if pid not in player_injuries:
                player_injuries[pid] = []
            player_injuries[pid].append(inj)

        # Sort each player's injuries chronologically
        for pid in player_injuries:
            player_injuries[pid].sort(key=lambda x: x.data_accidentare or "")

        for inj in injuries:
            if inj.zile_absenta is None or inj.zile_absenta <= 0:
                continue

            player = players_map.get(inj.player_id)
            if not player:
                continue

            # Compute historical stats: injuries before this one
            prev = [
                i
                for i in player_injuries[inj.player_id]
                if (i.data_accidentare or "") < (inj.data_accidentare or "")
                and i.zile_absenta is not None
                and i.zile_absenta > 0
            ]
            total_prev = len(prev)
            avg_days = (
                sum(i.zile_absenta for i in prev) / total_prev if total_prev > 0 else 0
            )

            rows.append(
                {
                    "varsta": player.varsta or 25,
                    "bmi": player.bmi or 23.0,
                    "scor_fitness": player.scor_fitness or 75,
                    "pozitie": player.pozitie or "ST",
                    "parte_corp": inj.parte_corp or "Necunoscut",
                    "tip_accidentare": inj.tip_accidentare or "Necunoscut",
                    "severitate": inj.severitate or "Necunoscut",
                    "mecanism": inj.mecanism or "necunoscut",
                    "context": inj.context or "necunoscut",
                    "recidiva": inj.recidiva or "Nu",
                    "total_prev_injuries": total_prev,
                    "avg_days_absent": round(avg_days, 1),
                    "zile_absenta": inj.zile_absenta,
                }
            )

        if len(rows) < 10:
            return {"success": False, "error": "Prea putine date pentru antrenare"}

        import pandas as pd

        df = pd.DataFrame(rows)
        y = df["zile_absenta"].values
        df = df.drop(columns=["zile_absenta"])

        # Fit label encoders
        self.encoders = {}
        for col in CATEGORICAL_COLS:
            if col in df.columns:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self.encoders[col] = le

        X = df[FEATURE_COLS].values.astype(float)

        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )

        # Train model
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)

        # Evaluate
        from sklearn.metrics import mean_absolute_error, r2_score

        y_pred_train = self.model.predict(X_train)
        y_pred_test = self.model.predict(X_test)

        metrics = {
            "train_mae": round(float(mean_absolute_error(y_train, y_pred_train)), 2),
            "test_mae": round(float(mean_absolute_error(y_test, y_pred_test)), 2),
            "train_r2": round(float(r2_score(y_train, y_pred_train)), 4),
            "test_r2": round(float(r2_score(y_test, y_pred_test)), 4),
            "samples_total": len(rows),
            "samples_train": len(X_train),
            "samples_test": len(X_test),
        }

        # Save model artefacts
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(self.model, self._model_path("recovery_model.pkl"))
        joblib.dump(self.scaler, self._model_path("recovery_scaler.pkl"))
        joblib.dump(self.encoders, self._model_path("recovery_encoders.pkl"))

        self._loaded = True
        return {"success": True, "metrics": metrics}

    def load(self) -> bool:
        """Load saved model from disk."""
        try:
            self.model = joblib.load(self._model_path("recovery_model.pkl"))
            self.scaler = joblib.load(self._model_path("recovery_scaler.pkl"))
            self.encoders = joblib.load(self._model_path("recovery_encoders.pkl"))
            self._loaded = True
            return True
        except FileNotFoundError:
            self._loaded = False
            return False

    def predict_recovery(self, data: dict) -> dict:
        """
        Predict recovery time for given input.

        data should contain: varsta, bmi, scor_fitness, pozitie,
        parte_corp, severitate, mecanism, context, recidiva,
        total_prev_injuries, (optional) avg_days_absent, tip_accidentare
        """
        if not self._loaded:
            raise RuntimeError("Modelul de recuperare nu este incarcat")

        # Build feature vector in the same order as FEATURE_COLS
        row = {
            "varsta": data.get("varsta", 25),
            "bmi": data.get("bmi", 23.0),
            "scor_fitness": data.get("scor_fitness", 75),
            "pozitie": data.get("pozitie", "ST"),
            "parte_corp": data.get("parte_corp", "Necunoscut"),
            "tip_accidentare": data.get("tip_accidentare", "Necunoscut"),
            "severitate": data.get("severitate", "Necunoscut"),
            "mecanism": data.get("mecanism", "necunoscut"),
            "context": data.get("context", "necunoscut"),
            "recidiva": data.get("recidiva", "Nu"),
            "total_prev_injuries": data.get("total_prev_injuries", 0),
            "avg_days_absent": data.get("avg_days_absent", 0),
        }

        # Encode categoricals
        for col in CATEGORICAL_COLS:
            if col in self.encoders and col in row:
                le = self.encoders[col]
                val = str(row[col])
                if val in le.classes_:
                    row[col] = le.transform([val])[0]
                else:
                    # Unknown category: use most frequent class index
                    row[col] = 0

        features = np.array(
            [[row[col] for col in FEATURE_COLS]], dtype=float
        )
        features_scaled = self.scaler.transform(features)

        # Predict with all trees for confidence interval
        predictions_per_tree = np.array(
            [tree.predict(features_scaled)[0] for tree in self.model.estimators_]
        )
        predicted_days = float(np.mean(predictions_per_tree))
        std_dev = float(np.std(predictions_per_tree))

        confidence_low = max(1, round(predicted_days - 1.96 * std_dev, 1))
        confidence_high = round(predicted_days + 1.96 * std_dev, 1)

        return {
            "predicted_days": round(predicted_days, 1),
            "confidence_interval": {
                "low": confidence_low,
                "high": confidence_high,
            },
            "severity_category": _days_to_severity(predicted_days),
        }


# Singleton instance
recovery_predictor = RecoveryPredictor()
