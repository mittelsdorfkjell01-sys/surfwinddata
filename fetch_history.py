import json
import time
import datetime
import os
import requests
from pathlib import Path

SPOTS = [
    {"id": "laboe",           "name": "Laboe",               "lat": 54.404,  "lon": 10.222},
    {"id": "gold_fehmarn",    "name": "Gold auf Fehmarn",    "lat": 54.450,  "lon": 11.190},
    {"id": "hvide_sande",     "name": "Hvide Sande",         "lat": 56.000,  "lon":  8.122},
    {"id": "st_peter_ording", "name": "St. Peter-Ording",    "lat": 54.293,  "lon":  8.652},
    {"id": "is_solinas",      "name": "Is Solinas",          "lat": 40.057,  "lon":  8.391},
    {"id": "la_cinta",        "name": "La Cinta",            "lat": 40.744,  "lon":  9.735},
    {"id": "les_capitelles",  "name": "Les Capitelles",      "lat": 43.459,  "lon":  3.642},
    {"id": "taghazout",       "name": "Taghazout",           "lat": 30.540,  "lon": -9.710},
    {"id": "tarifa",          "name": "Tarifa",              "lat": 36.014,  "lon": -5.601},
    {"id": "leucate",         "name": "Leucate",             "lat": 42.916,  "lon":  3.053},
    {"id": "praia_guincho",   "name": "Praia do Guincho",    "lat": 38.730,  "lon": -9.472},
    {"id": "sotavento",       "name": "Sotavento",           "lat": 28.131,  "lon":-14.254},
    {"id": "brouwersdam",     "name": "Brouwersdam",         "lat": 51.751,  "lon":  3.878},
    {"id": "pounda_paros",    "name": "Pounda Paros",        "lat": 37.007,  "lon": 25.122},
    {"id": "lo_stagnone",     "name": "Lo Stagnone",         "lat": 37.866,  "lon": 12.479},
    {"id": "ringkobing",      "name": "Ringkøbing Fjord",    "lat": 56.089,  "lon":  8.243},
    {"id": "valdevaqueros",   "name": "Valdevaqueros",       "lat": 36.060,  "lon": -5.682},
    {"id": "obidos",          "name": "Óbidos Lagoon",       "lat": 39.364,  "lon": -9.215},
    {"id": "gokova",          "name": "Gökova Bay",          "lat": 37.140,  "lon": 28.010},
    {"id": "akyaka",          "name": "Akyaka",              "lat": 37.055,  "lon": 28.125},
]

START_YEAR = 2004
END_YEAR = 2024
KMH_TO_KTS = 0.539957


def fetch_spot(spot):
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={spot['lat']}&longitude={spot['lon']}"
        f"&start_date={START_YEAR}-01-01&end_date={END_YEAR}-12-31"
        "&hourly=windspeed_10m&wind_speed_unit=kmh&timezone=auto"
    )
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt < 2:
                print(f"  Fehler (Versuch {attempt + 1}/3): {e}. Warte 5s…")
                time.sleep(5)
            else:
                raise


def is_leap_year(y):
    return (y % 4 == 0 and y % 100 != 0) or y % 400 == 0


def hourly_to_daily_max_daytime(times, speeds):
    """Daily max wind (kts) using only hours 09–19 local time, skipping nulls."""
    daily = {}
    for t, s in zip(times, speeds):
        if s is None:
            continue
        try:
            hour = int(t[11:13])
        except (ValueError, IndexError):
            continue
        if hour < 9 or hour > 19:
            continue
        date_str = t[:10]
        if date_str not in daily:
            daily[date_str] = []
        daily[date_str].append(s * KMH_TO_KTS)

    result = {}
    for date_str, values in daily.items():
        if values:
            result[date_str] = max(values)
    return result


def daily_to_365(daily_map, year):
    """Convert daily map to 365-element array, skipping Feb 29."""
    result = [None] * 365
    leap = is_leap_year(year)
    start = datetime.date(year, 1, 1)

    for i in range(366 if leap else 365):
        d = start + datetime.timedelta(days=i)
        if leap and d.month == 2 and d.day == 29:
            continue  # skip day 60 (Feb 29) in leap years

        # Compute 1-indexed day of year, skipping Feb 29 in leap years
        doy = i + 1
        if leap and doy > 59:
            doy -= 1  # shift down by 1 after Feb 28

        idx = doy - 1
        if 0 <= idx < 365:
            val = daily_map.get(str(d), None)
            result[idx] = round(val, 1) if val is not None else None

    return result


def process_spot(raw_data):
    times = raw_data["hourly"]["time"]
    speeds = raw_data["hourly"]["windspeed_10m"]

    daily_map = hourly_to_daily_max_daytime(times, speeds)

    years_data = {}
    for year in range(START_YEAR, END_YEAR + 1):
        year_daily = {k: v for k, v in daily_map.items() if k.startswith(str(year))}
        arr365 = daily_to_365(year_daily, year)
        years_data[str(year)] = arr365

    # avg = mean of raw daily values across all years (no smoothing)
    avg = []
    for i in range(365):
        vals = [years_data[str(y)][i] for y in range(START_YEAR, END_YEAR + 1)
                if years_data[str(y)][i] is not None]
        avg.append(round(sum(vals) / len(vals), 1) if vals else None)

    return {"avg": avg, **years_data}


def main():
    start_time = time.time()
    output = {
        "generated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
        "years": list(range(START_YEAR, END_YEAR + 1)),
        "spots": {},
    }

    Path("data").mkdir(exist_ok=True)

    for i, spot in enumerate(SPOTS):
        print(f"Fetching {spot['name']} ({i + 1}/{len(SPOTS)})…", end=" ", flush=True)
        try:
            raw = fetch_spot(spot)
            hours = len(raw.get("hourly", {}).get("time", []))
            output["spots"][spot["id"]] = process_spot(raw)
            print(f"OK ({END_YEAR - START_YEAR + 1} Jahre, {hours:,} Stunden)")
        except Exception as e:
            print(f"FEHLER: {e}")
            output["spots"][spot["id"]] = {"avg": [None] * 365}

        if i < len(SPOTS) - 1:
            time.sleep(1)

    out_path = "data/history.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"), ensure_ascii=False)

    size_mb = os.path.getsize(out_path) / 1_000_000
    elapsed = time.time() - start_time
    mins, secs = divmod(int(elapsed), 60)
    print(f"\nFertig! {out_path} geschrieben ({size_mb:.1f} MB)")
    print(f"Laufzeit: {mins}:{secs:02d} min")


if __name__ == "__main__":
    main()
