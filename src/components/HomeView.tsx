import { useState } from 'react';
import { INDOOR_SOURCES, type WindowHabit } from '../engine/data/indoor';
import type { HourlyPm } from '../engine/forecast';
import { hourLabel } from '../engine/format';
import {
  bestAiringHour,
  checkPurifier,
  estimateIndoor,
  interpretReading,
  type IndoorFinding,
  type Room,
} from '../engine/indoor';
import { NumberField, SelectField, type Option } from './fields';
import { PhotoReader } from './PhotoReader';

interface Props {
  readonly outdoorPm25: number | null;
  readonly forecast: readonly HourlyPm[];
  readonly nowHour: number;
}

const WINDOWS: readonly Option<WindowHabit>[] = [
  { value: 'shut', label: 'Mostly shut' },
  { value: 'sometimes', label: 'Open some of the day' },
  { value: 'open', label: 'Open most of the day' },
];

const PURIFIER_TEXT = {
  none: 'No purifier: windows and sources are the levers.',
  undersized: 'Your purifier is too small for this room, even on normal days.',
  'normal-only':
    'Fine on normal days, but too small for smog days. Close the door and run it on high.',
  enough: 'Big enough for this room, even on smog days.',
} as const;

const FINDING_TEXT: Readonly<Record<IndoorFinding, string>> = {
  'source-inside':
    'Indoor air is as bad as or worse than outside: something inside is adding smoke or dust (cooking, incense, a coil). Check the list below.',
  leaky:
    'Most outdoor air is getting in. Keep windows shut in smog hours and seal gaps; a purifier will help.',
  'well-sealed': 'Your home is keeping out most of the outdoor pollution. Keep it up.',
};

function RoomResults({
  room,
  outdoorPm25,
  airing,
}: {
  room: Room;
  outdoorPm25: number | null;
  airing: HourlyPm | null;
}) {
  const purifier = checkPurifier(room);
  return (
    <div className="split">
      <div className="inset">
        <p className="muted">Estimated indoor PM2.5</p>
        <p className="stat">
          <strong>
            {outdoorPm25 === null ? '–' : `~${estimateIndoor(outdoorPm25, room)} µg/m³`}
          </strong>
        </p>
        <p className="note">
          Single-room model, approximate: penetration 0.8, air changes by window habit, settling and
          purifier.
        </p>
      </div>
      <div className="inset">
        <p className="muted">Purifier for {room.areaSqFt} sq ft</p>
        <p>{PURIFIER_TEXT[purifier.verdict]}</p>
        <p className="note">
          AHAM rule: CADR ≥ ⅔ of floor area ({purifier.normalCadr} cfm); smog days ≥ full area (
          {purifier.smogCadr} cfm).
        </p>
      </div>
      <div className="inset">
        <p className="muted">Best hour to air out the house</p>
        <p className="stat">
          <strong>{airing === null ? '–' : hourLabel(airing.hour)}</strong>
        </p>
        <p className="note">
          {airing === null
            ? 'No forecast yet.'
            : `Lowest outdoor PM2.5 in the waking hours ahead (~${airing.pm25} µg/m³). Open windows for 10–15 minutes then.`}
        </p>
      </div>
    </div>
  );
}

function Sources() {
  return (
    <section className="card stack" aria-labelledby="sources-h">
      <h3 id="sources-h">Smoke you can cut at home</h3>
      <ul className="plain-list">
        {INDOOR_SOURCES.map((s) => (
          <li key={s.id} className="inset">
            <strong>{s.label}.</strong> {s.swap}
            <p className="note">
              {s.evidence}{' '}
              {s.url !== undefined && (
                <a href={s.url} target="_blank" rel="noreferrer">
                  Source
                </a>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Indoor air: estimate, purifier sizing, the best hour to air out, and source swaps. */
export function HomeView({ outdoorPm25, forecast, nowHour }: Props) {
  const [room, setRoom] = useState<Room>({
    name: 'Bedroom',
    areaSqFt: 150,
    windows: 'sometimes',
    purifierCadr: 0,
  });
  const [measured, setMeasured] = useState<number | null>(null);
  const airing = bestAiringHour(forecast.filter((h) => h.hour >= nowHour && h.hour < nowHour + 24));
  return (
    <div className="stack-lg">
      <section className="card stack" aria-labelledby="room-h">
        <h3 id="room-h">Your room</h3>
        <div className="row">
          <NumberField
            id="room-area"
            label="Floor area (sq ft)"
            value={room.areaSqFt}
            min={40}
            max={2000}
            step={10}
            onChange={(areaSqFt) => {
              setRoom({ ...room, areaSqFt });
            }}
          />
          <SelectField
            id="room-win"
            label="Windows"
            value={room.windows}
            options={WINDOWS}
            onChange={(windows) => {
              setRoom({ ...room, windows });
            }}
          />
          <NumberField
            id="room-cadr"
            label="Purifier CADR (cfm, 0 if none)"
            value={room.purifierCadr}
            min={0}
            max={1000}
            step={10}
            onChange={(purifierCadr) => {
              setRoom({ ...room, purifierCadr });
            }}
          />
        </div>
        <RoomResults room={room} outdoorPm25={outdoorPm25} airing={airing} />
      </section>
      <PhotoReader onReading={setMeasured} />
      {measured !== null && outdoorPm25 !== null && (
        <p className="alert" role="status">
          Indoor {measured} vs outdoor {Math.round(outdoorPm25)} µg/m³.{' '}
          {FINDING_TEXT[interpretReading(measured, outdoorPm25)]}
        </p>
      )}
      <Sources />
    </div>
  );
}
