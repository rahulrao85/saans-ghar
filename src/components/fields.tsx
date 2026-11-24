/** One option in a select. */
export interface Option<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

interface SelectProps<T extends string | number> {
  readonly id: string;
  readonly label: string;
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
}

/** Labelled select; the chosen value is mapped back to the typed option, never cast. */
export function SelectField<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
}: SelectProps<T>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked !== undefined) onChange(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NumberProps {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
}

/** Labelled number input, clamped to its range so the maths never sees junk. */
export function NumberField({ id, label, value, min, max, step = 1, onChange }: NumberProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Math.min(max, Math.max(min, Number.isFinite(n) ? n : min)));
        }}
      />
    </div>
  );
}

interface TextProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/** Labelled short text input (names and labels, 40 characters). */
export function TextField({ id, label, value, onChange }: TextProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        maxLength={40}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

interface CheckProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

/** Checkbox with its label wrapped around it (44 px tap target). */
export function CheckField({ label, checked, onChange }: CheckProps) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      {label}
    </label>
  );
}
