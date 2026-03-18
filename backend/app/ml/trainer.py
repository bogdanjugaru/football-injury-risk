"""
Model Trainer - antreneaza 4 modele ML, evalueaza cu cross-validation,
calculeaza SHAP values, si salveaza totul.
"""
import json
import os
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_score, recall_score,
    f1_score, confusion_matrix, roc_curve,
)

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("[WARN] XGBoost nu este instalat. Se sare peste modelul XGBoost.")

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False
    print("[WARN] SHAP nu este instalat. Se sare peste explainability.")

from sqlalchemy.orm import Session
from app.ml.pipeline import build_feature_matrix, FEATURES, FEATURE_LABELS
from app.models.prediction import ModelResult
from app.config import MODEL_DIR


def _serialize(obj):
    """Convert numpy types to Python native for JSON serialization."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def train_all_models(db: Session) -> dict:
    """
    Train 4 ML models, evaluate with 5-fold CV, compute SHAP, save everything.
    Returns summary dict.
    """
    print("\n" + "=" * 60)
    print("  ANTRENARE MODELE ML - Football Injury Risk Prediction")
    print("=" * 60)

    # Build feature matrix
    print("\n[1/5] Construire matrice de features...")
    X, y, feature_names, label_encoder, full_df = build_feature_matrix(db)

    print(f"  -> {len(X)} samples, {len(feature_names)} features")
    print(f"  -> Distributie target: {int((y == 0).sum())} negativ / {int((y == 1).sum())} pozitiv")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Compute class weight for XGBoost
    n_neg = int((y_train == 0).sum())
    n_pos = int((y_train == 1).sum())
    scale_pos = n_neg / max(n_pos, 1)

    # Define models
    print("\n[2/5] Definire si antrenare modele...")
    models = {
        "logistic_regression": LogisticRegression(
            C=1.0, penalty="l2", class_weight="balanced",
            max_iter=1000, random_state=42, solver="lbfgs",
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=300, max_depth=8, min_samples_leaf=3,
            class_weight="balanced", random_state=42, n_jobs=-1,
        ),
        "mlp": MLPClassifier(
            hidden_layer_sizes=(64, 32), activation="relu",
            max_iter=500, random_state=42, early_stopping=True,
            validation_fraction=0.15, learning_rate="adaptive",
        ),
    }

    if HAS_XGBOOST:
        models["xgboost"] = XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            scale_pos_weight=scale_pos, eval_metric="logloss",
            random_state=42, use_label_encoder=False, verbosity=0,
        )

    # Cross-validation + Training
    print("\n[3/5] Cross-validation (5-fold) si evaluare...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}
    best_auc = -1
    best_model_name = None

    for name, model in models.items():
        print(f"\n  >> {name}")

        # Use scaled data for LR and MLP, original for tree models
        if name in ("logistic_regression", "mlp"):
            X_tr, X_te = X_train_scaled, X_test_scaled
            X_cv = X_train_scaled
        else:
            X_tr, X_te = X_train.values, X_test.values
            X_cv = X_train.values

        # Cross-validation
        cv_scores = cross_val_score(model, X_cv, y_train, cv=skf, scoring="roc_auc")
        print(f"     CV AUC-ROC: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

        # Train on full training set
        model.fit(X_tr, y_train)

        # Evaluate
        y_pred = model.predict(X_te)
        y_proba = model.predict_proba(X_te)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba) if len(set(y_test)) > 1 else 0.5
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        cm = confusion_matrix(y_test, y_pred)
        fpr, tpr, thresholds = roc_curve(y_test, y_proba)

        # Feature importances
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        elif hasattr(model, "coef_"):
            importances = np.abs(model.coef_[0])
            importances = importances / importances.sum()
        else:
            importances = np.zeros(len(feature_names))

        print(f"     Accuracy: {acc:.3f} | AUC: {auc:.3f} | F1: {f1:.3f} | Precision: {prec:.3f} | Recall: {rec:.3f}")

        results[name] = {
            "model": model,
            "accuracy": round(acc * 100, 1),
            "auc_roc": round(auc * 100, 1),
            "precision": round(prec * 100, 1),
            "recall": round(rec * 100, 1),
            "f1": round(f1 * 100, 1),
            "confusion_matrix": cm.tolist(),
            "roc_curve": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
            "feature_importances": {
                FEATURE_LABELS.get(f, f): round(float(importances[i] * 100), 2)
                for i, f in enumerate(feature_names)
            },
            "cv_scores": {"mean": round(cv_scores.mean() * 100, 1), "std": round(cv_scores.std() * 100, 1), "folds": cv_scores.tolist()},
            "hyperparameters": _get_hyperparams(name, model),
        }

        if auc > best_auc:
            best_auc = auc
            best_model_name = name

    print(f"\n  ** Cel mai bun model: {best_model_name} (AUC-ROC: {results[best_model_name]['auc_roc']}%)")

    # SHAP explainability
    print("\n[4/5] Calcul SHAP values...")
    shap_global = {}
    if HAS_SHAP:
        best_model = results[best_model_name]["model"]
        try:
            if best_model_name in ("random_forest", "xgboost"):
                explainer = shap.TreeExplainer(best_model)
                # Use a sample for speed
                sample_size = min(200, len(X_test))
                if best_model_name in ("logistic_regression", "mlp"):
                    X_sample = X_test_scaled[:sample_size]
                else:
                    X_sample = X_test.values[:sample_size]
                shap_values = explainer.shap_values(X_sample)
                if isinstance(shap_values, list):
                    shap_values = shap_values[1]  # class 1
                mean_abs_shap = np.abs(shap_values).mean(axis=0)
                shap_global = {
                    FEATURE_LABELS.get(f, f): round(float(mean_abs_shap[i]), 4)
                    for i, f in enumerate(feature_names)
                }
                print(f"  -> SHAP global calculat ({len(shap_global)} features)")
            else:
                print("  -> SHAP TreeExplainer doar pentru RF/XGBoost")
        except Exception as e:
            print(f"  -> Eroare SHAP: {e}")
    else:
        print("  -> SHAP nu este disponibil")

    # Save models
    print("\n[5/5] Salvare modele...")
    os.makedirs(MODEL_DIR, exist_ok=True)

    for name, data in results.items():
        joblib.dump(data["model"], os.path.join(MODEL_DIR, f"{name}.joblib"))

    joblib.dump(results[best_model_name]["model"], os.path.join(MODEL_DIR, "best_model.joblib"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.joblib"))
    joblib.dump(label_encoder, os.path.join(MODEL_DIR, "label_encoder.joblib"))

    with open(os.path.join(MODEL_DIR, "feature_names.json"), "w") as f:
        json.dump(feature_names, f)

    with open(os.path.join(MODEL_DIR, "feature_labels.json"), "w", encoding="utf-8") as f:
        json.dump(FEATURE_LABELS, f, ensure_ascii=False)

    # Save X stats for normalization
    X_mean = X.mean().to_dict()
    X_std = X.std().to_dict()
    with open(os.path.join(MODEL_DIR, "feature_stats.json"), "w") as f:
        json.dump({"mean": X_mean, "std": X_std}, f)

    # Save best model name
    with open(os.path.join(MODEL_DIR, "best_model_name.txt"), "w") as f:
        f.write(best_model_name)

    # Save risk scores for all players (latest season)
    _save_risk_scores(full_df, results[best_model_name]["model"], scaler, best_model_name, feature_names)

    # Store in database
    print("\n[*] Salvare rezultate in baza de date...")
    # Clear previous results
    db.query(ModelResult).delete()
    db.commit()

    for name, data in results.items():
        mr = ModelResult(
            model_name=name,
            accuracy=data["accuracy"],
            auc_roc=data["auc_roc"],
            precision_score=data["precision"],
            recall_score=data["recall"],
            f1_score=data["f1"],
            confusion_matrix_json=json.dumps(data["confusion_matrix"]),
            roc_curve_json=json.dumps(data["roc_curve"]),
            feature_importances_json=json.dumps(data["feature_importances"], ensure_ascii=False),
            shap_global_json=json.dumps(shap_global, ensure_ascii=False) if name == best_model_name else None,
            hyperparameters_json=json.dumps(data["hyperparameters"]),
            training_samples=len(X_train),
            test_samples=len(X_test),
            cv_scores_json=json.dumps(data["cv_scores"]),
            is_best=(name == best_model_name),
        )
        db.add(mr)
    db.commit()

    print("\n" + "=" * 60)
    print("  ANTRENARE COMPLETA!")
    print("=" * 60)

    return {
        "best_model": best_model_name,
        "results": {k: {kk: vv for kk, vv in v.items() if kk != "model"} for k, v in results.items()},
        "shap_global": shap_global,
    }


def _save_risk_scores(full_df, model, scaler, model_name, feature_names):
    """Compute and save risk scores for all players."""
    latest = full_df.sort_values("sezon").groupby("player_id").last().reset_index()
    X_latest = latest[feature_names].fillna(latest[feature_names].mean())

    if model_name in ("logistic_regression", "mlp"):
        X_pred = scaler.transform(X_latest)
    else:
        X_pred = X_latest.values

    probs = model.predict_proba(X_pred)[:, 1]
    latest["risk_score"] = (probs * 100).round(1)

    risk_data = latest[["player_id", "risk_score"]].to_dict("records")
    with open(os.path.join(MODEL_DIR, "risk_scores.json"), "w") as f:
        json.dump(risk_data, f)
    print(f"  -> Risk scores salvate pentru {len(risk_data)} jucatori")


def _get_hyperparams(name, model):
    """Extract key hyperparameters for display."""
    if name == "logistic_regression":
        return {"C": model.C, "penalty": model.penalty, "solver": model.solver}
    elif name == "random_forest":
        return {"n_estimators": model.n_estimators, "max_depth": model.max_depth, "min_samples_leaf": model.min_samples_leaf}
    elif name == "xgboost":
        return {"n_estimators": model.n_estimators, "max_depth": model.max_depth, "learning_rate": model.learning_rate}
    elif name == "mlp":
        return {"hidden_layer_sizes": list(model.hidden_layer_sizes), "activation": model.activation, "learning_rate": model.learning_rate}
    return {}
