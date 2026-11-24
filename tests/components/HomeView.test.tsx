// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeView } from '../../src/components/HomeView';
import { PhotoReader } from '../../src/components/PhotoReader';
import { shrinkImage } from '../../src/components/shrinkImage';
import { forecast48 } from '../fixtures/air';
import { json, parseBody, stubFetch } from '../fixtures/ui';

vi.mock('../../src/components/shrinkImage', () => ({ shrinkImage: vi.fn() }));

beforeEach(() => {
  vi.mocked(shrinkImage).mockResolvedValue({ base64: 'QUJD', mimeType: 'image/jpeg' });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const photo = () => new File(['x'], 'display.jpg', { type: 'image/jpeg' });
const readRoute = (body: unknown, status = 200) => ({ 'api/ai/read': () => json(body, status) });

describe('PhotoReader', () => {
  it('reads a photo, asks to confirm and passes the value up', async () => {
    const fake = stubFetch(readRoute({ found: true, pm25: 41, device: 'monitor' }));
    const onReading = vi.fn();
    render(<PhotoReader onReading={onReading} />);
    await userEvent.upload(screen.getByLabelText('Photo of the display'), photo());
    expect(await screen.findByText('41 µg/m³')).toBeInTheDocument();
    expect(parseBody(fake.mock.calls[0]?.[1])).toEqual({
      image: 'QUJD',
      mimeType: 'image/jpeg',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Yes, use it' }));
    expect(onReading).toHaveBeenCalledWith(41);
    expect(screen.queryByText('Yes, use it')).not.toBeInTheDocument();
  });

  it('shows a busy message while reading', async () => {
    let finish: () => void = () => undefined;
    vi.mocked(shrinkImage).mockReturnValue(
      new Promise((resolve) => {
        finish = () => {
          resolve({ base64: 'QUJD', mimeType: 'image/jpeg' });
        };
      }),
    );
    stubFetch(readRoute({ found: true, pm25: 41, device: 'monitor' }));
    render(<PhotoReader onReading={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText('Photo of the display'), photo());
    expect(screen.getByText('Reading the display…')).toBeInTheDocument();
    finish();
    await screen.findByText('41 µg/m³');
  });

  it('says so when no PM2.5 number is clear', async () => {
    stubFetch(readRoute({ found: false, pm25: null, device: 'other' }));
    render(<PhotoReader onReading={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText('Photo of the display'), photo());
    expect(await screen.findByText(/No PM2.5 number was clear/)).toBeInTheDocument();
  });

  it('shows the server error message', async () => {
    stubFetch(readRoute({ error: 'Photo reading is unavailable' }, 503));
    render(<PhotoReader onReading={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText('Photo of the display'), photo());
    expect(await screen.findByText('Photo reading is unavailable')).toBeInTheDocument();
  });

  it('ignores a change with no file', () => {
    render(<PhotoReader onReading={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Photo of the display'), { target: { files: [] } });
    expect(screen.queryByText('Reading the display…')).not.toBeInTheDocument();
    expect(shrinkImage).not.toHaveBeenCalled();
  });

  it('accepts a typed value in range and rounds it', async () => {
    const onReading = vi.fn();
    render(<PhotoReader onReading={onReading} />);
    const compare = screen.getByRole('button', { name: 'Compare with outdoors' });
    expect(compare).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Or type the indoor PM2.5/), '41.6');
    await userEvent.click(compare);
    expect(onReading).toHaveBeenCalledWith(42);
  });

  it('rejects typed values outside 0 to 2000', async () => {
    const onReading = vi.fn();
    render(<PhotoReader onReading={onReading} />);
    const input = screen.getByLabelText(/Or type the indoor PM2.5/);
    const compare = screen.getByRole('button', { name: 'Compare with outdoors' });
    await userEvent.type(input, '3000');
    await userEvent.click(compare);
    await userEvent.clear(input);
    await userEvent.type(input, '-4');
    await userEvent.click(compare);
    expect(onReading).not.toHaveBeenCalled();
  });
});

describe('HomeView', () => {
  const forecast = forecast48();
  const view = (outdoorPm25: number | null = 78, hour = 0, hours = forecast) =>
    render(<HomeView outdoorPm25={outdoorPm25} forecast={hours} nowHour={hour} />);

  it('estimates indoor PM2.5 and the best hour to air out', () => {
    view();
    expect(screen.getByText(/^~\d+ µg\/m³$/)).toBeInTheDocument();
    expect(screen.getByText('2 pm')).toBeInTheDocument();
    expect(
      screen.getByText(/Lowest outdoor PM2.5 in the waking hours ahead \(~30 µg/),
    ).toBeInTheDocument();
    expect(screen.getByText('Purifier for 150 sq ft')).toBeInTheDocument();
    expect(screen.getByText(/No purifier: windows and sources/)).toBeInTheDocument();
    expect(
      screen.getByText(/CADR ≥ ⅔ of floor area \(100 cfm\); smog days ≥ full area/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Source' })).toBeInTheDocument();
  });

  it('shows dashes when there is no outdoor reading or forecast', () => {
    view(null, 0, []);
    expect(screen.getAllByText('–')).toHaveLength(2);
    expect(screen.getByText('No forecast yet.')).toBeInTheDocument();
  });

  it('judges the purifier size', () => {
    view();
    const cadr = screen.getByLabelText(/Purifier CADR/);
    fireEvent.change(cadr, { target: { value: '50' } });
    expect(screen.getByText(/too small for this room, even on normal days/)).toBeInTheDocument();
    fireEvent.change(cadr, { target: { value: '120' } });
    expect(screen.getByText(/Fine on normal days, but too small for smog/)).toBeInTheDocument();
    fireEvent.change(cadr, { target: { value: '200' } });
    expect(screen.getByText(/Big enough for this room/)).toBeInTheDocument();
  });

  it('re-estimates for area and window habit', async () => {
    view();
    const before = screen.getByText(/^~\d+ µg\/m³$/).textContent;
    await userEvent.selectOptions(screen.getByLabelText('Windows'), 'open');
    const open = screen.getByText(/^~\d+ µg\/m³$/).textContent;
    expect(open).not.toBe(before);
    fireEvent.change(screen.getByLabelText('Floor area (sq ft)'), { target: { value: '300' } });
    expect(screen.getByText('Purifier for 300 sq ft')).toBeInTheDocument();
  });

  it.each([
    ['100', /as bad as or worse than outside/],
    ['70', /Most outdoor air is getting in/],
    ['20', /keeping out most of the outdoor pollution/],
  ])('reads a typed indoor value of %s', async (typed, finding) => {
    view();
    await userEvent.type(screen.getByLabelText(/Or type the indoor PM2.5/), typed);
    await userEvent.click(screen.getByRole('button', { name: 'Compare with outdoors' }));
    expect(screen.getByRole('status')).toHaveTextContent(`Indoor ${typed} vs outdoor 78 µg/m³.`);
    expect(screen.getByRole('status')).toHaveTextContent(finding);
  });

  it('shows no finding without an outdoor reading', async () => {
    view(null);
    await userEvent.type(screen.getByLabelText(/Or type the indoor PM2.5/), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Compare with outdoors' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('feeds a photo reading into the comparison', async () => {
    stubFetch(readRoute({ found: true, pm25: 20, device: 'purifier' }));
    view();
    await userEvent.upload(screen.getByLabelText('Photo of the display'), photo());
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, use it' }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Indoor 20 vs outdoor 78');
    });
  });
});
