import urllib.request, json
r = urllib.request.urlopen("http://localhost:8080/api/players?sort_by=risk&limit=10")
data = json.loads(r.read())
print(f"{'Jucator':<25} {'Varsta':>7} {'Fitness':>8} {'Risc':>6}")
print("-" * 50)
for p in data["players"][:10]:
    print(f"{p['nume']:<25} {p.get('varsta','?'):>7} {p.get('scor_fitness') or '?':>8} {p.get('risk_score','?'):>6}")
