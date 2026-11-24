// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Panels } from '../../src/components/Panels';
import type { TabId } from '../../src/components/Tabs';
import type { AirReportData } from '../../src/schemas/air';
import { derive } from '../../src/state/derive';
import type { Household } from '../../src/state/household';
import { IST_MIDNIGHT, airReport, delhiReport, noAqiReport } from '../fixtures/air';
import { household } from '../fixtures/ui';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function show(tab: TabId, report: AirReportData = airReport(), h: Household = household()) {
  const derived = derive(h, report, Date.parse(IST_MIDNIGHT));
  return render(
    <Panels
      tab={tab}
      household={h}
      report={report}
      derived={derived}
      ledger={[]}
      today="2026-11-24"
      onMembers={vi.fn()}
    />,
  );
}

describe('Panels', () => {
  it('renders all six panels but fills only the selected one', () => {
    show('today');
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(6);
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'panel-today');
    expect(screen.getByRole('button', { name: 'Explain' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "This week's plans" })).toBeInTheDocument();
  });

  it('hides the explain panel when there is nothing to explain', () => {
    show('today', airReport(), household({ members: [] }));
    expect(screen.queryByRole('button', { name: 'Explain' })).not.toBeInTheDocument();
    expect(screen.getByText(/Add a family member with a daily routine/)).toBeInTheDocument();
  });

  it.each([
    ['family', 'Your family'],
    ['home', 'Your room'],
    ['travel', 'Your daily trip, both ways'],
    ['ask', 'Ask about your plan'],
  ] as const)('shows %s', (tab, heading) => {
    show(tab);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('ask is empty without facts', () => {
    show('ask', airReport(), household({ place: null }));
    expect(screen.queryByRole('heading', { name: 'Ask about your plan' })).not.toBeInTheDocument();
  });

  it('share needs a live AQI', () => {
    show('share', noAqiReport());
    expect(screen.getByText('A notice needs a live AQI reading.')).toBeInTheDocument();
  });

  it('share passes the NCR flag and the cleanest hour', () => {
    show('share', delhiReport());
    expect(screen.getByText(/GRAP stages are the Delhi-NCR action plan/)).toBeInTheDocument();
  });

  it('share works with an empty forecast and outside NCR', () => {
    show('share', airReport({ forecast: [] }));
    expect(screen.getByRole('heading', { name: /Notice for your society/ })).toBeInTheDocument();
    expect(screen.queryByText(/GRAP stages are/)).not.toBeInTheDocument();
  });

  it('share treats a model-only report as non-NCR', () => {
    show('share', airReport({ station: null }));
    expect(screen.queryByText(/GRAP stages are/)).not.toBeInTheDocument();
  });
});
