"""
Reasigneaza sezonul accidentarilor bazat pe data_accidentare.
Sezon fotbal: Aug an1 - Jul an2  =>  "an1-an2"  (e.g. 2024-08-01 => "2024-25")
"""
import sqlite3
from datetime import datetime

DB = "backend/football_risk.db"

def date_to_season(date_str):
    if not date_str:
        return None
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d")
    except:
        return None
    # Sezonul incepe in august
    if d.month >= 8:
        y1, y2 = d.year, d.year + 1
    else:
        y1, y2 = d.year - 1, d.year
    # Returnam format scurt pt an2: 2024-25, 2025-26 etc.
    return f"{y1}-{str(y2)[2:]}"

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Citim toate accidentarile cu data_accidentare
rows = cur.execute("SELECT injury_id, sezon, data_accidentare FROM accidentari").fetchall()

updated = 0
season_counts = {}

for (injury_id, sezon_old, data_acc) in rows:
    sezon_new = date_to_season(data_acc)
    if sezon_new and sezon_new != sezon_old:
        cur.execute("UPDATE accidentari SET sezon=? WHERE injury_id=?", (sezon_new, injury_id))
        updated += 1
    final_s = sezon_new if sezon_new else sezon_old
    season_counts[final_s] = season_counts.get(final_s, 0) + 1

conn.commit()
conn.close()

print(f"Actualizate: {updated} accidentari")
print("\nDistributie finala pe sezoane:")
for s in sorted(season_counts):
    print(f"  {s}: {season_counts[s]}")
