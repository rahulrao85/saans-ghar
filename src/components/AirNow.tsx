import type { CSSProperties } from 'react';
import { bandFor, pm25Index } from '../engine/aqi';
import { formatIst, hourLabel } from '../engine/format';
import { at } from '../engine/util';
import type { AirReportData } from '../schemas/air';

interface Props {
  readonly place: string;
  readonly report: AirReportData;
  readonly nowHour: number;
  /** When the report was fetched (ms since epoch), to say how old the station reading is. */
  readonly at: number;
}

/** CPCB stations sometimes stop reporting for hours; say so rather than imply it is live. */
const OLD_AFTER_HOURS = 2;

/** Whole hours between a station's ISO timestamp and a moment; null if unparseable. */
export function hoursOld(updated: string, at: number): number | null {
  const t = Date.parse(updated);
  return Number.isNaN(t) ? null : Math.floor((at - t) / 3_600_000);
}

/** Band colour as CSS variables; dark text except on the darkest band (contrast ≥ 4.5). */
export function bandStyle(aqi: number): CSSProperties {
  const band = bandFor(aqi);
  return {
    '--band': band.colour,
    '--band-text': band.category === 'Severe' ? '#ffffff' : '#14161c',
  } as CSSProperties;
}

function AqiSummary({ report }: { report: AirReportData }) {
  const aqi = report.aqi;
  if (aqi === null)
    return <p className="alert">No live reading right now. The plan uses the forecast only.</p>;
  return (
    <div className="aqi" style={bandStyle(aqi.aqi)}>
      <div className="aqi-value" role="img" aria-label={`AQI ${aqi.aqi}`}>
        {aqi.aqi}
      </div>
      <div>
        <span className="band-chip">{aqi.band.category}</span>
        <p>{aqi.band.health}</p>
        <p className="muted">
          Main pollutant: {aqi.dominant}
          {report.pm25 !== null && ` · PM2.5 ~${Math.round(report.pm25)} µg/m³`}
          {!aqi.complete && ' · indicative (fewer than 3 pollutants reported)'}
        </p>
      </div>
    </div>
  );
}

function SourceTags({ report }: { report: AirReportData }) {
  const s = report.station;
  return (
    <div className="source">
      {s === null ? (
        <span className="tag tag-accent">Modelled: Open-Meteo (no CPCB station within 25 km)</span>
      ) : (
        <>
          <span className="tag">Source: CPCB</span>
          <span className="tag">
            {s.name} · {s.km} km away
          </span>
          <span className="tag">Updated {formatIst(s.updated)}</span>
        </>
      )}
    </div>
  );
}

function ForecastBars({ hours, scaled }: { hours: AirReportData['forecast']; scaled: boolean }) {
  const peak = Math.max(1, ...hours.map((h) => h.pm25));
  return (
    <figure>
      <figcaption className="muted">
        PM2.5 over the next {hours.length} hours (estimated trend
        {scaled ? ', scaled to the station' : ''})
      </figcaption>
      <ol className="bars">
        {hours.map((h) => (
          <li key={h.hour} style={bandStyle(pm25Index(h.pm25))}>
            <span className="sr-only">
              {hourLabel(h.hour)}: {Math.round(h.pm25)} µg/m³
            </span>
            <span
              className="bar"
              aria-hidden="true"
              style={{ height: `${Math.max(4, (h.pm25 / peak) * 100)}%` }}
            />
          </li>
        ))}
      </ol>
      <div className="bars-axis" aria-hidden="true">
        <span>{hourLabel(at(hours, 0).hour)}</span>
        <span>{hourLabel(at(hours, hours.length - 1).hour)}</span>
      </div>
    </figure>
  );
}

/** The air now: NAQI, band, source and time, then the next 24 hours. */
export function AirNow({ place, report, nowHour, at }: Props) {
  const next = report.forecast.filter((h) => h.hour >= nowHour).slice(0, 24);
  const age = report.station === null ? null : hoursOld(report.station.updated, at);
  return (
    <section className="card" aria-labelledby="air-now">
      <h3 id="air-now">Air now in {place}</h3>
      <AqiSummary report={report} />
      <SourceTags report={report} />
      {report.stale && (
        <p className="alert" role="status">
          The CPCB feed is slow right now, so this is the last good reading.
        </p>
      )}
      {age !== null && age >= OLD_AFTER_HOURS && (
        <p className="note">
          This station last reported {age} hours ago (CPCB updates can lag); the plan uses that
          reading and the forecast trend.
        </p>
      )}
      {next.length > 0 && <ForecastBars hours={next} scaled={report.station !== null} />}
    </section>
  );
}
