import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import sqlite3, os

DB = r"C:\Users\BogdanJ\Desktop\Licenta\backend\football_risk.db"
conn = sqlite3.connect(DB)

# Statistici ultimul sezon pentru Suarez vs Modric vs Firmino
query = """
SELECT j.nume, j.varsta, j.pozitie, j.scor_fitness,
       s.sezon, s.meciuri_jucate, s.minute_jucate,
       s.indice_incarcare, s.sprinturi_totale, s.distanta_totala_km,
       (SELECT COUNT(*) FROM accidentari a WHERE a.player_id = j.player_id) as total_inj,
       (SELECT AVG(a.zile_absenta) FROM accidentari a WHERE a.player_id = j.player_id) as avg_absenta
FROM jucatori j
JOIN statistici_sezon s ON j.player_id = s.player_id
WHERE j.nume IN ('Luis Suarez', 'Luka Modric', 'Lionel Messi', 'Cristiano Ronaldo', 'Roberto Firmino')
  AND s.sezon = '2023-24'
ORDER BY j.varsta DESC
"""

rows = conn.execute(query).fetchall()
print(f"{'Jucator':<22} {'Varsta':>6} {'Poz':>4} {'Fitness':>8} {'Mec':>5} {'Min':>6} {'Incarc':>8} {'Sprin':>7} {'Dist':>7} {'TotInj':>7} {'AvgAbs':>7}")
print("-" * 100)
for r in rows:
    print(f"{r[0]:<22} {r[1]:>6} {r[2]:>4} {r[3]:>8.1f} {r[5]:>5} {r[6]:>6} {r[7]:>8.1f} {r[8]:>7} {r[9]:>7.1f} {r[10]:>7} {r[11]:>7.1f}")

conn.close()
