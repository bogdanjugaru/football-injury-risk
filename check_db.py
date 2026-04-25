import sqlite3, os
BASE = r"C:\Users\BogdanJ\Desktop\Licenta\backend"
for root, dirs, files in os.walk(BASE):
    for f in files:
        if f.endswith('.db'):
            fp = os.path.join(root, f)
            print(f"Found DB: {fp}")
            conn = sqlite3.connect(fp)
            tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
            print(f"  Tables: {[t[0] for t in tables]}")
            conn.close()
