import { useState, type SyntheticEvent } from 'react';
import { findPlaces } from '../api';
import type { PlacesData } from '../schemas/air';
import { DEMOS } from '../state/demo';
import type { Household, Place } from '../state/household';

interface Props {
  readonly onPlace: (place: Place) => void;
  readonly onDemo: (household: Household) => void;
}

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string };

/** Search matches: CPCB stations first (exact local monitors), then general places. */
function PlaceResults({ results, onPlace }: { results: PlacesData; onPlace: (p: Place) => void }) {
  const options = [
    ...results.stations.map((s) => ({ ...s, hint: `CPCB station · ${s.city}` })),
    ...results.places.map((p) => ({ ...p, hint: 'Place' })),
  ];
  if (options.length === 0) {
    return (
      <p className="muted" role="status">
        No match in India. Try a nearby city or a CPCB station name.
      </p>
    );
  }
  return (
    <ul className="plain-list results" aria-label="Matching places">
      {options.map((o) => (
        <li key={`${o.label}-${o.lat}-${o.lon}`}>
          <button
            type="button"
            className="selectable"
            onClick={() => {
              onPlace({ label: o.label, lat: o.lat, lon: o.lon });
            }}
          >
            <strong>{o.label}</strong> <span className="muted">· {o.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Pick a place: search (CPCB stations first), device location, or a demo family. */
export function PlacePicker({ onPlace, onDemo }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlacesData | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const search = async (e: SyntheticEvent) => {
    e.preventDefault();
    setStatus({ kind: 'busy' });
    try {
      setResults(await findPlaces(query.trim()));
      setStatus({ kind: 'idle' });
    } catch (error) {
      setStatus({ kind: 'error', message: (error as Error).message });
    }
  };

  const locate = () => {
    setStatus({ kind: 'busy' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus({ kind: 'idle' });
        onPlace({ label: 'My location', lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setStatus({ kind: 'error', message: 'Location is off. Search for your area instead.' });
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  };

  return (
    <section className="card stack" aria-labelledby="where">
      <h3 id="where">Where does your family live?</h3>
      <form className="row" onSubmit={(e) => void search(e)} role="search">
        <div className="field">
          <label htmlFor="place-q">Area, city or CPCB station</label>
          <input
            id="place-q"
            type="search"
            value={query}
            minLength={2}
            maxLength={60}
            required
            placeholder="e.g. Chembur, Anand Vihar, Pune"
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={status.kind === 'busy'}>
          Search
        </button>
        <button className="btn btn-secondary" type="button" onClick={locate}>
          Use my location
        </button>
      </form>
      {status.kind === 'error' && (
        <p className="alert alert-error" role="alert">
          {status.message}
        </p>
      )}
      {results !== null && <PlaceResults results={results} onPlace={onPlace} />}
      <div>
        <p className="muted">Or try a sample family:</p>
        <div className="actions">
          {DEMOS.map((d) => (
            <button
              key={d.id}
              type="button"
              className="btn btn-accent btn-small"
              onClick={() => {
                onDemo(d.household);
              }}
            >
              {d.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
