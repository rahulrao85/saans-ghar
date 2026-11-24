// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckField, NumberField, SelectField, TextField } from '../../src/components/fields';
import { Header } from '../../src/components/Header';
import { Intro, PlaceBar } from '../../src/components/Intro';
import { LanguageSelect } from '../../src/components/LanguageSelect';
import { LedgerCard } from '../../src/components/LedgerCard';
import { TABS, Tabs, type TabId } from '../../src/components/Tabs';
import type { Language } from '../../src/schemas/facts';
import { household, MUMBAI_PLACE } from '../fixtures/ui';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('fields', () => {
  it('SelectField maps the chosen option back and ignores unknown values', async () => {
    const onChange = vi.fn<(v: number) => void>();
    render(
      <SelectField
        id="s"
        label="Pick"
        value={1}
        options={[
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ]}
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Pick'), 'Two');
    expect(onChange).toHaveBeenCalledWith(2);
    const select = screen.getByLabelText('Pick');
    // A value that is not an option (cannot happen via the UI) is ignored.
    Object.defineProperty(select, 'value', { value: 'zzz', configurable: true });
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('NumberField clamps to its range and treats junk as the minimum', () => {
    const onChange = vi.fn<(v: number) => void>();
    render(
      <NumberField id="n" label="Num" value={5} min={3} max={10} step={5} onChange={onChange} />,
    );
    const input = screen.getByLabelText('Num');
    expect(input).toHaveAttribute('step', '5');
    fireEvent.change(input, { target: { value: '7' } });
    expect(onChange).toHaveBeenLastCalledWith(7);
    fireEvent.change(input, { target: { value: '55' } });
    expect(onChange).toHaveBeenLastCalledWith(10);
    fireEvent.change(input, { target: { value: '-9' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.change(input, { target: { value: '1e999' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
    // A number input never yields NaN; switch to text to reach the guard.
    (input as HTMLInputElement).type = 'text';
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('TextField and CheckField report changes', async () => {
    const onText = vi.fn<(v: string) => void>();
    const onCheck = vi.fn<(v: boolean) => void>();
    render(
      <>
        <TextField id="t" label="Name" value="" onChange={onText} />
        <CheckField label="Sensitive" checked={false} onChange={onCheck} />
      </>,
    );
    await userEvent.type(screen.getByLabelText('Name'), 'A');
    expect(onText).toHaveBeenCalledWith('A');
    await userEvent.click(screen.getByLabelText('Sensitive'));
    expect(onCheck).toHaveBeenCalledWith(true);
  });
});

describe('Header', () => {
  it('toggles the theme, the dataset and storage', async () => {
    render(<Header />);
    const toggle = screen.getByRole('switch', { name: 'Dark mode' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    await userEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('starts dark when the page is already dark', () => {
    document.documentElement.dataset.theme = 'dark';
    render(<Header />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('survives storage that throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Header />);
    await userEvent.click(screen.getByRole('switch'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Intro and PlaceBar', () => {
  it('renders the headline', () => {
    render(<Intro />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Breathe less smoke');
  });

  it('says person for one and people otherwise, and toggles', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <PlaceBar place={MUMBAI_PLACE} people={1} picking={false} onToggle={onToggle} />,
    );
    expect(screen.getByText(/1 person/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Change place or family' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(<PlaceBar place={MUMBAI_PLACE} people={3} picking onToggle={onToggle} />);
    expect(screen.getByText(/3 people/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('LanguageSelect', () => {
  it('lists three languages and reports the pick', async () => {
    const onChange = vi.fn<(l: Language) => void>();
    render(<LanguageSelect id="l" value="en" onChange={onChange} />);
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'mr');
    expect(onChange).toHaveBeenCalledWith('mr');
  });
});

describe('LedgerCard', () => {
  it('totals the week per member and ignores older days', () => {
    const members = [
      ...household().members,
      { id: 'sameer', name: 'Sameer', group: 'adult' as const, sensitive: false, routines: [] },
    ];
    render(
      <LedgerCard
        today="2026-11-24"
        members={members}
        entries={[
          { date: '2026-11-24', memberId: 'aai', saved: 1000 },
          { date: '2026-11-20', memberId: 'aai', saved: 234.5 },
          { date: '2026-11-01', memberId: 'aai', saved: 9999 },
        ]}
      />,
    );
    expect(screen.getByText(/~1,235 µg/)).toBeInTheDocument();
    expect(screen.getByText('Aai').nextSibling).toHaveTextContent('1,235 µg');
    expect(screen.getByText('Sameer').nextSibling).toHaveTextContent('0 µg');
  });
});

describe('Tabs', () => {
  function Harness() {
    const [tab, setTab] = useState<TabId>('today');
    return <Tabs current={tab} onSelect={setTab} />;
  }

  it('selects on click and marks the current tab', async () => {
    render(<Harness />);
    expect(screen.getAllByRole('tab')).toHaveLength(TABS.length);
    await userEvent.click(screen.getByRole('tab', { name: 'Travel' }));
    expect(screen.getByRole('tab', { name: 'Travel' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('tabindex', '-1');
  });

  it('moves with arrow keys, Home and End, wrapping around', async () => {
    render(<Harness />);
    screen.getByRole('tab', { name: 'Today' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Ask' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Family' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Ask' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
  });

  it('ignores other keys', async () => {
    render(<Harness />);
    screen.getByRole('tab', { name: 'Today' }).focus();
    await userEvent.keyboard('x');
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveFocus();
  });
});
