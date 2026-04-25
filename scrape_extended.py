"""
Scraping extins Transfermarkt - accidentari reale pentru toti jucatorii din DB.
Ruleaza: python scrape_extended.py
"""
import requests
from bs4 import BeautifulSoup
import pandas as pd
import sqlite3
import time
import random
import re
from datetime import datetime

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://www.transfermarkt.com/",
}

# ID-uri Transfermarkt pentru jucatorii din baza de date
# Format: player_id_intern -> (Nume, TM_id)
PLAYER_TM_IDS = {
    "P001": ("Lionel Messi",              28003),
    "P002": ("Cristiano Ronaldo",         8198),
    "P003": ("Kylian Mbappe",             342229),
    "P004": ("Erling Haaland",            418560),
    "P005": ("Pedri",                     722836),
    "P006": ("Vinicius Jr",               371998),
    "P007": ("Rodri",                     168455),
    "P008": ("Jude Bellingham",           581678),
    "P009": ("Phil Foden",                406635),
    "P010": ("Bukayo Saka",               433177),
    "P011": ("Lamine Yamal",              1014483),
    "P012": ("Florian Wirtz",             658478),
    "P013": ("Gavi",                      557750),
    "P014": ("Jamal Musiala",             580195),
    "P015": ("Federico Valverde",         408841),
    "P016": ("Aitana Bonmati",            296990),
    "P017": ("Harry Kane",                132098),
    "P018": ("Mohamed Salah",             148455),
    "P019": ("Kevin De Bruyne",           88755),
    "P020": ("Virgil van Dijk",           139758),
    "P021": ("Trent Alexander-Arnold",    388424),
    "P022": ("Ruben Dias",                376468),
    "P023": ("William Saliba",            572891),
    "P024": ("Alisson Becker",            105470),
    "P025": ("Thibaut Courtois",          106447),
    "P026": ("Manuel Neuer",              17259),
    "P027": ("Marc-Andre ter Stegen",     74857),
    "P028": ("Antoine Griezmann",         119985),
    "P029": ("Lautaro Martinez",          406625),
    "P030": ("Dusan Vlahovic",            491097),
    "P031": ("Raphinha",                  331920),
    "P032": ("Bernardo Silva",            189532),
    "P033": ("Bruno Fernandes",           167961),
    "P034": ("Marcus Rashford",           258923),
    "P035": ("Declan Rice",               357662),
    "P036": ("Leandro Trossard",          237841),
    "P037": ("Martin Odegaard",           316264),
    "P038": ("Gabriel Magalhaes",         415779),
    "P039": ("Theo Hernandez",            371184),
    "P040": ("Rafael Leao",               595757),
    "P041": ("Olivier Giroud",            17662),
    "P042": ("Thomas Muller",             58358),
    "P043": ("Joshua Kimmich",            161056),
    "P044": ("Alphonso Davies",           424204),
    "P045": ("Jadon Sancho",              403462),
    "P046": ("Enzo Fernandez",            581260),
    "P047": ("Cole Palmer",               650157),
    "P048": ("Nicolas Jackson",           744823),
    "P049": ("Reece James",               484749),
    "P050": ("Moises Caicedo",            666059),
    "P051": ("Robert Lewandowski",        38253),
    "P052": ("Ferran Torres",             519764),
    "P053": ("Frenkie de Jong",           326031),
    "P054": ("Ansu Fati",                 796779),
    "P055": ("Niclas Fullkrug",           110979),
    "P056": ("Xavi Simons",               631799),
    "P057": ("Ousmane Dembele",           246838),
    "P058": ("Bradley Barcola",           831279),
    "P059": ("Achraf Hakimi",             397073),
    "P060": ("Marquinhos",                87942),
    "P061": ("Gianluigi Donnarumma",      315858),
    "P062": ("Nicolo Barella",            255942),
    "P063": ("Hakan Calhanoglu",          129728),
    "P064": ("Alessandro Bastoni",        383183),
    "P065": ("Marcus Thuram",             461374),
    "P066": ("Khvicha Kvaratskhelia",     706700),
    "P067": ("Victor Osimhen",            401173),
    "P068": ("Khephren Thuram",           679025),
    "P069": ("Teun Koopmeiners",          384240),
    "P070": ("Gleison Bremer",            332080),
    "P071": ("Adrien Rabiot",             93926),
    "P072": ("Federico Chiesa",           341092),
    "P073": ("Kingsley Coman",            115418),
    "P074": ("Serge Gnabry",              159471),
    "P075": ("Leon Goretzka",             208150),
    "P076": ("Dayot Upamecano",           344693),
    "P077": ("Joao Cancelo",              162487),
    "P078": ("Ruben Neves",               124444),
    "P079": ("Joao Felix",                461882),
    "P080": ("Pedro Neto",                506756),
    "P081": ("Ilkay Gundogan",            68705),
    "P082": ("Yaya Toure",                26023),
    "P083": ("David Beckham",             3716),
    "P084": ("Thierry Henry",             5765),
    "P085": ("Neymar Jr",                 68290),
    "P086": ("Luis Suarez",               14805),
    "P087": ("Sergio Aguero",             26399),
    "P088": ("Andres Iniesta",            15885),
    "P089": ("Xabi Alonso",               7928),
    "P090": ("Franck Ribery",             5765),   # approximate
    "P091": ("Arjen Robben",              4967),
    "P092": ("Zlatan Ibrahimovic",        40533),
    "P093": ("Wayne Rooney",              9907),
    "P094": ("Frank Lampard",             10531),
    "P095": ("Steven Gerrard",            10297),
    "P096": ("Gareth Bale",               39381),
    "P097": ("Eden Hazard",               50202),
    "P098": ("Paul Pogba",                167498),
    "P099": ("Antoine Semenyo",           620869),
    "P100": ("Dominik Szoboszlai",        463056),
    "P101": ("Darwin Nunez",              621281),
    "P102": ("Luis Diaz",                 480692),
    "P103": ("Alexis Mac Allister",       388498),
    "P104": ("Ibrahima Konate",           469704),
    "P105": ("Andrew Robertson",         234180),
    "P106": ("Cody Gakpo",               463095),
    "P107": ("Dani Olmo",                323781),
    "P108": ("Marc Casado",              829893),
    "P109": ("Jules Kounde",              361985),
    "P110": ("Pau Cubarsi",              985990),
    "P111": ("Granit Xhaka",              98432),
    "P112": ("Victor Boniface",           660129),
    "P113": ("Jonathan Tah",             138527),
    "P114": ("Alejandro Grimaldo",        177199),
    "P115": ("Christopher Nkunku",        371998),
    "P116": ("Goncalo Ramos",             662700),
    "P117": ("Warren Zaire-Emery",        993291),
    "P118": ("Rasmus Hojlund",            893279),
    "P119": ("Mason Mount",              389021),
    "P120": ("Kobbie Mainoo",             956095),
    "P121": ("Matthijs de Ligt",          326031),
    "P122": ("Ivan Toney",               303993),
    "P123": ("Ollie Watkins",            293042),
    "P124": ("Douglas Luiz",             402874),
    "P125": ("Leon Bailey",              388474),
    "P126": ("Morgan Rogers",            787870),
    "P127": ("Bryan Mbeumo",             499765),
    "P128": ("Yoane Wissa",              501766),
    "P129": ("James Maddison",           218885),
    "P130": ("Son Heung-min",            110979),
    "P131": ("Brennan Johnson",          762313),
    "P132": ("Pedro Porro",              498923),
    "P133": ("Micky van de Ven",         751963),
    "P134": ("Kai Havertz",              387887),
    "P135": ("Gabriel Martinelli",       562244),
    "P136": ("Ben White",                386062),
    "P137": ("David Raya",               275841),
    "P138": ("Savinho",                  858990),
    "P139": ("Matheus Nunes",            602982),
    "P140": ("Josko Gvardiol",           544032),
    "P141": ("John Stones",             170223),
    "P142": ("Ederson",                  238223),
    "P143": ("Luka Modric",              27992),
    "P144": ("Toni Kroos",               38537),
    "P145": ("Eduardo Camavinga",        532448),
    "P146": ("Aurelien Tchouameni",      544337),
    "P147": ("Dani Carvajal",            138527),
    "P148": ("Antonio Rudiger",          154174),
    "P149": ("David Alaba",              65826),
    "P150": ("Jan Oblak",               203946),
    "P151": ("Jose Maria Gimenez",       267882),
    "P152": ("Rodrigo De Paul",          220761),
    "P153": ("Paulo Dybala",             148455),
    "P154": ("Lorenzo Pellegrini",       306579),
    "P155": ("Mike Maignan",             200512),
    "P156": ("Tijjani Reijnders",        681671),
    "P157": ("Christian Pulisic",        315802),
    "P158": ("Ruben Loftus-Cheek",       203970),
    "P159": ("Ciro Immobile",           105631),
    "P160": ("Jonathan David",           554982),
    "P161": ("Loic Bade",               600979),
    "P162": ("Serhou Guirassy",          237988),
    "P163": ("Gregor Kobel",            296690),
    "P164": ("Nico Schlotterbeck",       342229),
    "P165": ("Felix Nmecha",            618439),
    "P166": ("Ramy Bensebaini",         299695),
    "P167": ("Karim Benzema",            18922),
    "P168": ("N'Golo Kante",            187447),
    "P169": ("Sadio Mane",              200512),
    "P170": ("Roberto Firmino",         198008),
    "P171": ("James Rodriguez",          88103),
    "P172": ("Casemiro",                61189),
    "P173": ("Lisandro Martinez",        380088),
    "P174": ("Luke Shaw",               197980),
    "P175": ("Andre Onana",             287226),
    "P176": ("Amad Diallo",             698414),
}

