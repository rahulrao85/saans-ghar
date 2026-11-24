import { languageSchema, type Language } from '../schemas/facts';

const NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  mr: 'मराठी (Marathi)',
};

interface Props {
  readonly id: string;
  readonly value: Language;
  readonly onChange: (language: Language) => void;
}

/** Language picker shared by the explanation and the notice. */
export function LanguageSelect({ id, value, onChange }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>Language</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          onChange(languageSchema.parse(e.target.value));
        }}
      >
        {languageSchema.options.map((l) => (
          <option key={l} value={l}>
            {NAMES[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
