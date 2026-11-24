import { hourLabel } from '../engine/format';
import type { RoutineData } from '../state/household';
import { CheckField, NumberField, SelectField, TextField, type Option } from './fields';

const ACTIVITIES: readonly Option<RoutineData['activity']>[] = [
  { value: 'rest', label: 'Sitting (bus, car, metro)' },
  { value: 'light', label: 'Light (slow walk, two-wheeler)' },
  { value: 'moderate', label: 'Moderate (brisk walk, cycling)' },
  { value: 'vigorous', label: 'Hard (running, sport, play)' },
];
const HOURS: readonly Option<number>[] = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: hourLabel(h),
}));
const FLEX: readonly Option<number>[] = [0, 1, 2, 3, 4, 6].map((f) => ({
  value: f,
  label: f === 0 ? 'Fixed time' : `± ${f} h`,
}));

/** Hours the routine can move either way. */
export function flexOf(r: RoutineData): number {
  return Math.max(r.usualHour - r.earliestHour, r.latestHour - r.usualHour);
}

/** Routine with a new usual hour or flexibility; the window is clamped to the day. */
export function withWindow(r: RoutineData, usualHour: number, flex: number): RoutineData {
  return {
    ...r,
    usualHour,
    earliestHour: Math.max(0, usualHour - flex),
    latestHour: Math.min(23, usualHour + flex),
  };
}

interface Props {
  readonly routine: RoutineData;
  readonly idPrefix: string;
  readonly onChange: (routine: RoutineData) => void;
  readonly onRemove: () => void;
}

/** One routine: what, how hard, when, how long, and how flexible. */
export function RoutineFields({ routine: r, idPrefix: p, onChange, onRemove }: Props) {
  return (
    <fieldset className="inset row">
      <legend className="sr-only">{r.label}</legend>
      <TextField
        id={`${p}-label`}
        label="Activity"
        value={r.label}
        onChange={(label) => {
          onChange({ ...r, label });
        }}
      />
      <SelectField
        id={`${p}-effort`}
        label="Effort"
        value={r.activity}
        options={ACTIVITIES}
        onChange={(activity) => {
          onChange({ ...r, activity });
        }}
      />
      <SelectField
        id={`${p}-hour`}
        label="Usual start"
        value={r.usualHour}
        options={HOURS}
        onChange={(h) => {
          onChange(withWindow(r, h, flexOf(r)));
        }}
      />
      <NumberField
        id={`${p}-min`}
        label="Minutes"
        value={r.minutes}
        min={5}
        max={600}
        step={5}
        onChange={(minutes) => {
          onChange({ ...r, minutes });
        }}
      />
      <SelectField
        id={`${p}-flex`}
        label="Can move by"
        value={flexOf(r)}
        options={FLEX}
        onChange={(f) => {
          onChange(withWindow(r, r.usualHour, f));
        }}
      />
      <CheckField
        label="Can't be skipped"
        checked={r.required}
        onChange={(required) => {
          onChange({ ...r, required });
        }}
      />
      <button
        type="button"
        className="btn btn-secondary btn-small"
        onClick={onRemove}
        aria-label={`Remove ${r.label}`}
      >
        Remove
      </button>
    </fieldset>
  );
}
