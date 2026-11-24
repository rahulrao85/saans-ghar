import type { Place } from '../state/household';

/** First-visit headline: what the app does, in one breath. */
export function Intro() {
  return (
    <div className="hero">
      <h2>
        Breathe less smoke, <span className="mark">without giving up your day.</span>
      </h2>
      <p className="lede">
        Saans Ghar reads the live CPCB air station nearest you and plans when each person in your
        family should walk, play and travel. Every tip shows how much polluted air it saves them.
      </p>
    </div>
  );
}

interface BarProps {
  readonly place: Place;
  readonly people: number;
  readonly picking: boolean;
  readonly onToggle: () => void;
}

/** The current place, with a way to change it. */
export function PlaceBar({ place, people, picking, onToggle }: BarProps) {
  return (
    <div className="advice-head">
      <p className="muted">
        Planning for <strong>{place.label}</strong> · {people} {people === 1 ? 'person' : 'people'}
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-small"
        onClick={onToggle}
        aria-expanded={picking}
      >
        {picking ? 'Close' : 'Change place or family'}
      </button>
    </div>
  );
}
