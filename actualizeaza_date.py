"""
Actualizare date la zi — 25 Aprilie 2026
=========================================
1. Recalculează vârsta fiecărui jucător din data_nastere
2. Calculează scor_fitness real din statistici + accidentări
3. Actualizează ani_experienta_pro
4. Salvează jucatori_actualizat.csv și suprascrie jucatori.csv
5. Re-seeduiește baza de date
6. Reantrenează modelele ML
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np
import subprocess
import os
from datetime import date, datetime

TODAY = date(2026, 4, 25)
BASE  = r"C:\Users\BogdanJ\Desktop\Licenta"

print("=" * 60)
print("  ACTUALIZARE DATE — 25 Aprilie 2026")
print("=" * 60)

# ── Încarcă datele ────────────────────────────────────────────
df_j  = pd.read_csv(os.path.join(BASE, "jucatori.csv"), encoding="utf-8-sig")
df_s  = pd.read_csv(os.path.join(BASE, "statistici_sezon.csv"), encoding="utf-8-sig")
df_a  = pd.read_csv(os.path.join(BASE, "accidentari.csv"), encoding="utf-8-sig")

print(f"\n  Jucători: {len(df_j)}")
print(f"  Statistici sezoane: {len(df_s)}")
print(f"  Accidentări: {len(df_a)}")

# ── 1. Actualizează vârsta ────────────────────────────────────
print("\n[1] Recalculez vârstele din data_nastere...")

def calc_varsta(data_str):
    try:
        dn = datetime.strptime(str(data_str).strip(), "%Y-%m-%d").date()
        age = TODAY.year - dn.year - ((TODAY.month, TODAY.day) < (dn.month, dn.day))
        return age
    except:
        return None

df_j["varsta"] = df_j["data_nastere"].apply(calc_varsta)

# Actualizează și ani_experienta_pro (debutează de obicei la 17-18 ani)
df_j["ani_experienta_pro"] = (df_j["varsta"] - 17).clip(lower=1)

changed = df_j["varsta"].notna().sum()
print(f"  Vârste actualizate: {changed} jucători")
print(f"  Vârstă medie: {df_j['varsta'].mean():.1f} ani")
print(f"  Cel mai în vârstă: {df_j.loc[df_j['varsta'].idxmax(), 'nume']} ({df_j['varsta'].max()} ani)")
print(f"  Cel mai tânăr: {df_j.loc[df_j['varsta'].idxmin(), 'nume']} ({df_j['varsta'].min()} ani)")

# ── 2. Calculează scor_fitness ────────────────────────────────
print("\n[2] Calculez scor_fitness din date reale...")

# Ultimele 2 sezoane = 2022-23 și 2023-24
RECENT_SEASONS = ["2022-23", "2023-24"]
df_recent = df_s[df_s["sezon"].isin(RECENT_SEASONS)].copy()

# Statistici per jucător (medie ultimele 2 sezoane)
stats_player = df_recent.groupby("player_id").agg(
    meciuri_med   = ("meciuri_jucate", "mean"),
    minute_med    = ("minute_jucate",  "mean"),
    incarcare_med = ("indice_incarcare","mean"),
    sezoane_rec   = ("sezon", "count")
).reset_index()

# Max posibil per sezon: ~38 meciuri, ~3420 minute
MAX_MECIURI = 38
MAX_MINUTE  = 3420

stats_player["disponibilitate"] = (
    stats_player["meciuri_med"] / MAX_MECIURI * 100
).clip(0, 100)

stats_player["minute_norm"] = (
    stats_player["minute_med"] / MAX_MINUTE * 100
).clip(0, 100)

# Workload optim ~60–80: scor maxim acolo, penalizat la extreme
def workload_score(w):
    if pd.isna(w): return 50
    w = float(w)
    if w < 20: return 40        # prea puțin — nu joacă
    elif w < 40: return 55
    elif w < 65: return 80
    elif w < 80: return 90      # zona optimă
    elif w < 90: return 75
    else: return 55             # supraîncărcat

stats_player["workload_scor"] = stats_player["incarcare_med"].apply(workload_score)

# Accidentări recente (ultimele 2 sezoane)
df_a["data_accidentare"] = pd.to_datetime(df_a["data_accidentare"], errors="coerce")
CUTOFF = pd.Timestamp("2022-07-01")
df_recent_inj = df_a[df_a["data_accidentare"] >= CUTOFF].copy()

inj_recent = df_recent_inj.groupby("player_id").agg(
    nr_accidentari_rec = ("injury_id", "count"),
    zile_absenta_rec   = ("zile_absenta", "sum"),
    ultima_accidentare = ("data_accidentare", "max")
).reset_index()

# Zile de la ultima accidentare (max 730 = 2 ani → scor 100)
inj_recent["zile_de_la_inj"] = (
    pd.Timestamp(TODAY) - inj_recent["ultima_accidentare"]
).dt.days.clip(0, 730)

inj_recent["recuperare_scor"] = (
    inj_recent["zile_de_la_inj"] / 730 * 100
).clip(0, 100)

# Penalizare accidentări frecvente (0 = scor max, 5+ = scor 0)
inj_recent["frecventa_pen"] = (
    inj_recent["nr_accidentari_rec"] * 12
).clip(0, 60)

# Jucători fără accidentări recente → stare excelentă
# (nu apar în df → recuperare_scor = 100, frecventa_pen = 0)

# ── Merge și calculează scorul final ─────────────────────────
fitness_df = df_j[["player_id", "varsta"]].copy()
fitness_df = fitness_df.merge(stats_player[["player_id","disponibilitate","minute_norm","workload_scor"]], on="player_id", how="left")
fitness_df = fitness_df.merge(inj_recent[["player_id","recuperare_scor","frecventa_pen"]], on="player_id", how="left")

# Completează lipsuri
fitness_df["disponibilitate"] = fitness_df["disponibilitate"].fillna(55)   # date lipsă = medie
fitness_df["minute_norm"]      = fitness_df["minute_norm"].fillna(55)
fitness_df["workload_scor"]    = fitness_df["workload_scor"].fillna(60)
fitness_df["recuperare_scor"]  = fitness_df["recuperare_scor"].fillna(100)  # fără accidentări = bine
fitness_df["frecventa_pen"]    = fitness_df["frecventa_pen"].fillna(0)

# Factor vârstă (peak 24–28, scade după)
def varsta_factor(v):
    if pd.isna(v): return 70
    v = float(v)
    if v < 18: return 65
    elif v < 22: return 78
    elif v < 26: return 92
    elif v < 30: return 95
    elif v < 33: return 88
    elif v < 36: return 75
    elif v < 39: return 58
    else: return 42

fitness_df["varsta_scor"] = fitness_df["varsta"].apply(varsta_factor)

# Formula finală (ponderi)
fitness_df["scor_fitness_nou"] = (
    fitness_df["disponibilitate"]  * 0.30 +
    fitness_df["minute_norm"]      * 0.20 +
    fitness_df["workload_scor"]    * 0.15 +
    fitness_df["recuperare_scor"]  * 0.20 +
    fitness_df["varsta_scor"]      * 0.15 -
    fitness_df["frecventa_pen"]    * 0.20
).clip(20, 98).round(1)

# Actualizează în df_j
df_j = df_j.merge(
    fitness_df[["player_id","scor_fitness_nou"]],
    on="player_id", how="left"
)
df_j["scor_fitness"] = df_j["scor_fitness_nou"].fillna(df_j["scor_fitness"])
df_j.drop(columns=["scor_fitness_nou"], inplace=True)

print(f"  Fitness mediu nou: {df_j['scor_fitness'].mean():.1f}")
print(f"  Fitness min: {df_j['scor_fitness'].min():.1f}  max: {df_j['scor_fitness'].max():.1f}")

# Afișează câțiva jucători cunoscuți
known = ["Lionel Messi", "Cristiano Ronaldo", "Neymar Jr", "Luis Suarez",
         "Luka Modric", "Roberto Firmino", "Kylian Mbappe"]
print("\n  Jucători de referință:")
print(f"  {'Jucător':<22} {'Vârstă':>7} {'Fitness':>8}")
print("  " + "-"*40)
for name in known:
    row = df_j[df_j["nume"] == name]
    if not row.empty:
        r = row.iloc[0]
        print(f"  {r['nume']:<22} {int(r['varsta']):>7} {r['scor_fitness']:>8.1f}")

# ── 3. Salvează CSV actualizat ────────────────────────────────
print("\n[3] Salvez jucatori.csv actualizat...")
df_j.to_csv(os.path.join(BASE, "jucatori.csv"), index=False, encoding="utf-8-sig")
print("  OK: jucatori.csv salvat")

# ── 4. Re-seeduiește baza de date ─────────────────────────────
print("\n[4] Re-seeduiesc baza de date SQLite...")
seed_script = os.path.join(BASE, "backend", "scripts", "seed_db.py")
backend_dir  = os.path.join(BASE, "backend")

result = subprocess.run(
    [sys.executable, seed_script],
    cwd=backend_dir,
    capture_output=True, text=True
)
if result.returncode == 0:
    print("  OK: Baza de date actualizată")
    for line in result.stdout.strip().split("\n")[-5:]:
        print(f"  {line}")
else:
    print("  EROARE la seed:")
    print(result.stderr[-500:])

# ── 5. Reantrenează modelele ML ───────────────────────────────
print("\n[5] Reantrenez modelele ML...")
import requests, time

try:
    r = requests.post("http://localhost:8080/api/model/retrain", timeout=120)
    if r.ok:
        data = r.json()
        acc = data.get("accuracy") or data.get("test_accuracy", "?")
        print(f"  OK: model antrenat — accuracy: {acc}")
    else:
        print(f"  EROARE retrain: {r.status_code}")
except Exception as e:
    print(f"  EROARE conexiune backend: {e}")
    print("  (Pornește backend-ul și rulează manual: POST /api/model/retrain)")

print("\n" + "=" * 60)
print("  ACTUALIZARE COMPLETĂ!")
print("=" * 60)
