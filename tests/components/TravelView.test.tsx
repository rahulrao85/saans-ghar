// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { TravelView } from '../../src/components/TravelView';

afterEach(cleanup);

describe('TravelView', () => {
  it('asks for a place when there is no PM2.5', () => {
    render(<TravelView pm25={null} />);
    expect(screen.getByText('Pick a place first to compare trips.')).toBeInTheDocument();
  });

  it('compares the default trip with the other modes', () => {
    render(<TravelView pm25={120} />);
    expect(screen.getByText(/~\d+ min, you breathe in ~[\d,]+ µg of PM2.5/)).toBeInTheDocument();
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.length).toBeGreaterThan(2);
    const text = screen.getByRole('table').textContent;
    expect(text).toMatch(/\+[\d,]+ µg/);
    expect(text).toMatch(/-[\d,]+ g CO₂/);
  });

  it('recomputes for mode, distance and who travels', async () => {
    render(<TravelView pm25={120} />);
    const summary = () => screen.getByText(/you breathe in/).textContent;
    const first = summary();
    await userEvent.selectOptions(screen.getByLabelText('Usual way'), 'car');
    const car = summary();
    expect(car).not.toBe(first);
    fireEvent.change(screen.getByLabelText('One-way distance (km)'), { target: { value: '99' } });
    expect(screen.getByLabelText('One-way distance (km)')).toHaveValue(60);
    await userEvent.selectOptions(screen.getByLabelText('Who travels'), 'child');
    expect(summary()).not.toBe(car);
  });

  it('shows a walking trip with no positive CO₂ change', async () => {
    render(<TravelView pm25={50} />);
    await userEvent.selectOptions(screen.getByLabelText('Usual way'), 'walk');
    expect(screen.getByText(/emit ~0 g CO₂/)).toBeInTheDocument();
    expect(screen.getByRole('table').textContent).toMatch(/\+[\d,]+ g CO₂/);
  });
});
