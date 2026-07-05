// Data-loading hooks: fetch from the API, adapt to frontend shapes, and expose
// { data, loading, error } so every page can render a skeleton / error state
// instead of a blank screen.

import { useEffect, useState } from "react";
import type { Spot } from "./types";
import * as api from "./api";
import { adaptSpot, adaptSpots } from "./adapt";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const errMessage = (e: unknown) =>
  e instanceof api.ApiError ? e.message : "Unerwarteter Fehler.";

/** Spots (+ their regions), adapted. Re-runs when the query key changes. */
export function useSpots(query: api.SpotQuery = {}): AsyncState<Spot[]> {
  const key = JSON.stringify(query);
  const [state, setState] = useState<AsyncState<Spot[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([api.getSpots(query), api.getRegions()])
      .then(([spots, regions]) => {
        if (!alive) return;
        const byId = new Map(regions.map((r) => [r.id, r]));
        setState({ data: adaptSpots(spots, byId), loading: false, error: null });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ data: null, loading: false, error: errMessage(e) });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

/** A single spot (full record) + its region, adapted. */
export function useSpot(id?: string): AsyncState<Spot> {
  const [state, setState] = useState<AsyncState<Spot>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState({ data: null, loading: true, error: null });
    api
      .getSpot(id)
      .then(async (spot) => {
        let region: api.Region | undefined;
        try {
          region = await api.getRegion(spot.region_id);
        } catch {
          /* region is optional decoration */
        }
        if (!alive) return;
        setState({ data: adaptSpot(spot, region), loading: false, error: null });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ data: null, loading: false, error: errMessage(e) });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return state;
}

/** Live conditions for a spot (best-effort; failure is non-fatal). */
export function useSpotLive(id?: string): AsyncState<api.LiveConditionsRead> {
  const [state, setState] = useState<AsyncState<api.LiveConditionsRead>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState({ data: null, loading: true, error: null });
    api
      .getSpotLive(id)
      .then((d) => alive && setState({ data: d, loading: false, error: null }))
      .catch(
        (e) =>
          alive && setState({ data: null, loading: false, error: errMessage(e) })
      );
    return () => {
      alive = false;
    };
  }, [id]);

  return state;
}

/** 7-day forecast for a spot (best-effort; failure is non-fatal). */
export function useSpotForecast(id?: string): AsyncState<api.ForecastSeries> {
  const [state, setState] = useState<AsyncState<api.ForecastSeries>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState({ data: null, loading: true, error: null });
    api
      .getSpotForecast(id)
      .then((d) => alive && setState({ data: d, loading: false, error: null }))
      .catch(
        (e) => alive && setState({ data: null, loading: false, error: errMessage(e) })
      );
    return () => {
      alive = false;
    };
  }, [id]);
  return state;
}

/** Region season aggregate (52 weeks). Best-effort. */
export function useRegionSeason(id?: string): AsyncState<api.RegionSeasonResponse> {
  const [state, setState] = useState<AsyncState<api.RegionSeasonResponse>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setState({ data: null, loading: true, error: null });
    api
      .getRegionSeason(id)
      .then((d) => alive && setState({ data: d, loading: false, error: null }))
      .catch(
        (e) => alive && setState({ data: null, loading: false, error: errMessage(e) })
      );
    return () => {
      alive = false;
    };
  }, [id]);
  return state;
}

/** Open time: the best weeks for a region. Best-effort. */
export function useBestWeeks(regionId?: string): AsyncState<api.BestWeeksResponse> {
  const [state, setState] = useState<AsyncState<api.BestWeeksResponse>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    if (!regionId) return;
    let alive = true;
    setState({ data: null, loading: true, error: null });
    api
      .getBestWeeks({ region_id: regionId })
      .then((d) => alive && setState({ data: d, loading: false, error: null }))
      .catch(
        (e) => alive && setState({ data: null, loading: false, error: errMessage(e) })
      );
    return () => {
      alive = false;
    };
  }, [regionId]);
  return state;
}

/** All regions (raw backend records). */
export function useRegions(): AsyncState<api.Region[]> {
  const [state, setState] = useState<AsyncState<api.Region[]>>({
    data: null,
    loading: true,
    error: null,
  });
  useEffect(() => {
    let alive = true;
    api
      .getRegions()
      .then((d) => alive && setState({ data: d, loading: false, error: null }))
      .catch(
        (e) =>
          alive && setState({ data: null, loading: false, error: errMessage(e) })
      );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
