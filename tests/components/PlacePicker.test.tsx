// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlacePicker } from '../../src/components/PlacePicker';
import { DEMOS } from '../../src/state/demo';
import { json, stubFetch } from '../fixtures/ui';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Success = (pos: GeolocationPosition) => void;
type Failure = (err: GeolocationPositionError) => void;

function stubGeolocation(run: (ok: Success, fail: Failure) => void) {
  const getCurrentPosition = vi.fn((ok: Success, fail?: Failure | null) => {
    run(ok, fail!);
  });
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
  });
  return getCurrentPosition;
}

describe('PlacePicker', () => {
  it('searches and lists stations before places', async () => {
    const fake = stubFetch({
      'api/places': () =>
        json({
          stations: [{ label: 'Anand Vihar, Delhi - DPCC', city: 'Delhi', lat: 28.6, lon: 77.3 }],
          places: [{ label: 'Pune, Maharashtra', lat: 18.5, lon: 73.8 }],
        }),
    });
    const onPlace = vi.fn();
    render(<PlacePicker onPlace={onPlace} onDemo={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Area, city or CPCB station'), ' Pune {Enter}');
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('CPCB station · Delhi');
    expect(items[1]).toHaveTextContent('Place');
    expect(fake).toHaveBeenCalledWith('api/places?q=Pune', {});
    await userEvent.click(screen.getByRole('button', { name: /Pune, Maharashtra/ }));
    expect(onPlace).toHaveBeenCalledWith({ label: 'Pune, Maharashtra', lat: 18.5, lon: 73.8 });
  });

  it('says so when nothing matches', async () => {
    stubFetch({ 'api/places': () => json({ stations: [], places: [] }) });
    render(<PlacePicker onPlace={vi.fn()} onDemo={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Area, city or CPCB station'), 'zzzz{Enter}');
    expect(await screen.findByText(/No match in India/)).toBeInTheDocument();
  });

  it('shows the search error', async () => {
    stubFetch({ 'api/places': () => json({ error: 'Search is down' }, 500) });
    render(<PlacePicker onPlace={vi.fn()} onDemo={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Area, city or CPCB station'), 'pune{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('Search is down');
    expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
  });

  it('uses the device location', async () => {
    const get = stubGeolocation((ok) => {
      ok({ coords: { latitude: 19.1, longitude: 72.9 } } as GeolocationPosition);
    });
    const onPlace = vi.fn();
    render(<PlacePicker onPlace={onPlace} onDemo={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(onPlace).toHaveBeenCalledWith({ label: 'My location', lat: 19.1, lon: 72.9 });
    expect(get).toHaveBeenCalledOnce();
  });

  it('tells the user when location is off', async () => {
    stubGeolocation((_ok, fail) => {
      fail({ code: 1, message: 'denied' } as GeolocationPositionError);
    });
    const onPlace = vi.fn();
    render(<PlacePicker onPlace={onPlace} onDemo={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Location is off');
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('offers both demo families', async () => {
    const onDemo = vi.fn();
    render(<PlacePicker onPlace={vi.fn()} onDemo={onDemo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delhi family' }));
    expect(onDemo).toHaveBeenCalledWith(DEMOS[1]?.household);
    await userEvent.click(screen.getByRole('button', { name: 'Mumbai family' }));
    expect(onDemo).toHaveBeenLastCalledWith(DEMOS[0]?.household);
  });
});
