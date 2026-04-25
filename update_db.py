"""
Actualizare directa a bazei de date cu noile varste si scor_fitness
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import sqlite3
import pandas as pd
import os

BASE = r"C:\Users\BogdanJ\Desktop\Licenta"

# Calea catre baza de date SQLite
DB_PATH = os.path.join(BASE, "backend", "football_risk.db")
if not os.path.exists(DB_PATH):
    # Incearca si alte locatii
    for p in [
        os.path.join(BASE, "backend", "app", "football_risk.db"),
        os.path.join(BASE, "backend", "data", "football_risk.db"),
    ]:
        if os.path.exists(p):
            DB_PATH = p
            break

print(f"DB path: {DB_PATH}")
print(f"DB exists: {os.path.exists(DB_PATH)}")

# Incarca CSV actualizat
df_j = pd.read_csv(os.path.join(BASE, "jucatori.csv"), encoding="utf-8-sig")
print(f"Jucatori in CSV: {len(df_j)}")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Verifica structura tabelei
cursor.execute("PRAGMA table_info(jucatori)")
cols = [r[1] for r in cursor.fetchall()]
print(f"Coloane in tabel 'jucatori': {cols}")

# Actualizeaza fiecare jucator
updated = 0
for _, row in df_j.iterrows():
    pid = row["player_id"]
    varsta = int(row["varsta"]) if pd.notna(row.get("varsta")) else None
    fitness = float(row["scor_fitness"]) if pd.notna(row.get("scor_fitness")) else None
    exp = int(row["ani_experienta_pro"]) if pd.notna(row.get("ani_experienta_pro")) else None

    cursor.execute("""
        UPDATE jucatori
        SET varsta = ?, scor_fitness = ?, ani_experienta_pro = ?
        WHERE player_id = ?
    """, (varsta, fitness, exp, pid))
    updated += cursor.rowcount

conn.commit()
conn.close()

print(f"\nActualizati: {updated} jucatori in baza de date")

# Verifica rezultat pentru jucatori cunoscuti
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("""
    SELECT player_id, nume, varsta, scor_fitness
    FROM jucatori
    WHERE nume IN ('Lionel Messi','Cristiano Ronaldo','Neymar Jr','Luis Suarez','Luka Modric','Kylian Mbappe')
    ORDER BY varsta DESC
""")
rows = cursor.fetchall()
conn.close()

print(f"\n{'Jucator':<22} {'Varsta':>7} {'Fitness':>8}")
print("-" * 40)
for r in rows:
    print(f"  {r[1]:<20} {r[2]:>7} {r[3]:>8.1f}")

print("\nGata! Acum restarteaza backend-ul pentru a prelua datele noi.")
