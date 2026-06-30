"""Search core (Sprint 5).

Spatial entry points + ranking for finding spots/regions:

  search_entities(query)        own full-text index over spots+regions (name/country/aliases)
  classify_geocode(query)       Open-Meteo geocoding -> {type: point|area, point, bounds}
  search_nearby_spots(point, …) ST_DWithin with an adaptive radius (start 25 km)
  search_by_geometry(shape, …)  drawn circle -> ST_DWithin, rectangle -> ST_Within
  rank_nearby(spots, …)         Score (Sprint 4 seam) x exp(-d/d0)
  search(query, …)              orchestration: entities, else geocode -> point/area
  query_map / query_portfolio   viewport pins, coloured by value
  cluster_pins / toggle_sport   clustering at low zoom / sport re-query

Open axes, period ranking and reverse-region search are Sprint 6; similarity is
Sprint 7. Ranking goes through the injectable ``app.scoring`` ``Scorer`` seam,
whose default is now the Sprint 4 score engine (``SeasonalRuleScorer``). The
active sport is threaded into the scorer so spots are scored for the *selected*
sport, not their first-listed one.
"""