SEVERITY_MAP = {
    "Usoara": "Ușoară (1–7 zile)",
    "Moderata": "Moderată (8–28 zile)",
    "Severa": "Severă (29–90 zile)",
    "Foarte severa": "Foarte severă (>90 zile)",
}

def classify_severity(days):
    try:
        d = int(days)
        if d <= 7:  return "Ușoară (1–7 zile)"
        elif d <= 28: return "Moderată (8–28 zile)"
        elif d <= 90: return "Severă (29–90 zile)"
        else: return "Foarte severă (>90 zile)"
    except: return "Moderată (8–28 zile)"

def map_body_part(injury_type):
    injury_lower = injury_type.lower()
    mapping = {
        "hamstring":    ("Ischiogambieri", "Coapsă"),
        "thigh":        ("Cvadriceps",     "Coapsă"),
        "quad":         ("Cvadriceps",     "Coapsă"),
        "calf":         ("Gambă",          "Gambă"),
        "ankle":        ("Gleznă",         "Gleznă"),
        "knee":         ("Genunchi",       "Genunchi"),
        "cruciate":     ("Genunchi",       "Genunchi"),
        "acl":          ("Genunchi",       "Genunchi"),
        "meniscus":     ("Genunchi",       "Genunchi"),
        "achilles":     ("Tendon Achilles","Gleznă"),
        "groin":        ("Adductori",      "Coapsă"),
        "adductor":     ("Adductori",      "Coapsă"),
        "hip":          ("Sold",           "Trunchi"),
        "back":         ("Spate",          "Trunchi"),
        "spine":        ("Spate",          "Trunchi"),
        "shoulder":     ("Umăr",           "Braț"),
        "arm":          ("Braț",           "Braț"),
        "wrist":        ("Încheietură",    "Braț"),
        "foot":         ("Picior",         "Gleznă"),
        "toe":          ("Deget picior",   "Gleznă"),
        "rib":          ("Coaste",         "Trunchi"),
        "head":         ("Cap",            "Cap"),
        "concussion":   ("Cap",            "Cap"),
        "muscle":       ("Ischiogambieri", "Coapsă"),
        "fibula":       ("Gambă",          "Gambă"),
        "tibia":        ("Gambă",          "Gambă"),
    }
    for key, (tip, parte) in mapping.items():
        if key in injury_lower:
            return tip, parte
    return "Muscular (general)", "Coapsă"

