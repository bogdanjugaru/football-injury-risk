import sqlite3
conn = sqlite3.connect(r"C:\Users\BogdanJ\Desktop\Licenta\backend\football_risk.db")
rows = conn.execute("SELECT player_id, nume, pozitie, club, varsta FROM jucatori ORDER BY varsta DESC").fetchall()
for r in rows:
    print(f"{r[0]}\t{r[1]}\t{r[2]}\t{r[3]}\t{r[4]}")
conn.close()
