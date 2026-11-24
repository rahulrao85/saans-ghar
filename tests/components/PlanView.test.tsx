// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlanView, sections } from '../../src/components/PlanView';
import type { RoutineAdvice } from '../../src/engine/plan';
import { airReport } from '../fixtures/air';
import { household } from '../fixtures/ui';

afterEach(cleanup);

function advice(over: Partial<RoutineAdvice> = {}): RoutineAdvice {
  return {
    memberId: 'aaji',
    routineId: 'walk',
    verdict: 'shorten',
    usualHour: 7,
    bestHour: 14,
    part: 'afternoon',
    usualAqi: 150,
    bestAqi: 90,
    usualDose: 100,
    adviceDose: 40,
    savedDose: 60,
    ...over,
  };
}

describe('sections', () => {
  it('groups by part of day in time order, with tomorrow separate', () => {
    const out = sections([
      advice({ bestHour: 6, part: 'morning' }),
      advice({ bestHour: 8, part: 'morning' }),
      advice({ bestHour: 23, part: 'night' }),
      advice({ bestHour: 30, part: 'morning' }),
    ]);
    expect(out.map((s) => [s.title, s.items.length])).toEqual([
      ['This morning', 2],
      ['Tonight', 1],
      ['Tomorrow morning', 1],
    ]);
  });
});

describe('PlanView', () => {
  const members = household().members;

  it('asks for a routine when there is no advice', () => {
    render(<PlanView advice={[]} members={members} report={airReport()} />);
    expect(screen.getByText(/Add a family member with a daily routine/)).toBeInTheDocument();
  });

  it('shows a moved routine with its saving and the weather reason', () => {
    render(<PlanView advice={[advice()]} members={members} report={airReport()} />);
    const section = screen.getByRole('region', { name: 'This afternoon' });
    expect(within(section).getByText('Aaji · Evening walk')).toBeInTheDocument();
    expect(within(section).getByText('Shorten')).toBeInTheDocument();
    expect(within(section).getByText(/Move from 7 am to 2 pm\./)).toBeInTheDocument();
    expect(within(section).getByText(/150 at the usual time, 90 at 2 pm/)).toBeInTheDocument();
    expect(within(section).getByText(/air layer that dilutes smoke/)).toBeInTheDocument();
    expect(within(section).getByText('Saves ~60 µg of PM2.5 for Aaji')).toBeInTheDocument();
    expect(screen.getByText('routines moved to a cleaner hour').previousSibling).toHaveTextContent(
      '1',
    );
  });

  it('keeps an unmoved routine, with no weather line and no saving', () => {
    const a = advice({ usualHour: 14, savedDose: 0, verdict: 'go' });
    render(<PlanView advice={[a]} members={members} report={airReport()} />);
    expect(screen.getByText('Keep 2 pm.')).toBeInTheDocument();
    expect(screen.getByText(/already the cleanest slot/)).toBeInTheDocument();
    expect(screen.getByText('No change needed.')).toBeInTheDocument();
    expect(screen.queryByText(/air layer/)).not.toBeInTheDocument();
  });

  it('skips the weather line when the weather does not explain the move', () => {
    render(<PlanView advice={[advice()]} members={members} report={airReport({ weather: [] })} />);
    expect(screen.queryByText(/air layer/)).not.toBeInTheDocument();
  });

  it('shows tomorrow sections and skips advice for unknown members or routines', () => {
    render(
      <PlanView
        advice={[
          advice({ bestHour: 31, usualHour: 31, part: 'morning', savedDose: 0 }),
          advice({ memberId: 'ghost' }),
          advice({ routineId: 'ghost' }),
        ]}
        members={members}
        report={airReport()}
      />,
    );
    expect(screen.getByRole('region', { name: 'Tomorrow morning' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(1);
  });
});
