import { newId, type MemberData, type RoutineData } from '../state/household';
import { CheckField, SelectField, TextField, type Option } from './fields';
import { RoutineFields } from './RoutineFields';

interface Props {
  readonly members: readonly MemberData[];
  readonly onChange: (members: MemberData[]) => void;
}

const GROUPS: readonly Option<MemberData['group']>[] = [
  { value: 'child', label: 'Child (under 12)' },
  { value: 'adult', label: 'Adult' },
  { value: 'elder', label: 'Older adult (60+)' },
];

function blankRoutine(): RoutineData {
  return {
    id: newId(),
    label: 'Walk',
    activity: 'moderate',
    minutes: 30,
    usualHour: 7,
    earliestHour: 5,
    latestHour: 9,
    required: false,
  };
}

interface CardProps {
  readonly m: MemberData;
  readonly onChange: (m: MemberData) => void;
  readonly onRemove: () => void;
}

function MemberCard({ m, onChange, onRemove }: CardProps) {
  const setRoutine = (i: number, r: RoutineData | null) => {
    const routines =
      r === null
        ? m.routines.filter((_, j) => j !== i)
        : m.routines.map((x, j) => (j === i ? r : x));
    onChange({ ...m, routines });
  };
  return (
    <li className="card stack">
      <div className="row">
        <TextField
          id={`${m.id}-name`}
          label="Name"
          value={m.name}
          onChange={(name) => {
            onChange({ ...m, name });
          }}
        />
        <SelectField
          id={`${m.id}-group`}
          label="Age group"
          value={m.group}
          options={GROUPS}
          onChange={(group) => {
            onChange({ ...m, group });
          }}
        />
        <CheckField
          label="Asthma, heart or lung condition, pregnancy, or sleep apnoea"
          checked={m.sensitive}
          onChange={(sensitive) => {
            onChange({ ...m, sensitive });
          }}
        />
      </div>
      {m.routines.map((r, i) => (
        <RoutineFields
          key={r.id}
          routine={r}
          idPrefix={`${m.id}-${r.id}`}
          onChange={(next) => {
            setRoutine(i, next);
          }}
          onRemove={() => {
            setRoutine(i, null);
          }}
        />
      ))}
      <div className="actions">
        {m.routines.length < 5 && (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              onChange({ ...m, routines: [...m.routines, blankRoutine()] });
            }}
          >
            Add an outdoor routine
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-small" onClick={onRemove}>
          Remove {m.name || 'member'}
        </button>
      </div>
    </li>
  );
}

/** The family: who they are and what they do outdoors on a normal day. */
export function FamilyEditor({ members, onChange }: Props) {
  const add = () => {
    const member: MemberData = {
      id: newId(),
      name: `Member ${members.length + 1}`,
      group: 'adult',
      sensitive: false,
      routines: [blankRoutine()],
    };
    onChange([...members, member]);
  };
  return (
    <section aria-labelledby="family-h" className="stack">
      <h3 id="family-h">Your family</h3>
      <p className="muted">
        Children, older adults and sensitive members get more cautious advice. Saved only on this
        device.
      </p>
      <ul className="plain-list">
        {members.map((m, i) => (
          <MemberCard
            key={m.id}
            m={m}
            onChange={(next) => {
              onChange(members.map((x, j) => (j === i ? next : x)));
            }}
            onRemove={() => {
              onChange(members.filter((_, j) => j !== i));
            }}
          />
        ))}
      </ul>
      {members.length < 10 && (
        <button type="button" className="btn btn-primary" onClick={add}>
          Add a family member
        </button>
      )}
    </section>
  );
}
