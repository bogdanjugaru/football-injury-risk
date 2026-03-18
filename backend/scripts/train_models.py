"""
Script de antrenare - ruleaza: cd backend && python -m scripts.train_models
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.ml.trainer import train_all_models


def main():
    db = SessionLocal()
    try:
        results = train_all_models(db)
        print(f"\nBest model: {results['best_model']}")
        for name, data in results["results"].items():
            print(f"  {name}: Accuracy={data['accuracy']}% AUC={data['auc_roc']}% F1={data['f1']}%")
    finally:
        db.close()


if __name__ == "__main__":
    main()