def map_mechanism(injury_type):
    injury_lower = injury_type.lower()
    if any(k in injury_lower for k in ["contact", "tackle", "collision", "foul"]):
        return "Contact direct"
    if any(k in injury_lower for k in ["ligament", "cruciate", "acl", "twist"]):
        return "Schimbare directie"
    if any(k in injury_lower for k in ["fractur", "break", "stress"]):
        return "Contact direct"
    return "Non-contact"

def get_injuries_tm(player_id_intern, player_name, tm_id):
    url = f"https://www.transfermarkt.com/x/verletzungen/spieler/{tm_id}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "html.parser")
        table = soup.find("table", {"class": "items"})
        if not table:
            return []

        injuries = []
        rows = table.find("tbody").find_all("tr")
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 5:
                continue
            try:
                sezon        = cols[0].get_text(strip=True)
                tip          = cols[1].get_text(strip=True)
                data_start   = cols[2].get_text(strip=True)
                data_sfarsit = cols[3].get_text(strip=True)
                zile_raw     = cols[4].get_text(strip=True)

                zile = 0
                nums = re.findall(r'\d+', zile_raw)
                if nums: zile = int(nums[0])

                # Parse data start
                try:
                    ds = datetime.strptime(data_start, "%b %d, %Y")
                    data_acc = ds.strftime("%Y-%m-%d")
                except:
                    try:
                        ds = datetime.strptime(data_start, "%d/%m/%Y")
                        data_acc = ds.strftime("%Y-%m-%d")
                    except:
                        data_acc = "2023-01-01"

                # Parse data revenire
                try:
                    dr = datetime.strptime(data_sfarsit, "%b %d, %Y")
                    data_rev = dr.strftime("%Y-%m-%d")
                except:
                    data_rev = ""

                tip_ro, parte_corp = map_body_part(tip)
                severitate = classify_severity(zile)
                mecanism = map_mechanism(tip)

                injuries.append({
                    "player_id":             player_id_intern,
                    "sezon":                 sezon if "-" in sezon else "2023-24",
                    "data_accidentare":      data_acc,
                    "data_revenire":         data_rev,
                    "tip_accidentare":       tip_ro,
                    "parte_corp":            parte_corp,
                    "severitate":            severitate,
                    "zile_absenta":          zile,
                    "mecanism":              mecanism,
                    "context":               "Meci oficial",
                    "minut_accidentare":     45,
                    "suprafata_teren":       "Gazon natural",
                    "conditii_meteo":        "Normal",
                    "temperatura_c":         15,
                    "recidiva":              "Nu",
                    "interventie_chirurgicala": "Da" if any(k in tip.lower() for k in ["surgery","operation","cruciate","acl"]) else "Nu",
                    "sursa":                 "Transfermarkt",
                })
            except:
                continue
        return injuries
    except Exception as e:
        return []


