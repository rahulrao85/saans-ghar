// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { saveHousehold } from '../../src/state/household';
import { IST_LATE, IST_MIDNIGHT, airReport, delhiReport } from '../fixtures/air';
import { airRoute, household, json, stubFetch } from '../fixtures/ui';

function at(iso: string) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

beforeEach(() => {
  localStorage.clear();
  at(IST_MIDNIGHT);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const tab = (name: string) => screen.getByRole('tab', { name });

describe('App', () => {
  it('starts with the intro and picker, then plans a demo family', async () => {
    stubFetch(airRoute());
    render(<App />);
    expect(screen.getByRole('heading', { name: /Breathe less smoke/ })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mumbai family' }));
    expect(await screen.findByRole('heading', { name: /Air now in Chembur/ })).toBeInTheDocument();
    expect(screen.getByText(/Planning for/)).toHaveTextContent('3 people');
    expect(screen.getByRole('region', { name: 'This afternoon' })).toBeInTheDocument();
    expect(screen.getAllByText(/Saves ~/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('saans-ghar:household') ?? '{}')).toMatchObject({
      place: { label: 'Chembur, Mumbai' },
    });
    expect(
      (JSON.parse(localStorage.getItem('saans-ghar:ledger') ?? '[]') as unknown[]).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('PromptWars');
  });

  it('shows loading, then an error from the air service', async () => {
    saveHousehold(household());
    stubFetch({ 'api/air': () => json({ error: 'CPCB is unreachable' }, 502) });
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Getting live air data…');
    expect(await screen.findByRole('alert')).toHaveTextContent('CPCB is unreachable');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('loads a saved household and walks through the tabs with the keyboard', async () => {
    saveHousehold(household());
    stubFetch(airRoute());
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Air now in/ })).toBeInTheDocument();
    expect(screen.getByText(/Planning for/)).toHaveTextContent('1 person');
    tab('Today').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: 'Your family' })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: 'Your room' })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: 'Your daily trip, both ways' })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: /Notice for your society/ })).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('heading', { name: 'Ask about your plan' })).toBeInTheDocument();
  });

  it('saves family edits and re-plans', async () => {
    saveHousehold(household());
    stubFetch(airRoute());
    render(<App />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Family' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add a family member' }));
    expect(screen.getByText(/Planning for/)).toHaveTextContent('2 people');
    const stored = JSON.parse(localStorage.getItem('saans-ghar:household') ?? '{}') as {
      members: { name: string }[];
    };
    expect(stored.members.map((m) => m.name)).toEqual(['Aaji', 'Member 2']);
    await userEvent.click(tab('Today'));
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2);
  });

  it('changes place through the picker and closes it', async () => {
    saveHousehold(household());
    const fake = stubFetch({
      ...airRoute(),
      'api/places': () =>
        json({ stations: [], places: [{ label: 'Pune, Maharashtra', lat: 18.5, lon: 73.8 }] }),
    });
    render(<App />);
    await screen.findByRole('heading', { name: /Air now in/ });
    await userEvent.click(screen.getByRole('button', { name: 'Change place or family' }));
    await userEvent.type(screen.getByLabelText('Area, city or CPCB station'), 'Pune{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: /Pune, Maharashtra/ }));
    expect(
      await screen.findByRole('heading', { name: 'Air now in Pune, Maharashtra' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(fake).toHaveBeenCalledWith('api/air?lat=18.5&lon=73.8', {});
    expect(screen.getByText(/Planning for/)).toHaveTextContent('1 person');
  });

  it('closing the picker without choosing leaves everything as it was', async () => {
    saveHousehold(household());
    stubFetch(airRoute());
    render(<App />);
    await screen.findByRole('heading', { name: /Air now in/ });
    const toggle = screen.getByRole('button', { name: 'Change place or family' });
    await userEvent.click(toggle);
    expect(screen.getByRole('search')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('a demo picked from another tab returns to Today', async () => {
    saveHousehold(household());
    stubFetch(airRoute());
    render(<App />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Travel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Change place or family' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delhi family' }));
    await screen.findByRole('heading', { name: /Air now in Karol Bagh/ });
    expect(tab('Today')).toHaveAttribute('aria-selected', 'true');
  });

  it('explains the Delhi plan with the built-in text when the AI is down', async () => {
    stubFetch(airRoute(delhiReport()));
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Delhi family' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Explain' }));
    expect(await screen.findByText('Built-in explanation')).toBeInTheDocument();
    await userEvent.click(tab('Share'));
    expect(screen.getByText(/GRAP stages are the Delhi-NCR/)).toBeInTheDocument();
  });

  it('shows the model-only air when there is no AQI and no CPCB station', async () => {
    saveHousehold(household());
    stubFetch(airRoute(airReport({ aqi: null, station: null, source: 'model', pm25: null })));
    render(<App />);
    expect(await screen.findByText(/No live reading right now/)).toBeInTheDocument();
    await userEvent.click(tab('Share'));
    expect(screen.getByText('A notice needs a live AQI reading.')).toBeInTheDocument();
    await userEvent.click(tab('Travel'));
    expect(screen.getByText('Pick a place first to compare trips.')).toBeInTheDocument();
  });

  it('plans tomorrow when today is nearly over', async () => {
    vi.setSystemTime(new Date(IST_LATE));
    const h = household();
    const [aaji] = h.members;
    saveHousehold({
      ...h,
      members: [{ ...aaji!, routines: [{ ...aaji!.routines[0]!, latestHour: 20 }] }],
    });
    stubFetch(airRoute());
    render(<App />);
    const section = await screen.findByRole('region', { name: /Tomorrow/ });
    expect(within(section).getByText(/Aaji · Evening walk/)).toBeInTheDocument();
  });

  it('answers a question on the Ask tab through the rules fallback', async () => {
    saveHousehold(household());
    stubFetch(airRoute());
    render(<App />);
    await userEvent.click(await screen.findByRole('tab', { name: 'Ask' }));
    await userEvent.click(screen.getByRole('button', { name: 'Do masks help?' }));
    expect(await screen.findByText(/Masks help only when well fitted/)).toBeInTheDocument();
  });
});
