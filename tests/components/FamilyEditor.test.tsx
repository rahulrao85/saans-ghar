// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { FamilyEditor } from '../../src/components/FamilyEditor';
import { flexOf, withWindow } from '../../src/components/RoutineFields';
import type { MemberData, RoutineData } from '../../src/state/household';
import { household } from '../fixtures/ui';

afterEach(cleanup);

function Harness({
  initial,
  onState,
}: {
  initial: MemberData[];
  onState?: (m: MemberData[]) => void;
}) {
  const [members, setMembers] = useState(initial);
  onState?.(members);
  return <FamilyEditor members={members} onChange={setMembers} />;
}

const aaji = (): MemberData => structuredClone(household().members[0]!);

function routine(i: number): RoutineData {
  return { ...aaji().routines[0]!, id: `r${i}`, label: `Walk ${i}` };
}

describe('routine helpers', () => {
  it('flexOf takes the wider side and withWindow clamps to the day', () => {
    const r = routine(0);
    expect(flexOf(r)).toBe(4);
    expect(withWindow(r, 2, 6)).toMatchObject({ usualHour: 2, earliestHour: 0, latestHour: 8 });
    expect(withWindow(r, 22, 4)).toMatchObject({ earliestHour: 18, latestHour: 23 });
  });
});

describe('FamilyEditor', () => {
  it('edits name, age group and the sensitive flag', async () => {
    let latest: MemberData[] = [];
    render(
      <Harness
        initial={[aaji()]}
        onState={(m) => {
          latest = m;
        }}
      />,
    );
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Dadi');
    expect(latest[0]?.name).toBe('Dadi');
    await userEvent.selectOptions(screen.getByLabelText('Age group'), 'child');
    expect(latest[0]?.group).toBe('child');
    await userEvent.click(screen.getByRole('checkbox', { name: /Asthma/ }));
    expect(latest[0]?.sensitive).toBe(false);
  });

  it('edits routine fields', async () => {
    let latest: MemberData[] = [];
    render(
      <Harness
        initial={[aaji()]}
        onState={(m) => {
          latest = m;
        }}
      />,
    );
    const r = () => latest[0]!.routines[0]!;
    const label = screen.getByLabelText('Activity');
    await userEvent.type(label, '!');
    expect(r().label).toBe('Evening walk!');
    await userEvent.selectOptions(screen.getByLabelText('Effort'), 'vigorous');
    expect(r().activity).toBe('vigorous');
    await userEvent.selectOptions(screen.getByLabelText('Usual start'), '19');
    expect(r()).toMatchObject({ usualHour: 19, earliestHour: 15, latestHour: 23 });
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '9999' } });
    expect(r().minutes).toBe(600);
    fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '1' } });
    expect(r().minutes).toBe(5);
    await userEvent.selectOptions(screen.getByLabelText('Can move by'), 'Fixed time');
    expect(r()).toMatchObject({ earliestHour: 19, latestHour: 19 });
    await userEvent.click(screen.getByRole('checkbox', { name: "Can't be skipped" }));
    expect(r().required).toBe(true);
  });

  it('edits one routine and leaves the others alone', async () => {
    let latest: MemberData[] = [];
    render(
      <Harness
        initial={[{ ...aaji(), routines: [routine(1), routine(2)] }]}
        onState={(m) => {
          latest = m;
        }}
      />,
    );
    await userEvent.type(screen.getAllByLabelText('Activity')[1]!, '!');
    expect(latest[0]?.routines.map((r) => r.label)).toEqual(['Walk 1', 'Walk 2!']);
  });

  it('adds and removes routines, hiding the button at five', async () => {
    let latest: MemberData[] = [];
    render(
      <Harness
        initial={[aaji()]}
        onState={(m) => {
          latest = m;
        }}
      />,
    );
    const add = () => screen.queryByRole('button', { name: 'Add an outdoor routine' });
    for (let i = 0; i < 4; i++) await userEvent.click(add()!);
    expect(latest[0]?.routines).toHaveLength(5);
    expect(add()).not.toBeInTheDocument();
    expect(latest[0]?.routines.at(-1)).toMatchObject({ label: 'Walk', minutes: 30, usualHour: 7 });
    await userEvent.click(screen.getByRole('button', { name: 'Remove Evening walk' }));
    expect(latest[0]?.routines).toHaveLength(4);
    expect(add()).toBeInTheDocument();
  });

  it('adds and removes members, hiding the button at ten', async () => {
    let latest: MemberData[] = [];
    render(
      <Harness
        initial={[aaji()]}
        onState={(m) => {
          latest = m;
        }}
      />,
    );
    const add = () => screen.queryByRole('button', { name: 'Add a family member' });
    await userEvent.click(add()!);
    expect(latest[1]).toMatchObject({ name: 'Member 2', group: 'adult', sensitive: false });
    expect(latest[1]?.routines).toHaveLength(1);
    for (let i = 0; i < 8; i++) await userEvent.click(add()!);
    expect(latest).toHaveLength(10);
    expect(add()).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Aaji' }));
    expect(latest).toHaveLength(9);
    expect(add()).toBeInTheDocument();
  });

  it('edits only the member whose card was touched', async () => {
    let latest: MemberData[] = [];
    const second = { ...aaji(), id: 'sameer', name: 'Sameer', routines: [routine(1)] };
    render(
      <Harness
        initial={[aaji(), second]}
        onState={(m) => {
          latest = m;
        }}
      />,
    );
    const cards = screen.getAllByRole('listitem');
    await userEvent.type(within(cards[1]!).getByLabelText('Name'), 'X');
    expect(latest.map((m) => m.name)).toEqual(['Aaji', 'SameerX']);
  });

  it('labels the remove button "member" when the name is empty', () => {
    render(<Harness initial={[{ ...aaji(), name: '' }]} />);
    expect(screen.getByRole('button', { name: 'Remove member' })).toBeInTheDocument();
  });
});
