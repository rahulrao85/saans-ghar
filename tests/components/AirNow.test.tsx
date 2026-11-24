// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AirNow, bandStyle, hoursOld } from '../../src/components/AirNow';
import type { AirReportData } from '../../src/schemas/air';
import {
  airReport,
  delhiReport,
  incompleteReport,
  modelReport,
  noAqiReport,
  severeReport,
  staleReport,
} from '../fixtures/air';

afterEach(cleanup);

const UPDATED = Date.parse('2026-11-24T09:00:00+05:30');
const HOUR = 3_600_000;

function show(report: AirReportData, nowHour = 0, at = UPDATED) {
  return render(<AirNow place="Chembur" report={report} nowHour={nowHour} at={at} />);
}

describe('hoursOld', () => {
  it('counts whole hours and rejects bad timestamps', () => {
    expect(hoursOld('2026-11-24T09:00:00+05:30', UPDATED + 3 * HOUR + 5)).toBe(3);
    expect(hoursOld('nonsense', UPDATED)).toBeNull();
  });
});

describe('bandStyle', () => {
  it('uses white text only on Severe', () => {
    expect(bandStyle(480)).toMatchObject({ '--band-text': '#ffffff' });
    expect(bandStyle(100)).toMatchObject({ '--band-text': '#14161c' });
  });
});

describe('AirNow', () => {
  it('shows the AQI, band, source and forecast bars', () => {
    show(airReport());
    expect(screen.getByRole('heading', { name: 'Air now in Chembur' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'AQI 162' })).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText(/Main pollutant: PM2.5 · PM2.5 ~78/)).toBeInTheDocument();
    expect(screen.getByText('Source: CPCB')).toBeInTheDocument();
    expect(screen.getByText('Borivali East, Mumbai - MPCB · 1.7 km away')).toBeInTheDocument();
    expect(screen.getByText('Updated 24-Nov-2026 09:00 IST')).toBeInTheDocument();
    expect(screen.getByText(/over the next 24 hours.*scaled to the station/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(24);
    expect(screen.getByText('12 am: 114 µg/m³')).toBeInTheDocument();
    expect(screen.queryByText(/last reported/)).not.toBeInTheDocument();
  });

  it('starts the bars at the current hour', () => {
    show(airReport(), 40);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByText(/over the next 8 hours/)).toBeInTheDocument();
  });

  it('shows no bars when no forecast hour is ahead', () => {
    show(airReport({ forecast: [] }));
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('handles a missing AQI and a model-only source', () => {
    show(modelReport());
    expect(screen.getByText(/No live reading right now/)).toBeInTheDocument();
    expect(screen.getByText(/Modelled: Open-Meteo/)).toBeInTheDocument();
    expect(screen.queryByText(/scaled to the station/)).not.toBeInTheDocument();
    expect(screen.queryByText(/last reported/)).not.toBeInTheDocument();
    cleanup();
    show(noAqiReport());
    expect(screen.getByText(/No live reading right now/)).toBeInTheDocument();
  });

  it('flags an indicative AQI and omits PM2.5 when unknown', () => {
    show(incompleteReport());
    expect(screen.getByText(/indicative \(fewer than 3 pollutants reported\)/)).toBeInTheDocument();
    expect(screen.queryByText(/PM2.5 ~/)).not.toBeInTheDocument();
  });

  it('says when the CPCB feed is stale', () => {
    show(staleReport());
    expect(screen.getByText(/CPCB feed is slow right now/)).toBeInTheDocument();
  });

  it('notes a station that last reported two or more hours ago', () => {
    show(delhiReport(), 0, UPDATED + 5 * HOUR + 1000);
    expect(screen.getByText(/This station last reported 5 hours ago/)).toBeInTheDocument();
  });

  it('does not note a station under two hours old', () => {
    show(airReport(), 0, UPDATED + 1.5 * HOUR);
    expect(screen.queryByText(/last reported/)).not.toBeInTheDocument();
  });

  it('does not note a station with an unreadable timestamp', () => {
    const base = airReport();
    show(airReport({ station: base.station && { ...base.station, updated: 'yesterday' } }));
    expect(screen.queryByText(/last reported/)).not.toBeInTheDocument();
  });

  it('renders the Severe band', () => {
    show(severeReport());
    expect(screen.getByText('Severe')).toBeInTheDocument();
  });
});
