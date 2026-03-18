"""
Risk Predictor - incarca modelul antrenat si face predictii.
"""
import json
import os
import numpy as np
import joblib

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

from app.config import MODEL_DIR
from app.ml.pipeline import FEATURES, FEATURE_LABELS, POSITION_GROUPS


class RiskPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_names = []
        self.feature_labels = {}
        self.feature_stats = {"mean": {}, "std": {}}
        self.risk_scores = {}
        self.best_model_name = ""
        self.all_models = {}
        self._loaded = False

    def load(self):
        """Load trained models from disk."""
        if not os.path.exists(os.path.join(MODEL_DIR, "best_model.joblib")):
            print("[WARN] Nu exista modele antrenate. Ruleaza train_models.py mai intai.")
            return False

        self.model = joblib.load(os.path.join(MODEL_DIR, "best_model.joblib"))
        self.scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.joblib"))
        self.label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.joblib"))

        with open(os.path.join(MODEL_DIR, "feature_names.json")) as f:
            self.feature_names = json.load(f)

        with open(os.path.join(MODEL_DIR, "feature_labels.json"), encoding="utf-8") as f:
            self.feature_labels = json.load(f)

        with open(os.path.join(MODEL_DIR, "feature_stats.json")) as f:
            self.feature_stats = json.load(f)

        with open(os.path.join(MODEL_DIR, "best_model_name.txt")) as f:
            self.best_model_name = f.read().strip()

        # Load risk scores
        scores_path = os.path.join(MODEL_DIR, "risk_scores.json")
        if os.path.exists(scores_path):
            with open(scores_path) as f:
                scores_list = json.load(f)
                self.risk_scores = {s["player_id"]: s["risk_score"] for s in scores_list}

        # Load all models
        for model_name in ["logistic_regression", "random_forest", "xgboost", "mlp"]:
            path = os.path.join(MODEL_DIR, f"{model_name}.joblib")
            if os.path.exists(path):
                self.all_models[model_name] = joblib.load(path)

        self._loaded = True
        print(f"[OK] Modele incarcate. Best: {self.best_model_name}")
        return True

    @property
    def is_loaded(self):
        return self._loaded

    @staticmethod
    def calibrate_score(raw_score: float) -> float:
        """Calibrate raw probability score to realistic range [5, 85]."""
        import math
        prob = raw_score / 100.0
        clamped = max(0.01, min(0.99, prob))
        log_odds = math.log(clamped / (1 - clamped))
        dampened = 1 / (1 + math.exp(-log_odds * 0.5))
        return round(5 + dampened * 80, 1)

    def get_risk_score(self, player_id: str) -> float:
        raw = self.risk_scores.get(player_id, 50.0)
        return self.calibrate_score(raw)

    def predict(self, input_data: dict) -> dict:
        """Make a risk prediction for custom input."""
        # Build feature vector
        feat_values = self._build_features(input_data)

        # Scale if needed
        if self.best_model_name in ("logistic_regression", "mlp"):
            feat_scaled = self.scaler.transform(feat_values)
        else:
            feat_scaled = feat_values

        # Predict
        risk_prob = self.model.predict_proba(feat_scaled)[0][1]
        score = self.calibrate_score(risk_prob * 100)
        rc = risk_category(score)

        # Feature contributions
        contributions = self._feature_contributions(feat_values[0])

        # SHAP / coefficient-based feature contributions
        shap_values_list = None
        try:
            if HAS_SHAP and self.best_model_name in ("random_forest", "xgboost"):
                explainer = shap.TreeExplainer(self.model)
                sv = explainer.shap_values(feat_scaled)
                if isinstance(sv, list):
                    sv = sv[1]
                shap_values_list = [
                    {
                        "feature": self.feature_labels.get(f, f),
                        "shap_value": round(float(sv[0][i]), 4),
                        "feature_value": round(float(feat_values[0][i]), 2),
                    }
                    for i, f in enumerate(self.feature_names)
                ]
                shap_values_list.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
            elif self.best_model_name == "logistic_regression" and hasattr(self.model, "coef_"):
                # Use coefficient * scaled_feature_value as pseudo-SHAP
                coefs = self.model.coef_[0]
                scaled_vals = feat_scaled[0] if self.best_model_name in ("logistic_regression", "mlp") else feat_values[0]
                contributions_lr = coefs * scaled_vals
                shap_values_list = [
                    {
                        "feature": self.feature_labels.get(f, f),
                        "shap_value": round(float(contributions_lr[i]), 4),
                        "feature_value": round(float(feat_values[0][i]), 2),
                    }
                    for i, f in enumerate(self.feature_names)
                ]
                shap_values_list.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        except Exception:
            pass

        # Recommendations
        recs = self._recommendations(input_data)

        return {
            "risk_score": score,
            "risk_level": rc["level"],
            "risk_color": rc["color"],
            "risk_badge": rc["badge"],
            "model_used": self.best_model_name,
            "model_confidence": round(float(max(self.model.predict_proba(feat_scaled)[0]) * 100), 1),
            "top_features": contributions[:8],
            "shap_values": shap_values_list,
            "recommendations": recs,
        }

    def get_player_shap(self, player_features: np.ndarray) -> list[dict] | None:
        """Compute SHAP / coefficient-based contributions for a player."""
        try:
            feats = player_features.reshape(1, -1)
            if HAS_SHAP and self.best_model_name in ("random_forest", "xgboost"):
                explainer = shap.TreeExplainer(self.model)
                sv = explainer.shap_values(feats)
                if isinstance(sv, list):
                    sv = sv[1]
                return [
                    {
                        "feature": self.feature_labels.get(f, f),
                        "shap_value": round(float(sv[0][i]), 4),
                        "feature_value": round(float(player_features[i]), 2),
                    }
                    for i, f in enumerate(self.feature_names)
                ]
            elif self.best_model_name == "logistic_regression" and hasattr(self.model, "coef_"):
                coefs = self.model.coef_[0]
                scaled = self.scaler.transform(feats)
                contribs = coefs * scaled[0]
                return [
                    {
                        "feature": self.feature_labels.get(f, f),
                        "shap_value": round(float(contribs[i]), 4),
                        "feature_value": round(float(player_features[i]), 2),
                    }
                    for i, f in enumerate(self.feature_names)
                ]
            return None
        except Exception:
            return None

    def _build_features(self, data: dict) -> np.ndarray:
        """Build feature array from input dict."""
        # Position encoding
        pozitie = data.get("pozitie", "ST")
        try:
            pos_encoded = int(self.label_encoder.transform([pozitie])[0])
        except Exception:
            pos_encoded = 0

        varsta = data.get("varsta", 25)
        bmi = data.get("bmi", 23)
        meciuri = data.get("meciuri_jucate", 25)
        minute = data.get("minute_jucate", 2000)
        sprints = data.get("sprinturi_totale", 1500)
        dist = data.get("distanta_totala_km", 300)
        incarcare = data.get("indice_incarcare", 60)
        prev_inj = data.get("total_prev_injuries", 1)

        ani_exp = data.get("ani_experienta_pro") or 5

        # Handle optional fields - use sensible defaults when None
        injury_freq = data.get("injury_frequency")
        if injury_freq is None:
            injury_freq = prev_inj / max(ani_exp, 1)

        avg_days = data.get("avg_days_absent")
        if avg_days is None:
            avg_days = 0.0

        max_sev = data.get("max_severity_prev")
        if max_sev is None:
            max_sev = 0.0
        # Convert days to severity ordinal (0-4) to match training pipeline
        if max_sev > 4:
            if max_sev > 90:
                max_sev = 4
            elif max_sev > 28:
                max_sev = 3
            elif max_sev > 7:
                max_sev = 2
            elif max_sev >= 1:
                max_sev = 1

        recurrence = data.get("recurrence_rate")
        if recurrence is None:
            recurrence = 0.0
        # Convert fraction (0-1) to percentage (0-100) to match training pipeline
        if recurrence > 0 and recurrence <= 1:
            recurrence = recurrence * 100

        workload_ch = data.get("workload_change")
        if workload_ch is None:
            workload_ch = 0.0

        feat = {
            "varsta": varsta,
            "bmi": bmi,
            "ani_experienta_pro": ani_exp,
            "scor_fitness": data.get("scor_fitness") or 75,
            "pozitie_enc": pos_encoded,
            "inaltime_cm": data.get("inaltime_cm") or 180,
            "greutate_kg": data.get("greutate_kg") or 75,
            "minute_jucate": minute,
            "meciuri_jucate": meciuri,
            "distanta_totala_km": dist,
            "sprinturi_totale": sprints,
            "indice_incarcare": incarcare,
            "cartonase_galbene": data.get("cartonase_galbene") or 3,
            "total_prev_injuries": prev_inj,
            "injury_frequency": injury_freq,
            "avg_days_absent": avg_days,
            "max_severity_prev": max_sev,
            "recurrence_rate": recurrence,
            "minutes_per_match": minute / max(meciuri, 1),
            "sprint_intensity": sprints / max(dist, 1),
            "workload_change": workload_ch,
            "age_squared": varsta ** 2,
            "bmi_category": 0 if bmi < 18.5 else (1 if bmi < 25 else 2),
            "position_risk_group": POSITION_GROUPS.get(pozitie, 2),
        }

        values = [feat.get(f, 0) for f in self.feature_names]
        return np.array([values], dtype=float)

    def _feature_contributions(self, feat_values: np.ndarray) -> list[dict]:
        """Calculate feature contributions using importance + z-scores."""
        if hasattr(self.model, "feature_importances_"):
            importances = self.model.feature_importances_
        elif hasattr(self.model, "coef_"):
            importances = np.abs(self.model.coef_[0])
            importances = importances / importances.sum()
        else:
            importances = np.ones(len(self.feature_names)) / len(self.feature_names)

        contributions = []
        for i, f in enumerate(self.feature_names):
            val = float(feat_values[i])
            mean = float(self.feature_stats["mean"].get(f, 0))
            std = float(self.feature_stats["std"].get(f, 1))
            if std == 0:
                std = 1
            contributions.append({
                "feature": self.feature_labels.get(f, f),
                "key": f,
                "importance": round(float(importances[i] * 100), 1),
                "value": round(val, 2),
                "mean": round(mean, 2),
                "z_score": round((val - mean) / std, 2),
                "above_mean": bool(val > mean),
            })
        contributions.sort(key=lambda x: x["importance"], reverse=True)
        return contributions

    def _recommendations(self, data: dict) -> list[dict]:
        """Generate personalized recommendations."""
        recs = []
        mean = self.feature_stats.get("mean", {})

        incarcare_q75 = float(mean.get("indice_incarcare", 60)) * 1.2
        minute_q80 = float(mean.get("minute_jucate", 2000)) * 1.15

        if data.get("indice_incarcare", 60) > incarcare_q75:
            recs.append({"icon": "warning", "text": "Indice de incarcare ridicat - recomandam reducerea volumului de antrenament si odihna activa"})
        if data.get("total_prev_injuries", 0) >= 3:
            recs.append({"icon": "refresh", "text": "Istoric semnificativ de accidentari - monitorizare zilnica, program de preventie individualizat"})
        if data.get("varsta", 25) >= 30:
            recs.append({"icon": "calendar", "text": "Jucatorul se afla la maturitate sportiva - atentie crescuta la recuperare si somn"})
        if data.get("scor_fitness", 75) < 60:
            recs.append({"icon": "activity", "text": "Scor fitness sub medie - program de conditionare fizica si nutritie sportiva recomandat"})
        if data.get("minute_jucate", 2000) > minute_q80:
            recs.append({"icon": "clock", "text": "Volum de joc ridicat - monitorizare GPS si rotatie obligatorie in urmatoarele meciuri"})
        if data.get("bmi", 23) > 27:
            recs.append({"icon": "scale", "text": "IMC ridicat - evaluare compozitie corporala si ajustare program nutritional"})
        if not recs:
            recs.append({"icon": "check", "text": "Profilul jucatorului nu evidentiaza factori de risc majori in acest moment"})

        return recs


def risk_category(score: float) -> dict:
    if score < 25:
        return {"level": "Scazut", "color": "success", "badge": "#10b981"}
    elif score < 50:
        return {"level": "Moderat", "color": "warning", "badge": "#f59e0b"}
    elif score < 75:
        return {"level": "Ridicat", "color": "danger", "badge": "#ef4444"}
    else:
        return {"level": "Foarte Ridicat", "color": "critical", "badge": "#7c3aed"}


# Singleton
predictor = RiskPredictor()
