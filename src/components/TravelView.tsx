import { useState } from 'react';
import type { AgeGroup } from '../engine/data/breathing';
import { MODES } from '../engine/data/travel';
import { micrograms } from '../engine/format';
import type { TravelMode } from '../engine/household';
import { compareSwitches, tripOption } from '../engine/switches';
import { NumberField, SelectField, type Option } from './fields';

const MODE_OPTIONS: readonly Option<TravelMode>[] = (Object.keys(MODES) as TravelMode[]).map(
  (m) => ({ value: m, label: MODES[m].label }),
);
const WHO: readonly Option<AgeGroup>[] = [
  { value: 'child', label: 'Child' },
  { value: 'adult', label: 'Adult' },
  { value: 'elder', label: 'Older adult' },
];

const signed = (n: number, unit: string): string =>
  `${n > 0 ? '+' : ''}${n.toLocaleString('en-IN')} ${unit}`;

/** Compare ways to make a trip: what you breathe in and what you put into the air. */
export function TravelView({ pm25 }: { readonly pm25: number | null }) {
  const [mode, setMode] = useState<TravelMode>('two-wheeler');
  const [km, setKm] = useState(8);
  const [group, setGroup] = useState<AgeGroup>('adult');
  if (pm25 === null) return <p className="muted">Pick a place first to compare trips.</p>;
  const base = tripOption(mode, km, pm25, group);
  const switches = compareSwitches(mode, km, pm25, group);
  return (
    <section className="card stack" aria-labelledby="travel-h">
      <h3 id="travel-h">Your daily trip, both ways</h3>
      <div className="row">
        <SelectField
          id="trip-mode"
          label="Usual way"
          value={mode}
          options={MODE_OPTIONS}
          onChange={setMode}
        />
        <NumberField
          id="trip-km"
          label="One-way distance (km)"
          value={km}
          min={1}
          max={60}
          onChange={setKm}
        />
        <SelectField
          id="trip-who"
          label="Who travels"
          value={group}
          options={WHO}
          onChange={setGroup}
        />
      </div>
      <p className="inset">
        By {MODES[mode].label.toLowerCase()}: ~{base.minutes} min, you breathe in ~
        {micrograms(base.dose)} of PM2.5 and emit ~{base.co2.toLocaleString('en-IN')} g CO₂.
      </p>
      <table className="compare">
        <caption className="sr-only">Other ways to make the same trip</caption>
        <thead>
          <tr>
            <th scope="col">Switch to</th>
            <th scope="col">Time</th>
            <th scope="col">You breathe</th>
            <th scope="col">You emit</th>
          </tr>
        </thead>
        <tbody>
          {switches.map((s) => (
            <tr key={s.mode}>
              <td data-label="Switch to">
                <strong>{MODES[s.mode].label}</strong>
              </td>
              <td data-label="Time">{s.minutes} min</td>
              <td data-label="You breathe">{signed(s.doseChange, 'µg')}</td>
              <td data-label="You emit">{signed(s.co2Change, 'g CO₂')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        Approximate: in-vehicle exposure shares are mid-range values from Indian on-road studies;
        CO₂ per passenger-km from India GHG Program road factors. Walking and cycling emit nothing
        but you breathe harder, so pick cleaner hours or quieter streets.
      </p>
    </section>
  );
}