def main():
    DB_PATH = r"C:\Users\BogdanJ\Desktop\Licenta\backend\football_risk.db"
    conn = sqlite3.connect(DB_PATH)

    # Accidentarile deja existente in DB (evitam duplicate)
    existing = set()
    for row in conn.execute("SELECT player_id, data_accidentare, zile_absenta FROM accidentari").fetchall():
        existing.add((row[0], row[1], row[2]))

    print(f"Accidentari existente in DB: {len(existing)}")
    print(f"Jucatori de scrapat: {len(PLAYER_TM_IDS)}")
    print("="*60)

    all_new = []
    errors  = 0

    for i, (pid, (name, tm_id)) in enumerate(PLAYER_TM_IDS.items(), 1):
        print(f"[{i:03d}/{len(PLAYER_TM_IDS)}] {name}...", end=" ", flush=True)
        injuries = get_injuries_tm(pid, name, tm_id)

        new_for_player = 0
        for inj in injuries:
            key = (inj["player_id"], inj["data_accidentare"], inj["zile_absenta"])
            if key not in existing:
                all_new.append(inj)
                existing.add(key)
                new_for_player += 1

        if injuries:
            print(f"{len(injuries)} total, {new_for_player} noi")
        else:
            print("0 (eroare sau fara accidentari)")
            errors += 1

        # Salveaza periodic la fiecare 10 jucatori
        if i % 10 == 0 and all_new:
            _save_to_db(conn, all_new)
            print(f"  --> Salvat {len(all_new)} accidentari noi pana acum")

        time.sleep(random.uniform(2.5, 4.5))

    # Salvare finala
    if all_new:
        _save_to_db(conn, all_new)

    conn.close()

    print("\n" + "="*60)
    print(f"TOTAL accidentari noi adaugate: {len(all_new)}")
    print(f"Erori/fara date: {errors} jucatori")
    print("="*60)


def _save_to_db(conn, injuries):
    """Insereaza accidentarile noi in baza de date."""
    # Genereaza injury_id-uri noi
    max_id_row = conn.execute("SELECT MAX(CAST(SUBSTR(injury_id,2) AS INTEGER)) FROM accidentari WHERE injury_id LIKE 'I%'").fetchone()
    start_idx = (max_id_row[0] or 0) + 1

    for i, inj in enumerate(injuries):
        if inj.get("_saved"): continue
        injury_id = f"I{start_idx + i:04d}"
        try:
            conn.execute("""
                INSERT OR IGNORE INTO accidentari
                (injury_id, player_id, sezon, data_accidentare, data_revenire,
                 tip_accidentare, parte_corp, severitate, zile_absenta,
                 mecanism, context, minut_accidentare, suprafata_teren,
                 conditii_meteo, temperatura_c, recidiva, interventie_chirurgicala)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                injury_id,
                inj["player_id"],
                inj["sezon"],
                inj["data_accidentare"],
                inj["data_revenire"],
                inj["tip_accidentare"],
                inj["parte_corp"],
                inj["severitate"],
                inj["zile_absenta"],
                inj["mecanism"],
                inj["context"],
                inj["minut_accidentare"],
                inj["suprafata_teren"],
                inj["conditii_meteo"],
                inj["temperatura_c"],
                inj["recidiva"],
                inj["interventie_chirurgicala"],
            ))
            inj["_saved"] = True
        except Exception as e:
            pass
    conn.commit()
    print(f"  [DB] Salvat batch in baza de date")


if __name__ == "__main__":
    main()
