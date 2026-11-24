import { useEffect, useMemo, useState } from 'react';
import { getAir, messageOf } from '../api';
import type { RoutineAdvice } from '../engine/plan';
import type { AirReportData } from '../schemas/air';
import { addToLedger } from './derive';
import { loadLedger, saveLedger, type Place } from './household';

/** One response, tagged with the place it is for. */
export interface Fetched {
  readonly key: string;
  readonly data?: AirReportData;
  readonly at: number;
  readonly error?: string;
}

/** The air report for the current place, or why there is none yet. */
export interface AirState {
  readonly report: AirReportData | null;
  /** When the report arrived (ms since epoch); 0 before the first one. */
  readonly at: number;
  readonly error: string | null;
  readonly loading: boolean;
}

/** Refresh every 15 minutes, and whenever the tab comes back into view. */
const REFRESH_MS = 900_000;

/** A counter that ticks when the plan should be refreshed (the old plan stays on screen meanwhile). */
export function useRefreshTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    };
    const timer = setInterval(bump, REFRESH_MS);
    document.addEventListener('visibilitychange', bump);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', bump);
    };
  }, []);
  return tick;
}

/** Fetch the air report when the place changes or a refresh is due; state is only set from responses. */
export function useAir(place: Place | null): AirState {
  const [fetched, setFetched] = useState<Fetched | null>(null);
  const tick = useRefreshTick();
  const key = place === null ? null : `${place.lat},${place.lon}`;
  const lat = place?.lat;
  const lon = place?.lon;
  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    let live = true;
    const k = `${lat},${lon}`;
    getAir({ lat, lon }).then(
      (data) => {
        if (live) setFetched({ key: k, data, at: Date.now() });
      },
      (error: unknown) => {
        if (live) setFetched({ key: k, at: Date.now(), error: messageOf(error) });
      },
    );
    return () => {
      live = false;
    };
  }, [lat, lon, tick]);
  return airState(fetched, key);
}

/** What the screen shows for a response: only one for the current place counts. */
export function airState(fetched: Fetched | null, key: string | null): AirState {
  const current = fetched !== null && fetched.key === key ? fetched : null;
  if (current === null) return { report: null, at: 0, error: null, loading: key !== null };
  return {
    report: current.data ?? null,
    at: current.at,
    error: current.error ?? null,
    loading: false,
  };
}

/** This device's weekly ledger with today's plan added; saved whenever it changes. */
export function useLedger(advice: readonly RoutineAdvice[], at: number | null) {
  const [stored] = useState(loadLedger);
  const ledger = useMemo(
    () => (at === null ? stored : addToLedger(stored, advice, at)),
    [stored, advice, at],
  );
  useEffect(() => {
    saveLedger(ledger);
  }, [ledger]);
  return ledger;
}
