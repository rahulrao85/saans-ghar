import { hourLabel, micrograms } from '../engine/format';
import type { DayPart } from '../engine/data/day';
import type { RoutineAdvice, Verdict } from '../engine/plan';
import { weatherReason } from '../engine/why';
import type { AirReportData } from '../schemas/air';
import type { MemberData } from '../state/household';

interface Props {
  readonly advice: readonly RoutineAdvice[];
  readonly members: readonly MemberData[];
  readonly report: AirReportData;
}

const TODAY: Readonly<Record<DayPart, string>> = {
  morning: 'This morning',
  afternoon: 'This afternoon',
  evening: 'This evening',
  night: 'Tonight',
};
const TOMORROW: Readonly<Record<DayPart, string>> = {
  morning: 'Tomorrow morning',
  afternoon: 'Tomorrow afternoon',
  evening: 'Tomorrow evening',
  night: 'Tomorrow night',
};

/** Sections in time order: "This morning", "This evening", "Tomorrow morning". */
export function sections(
  advice: readonly RoutineAdvice[],
): { title: string; items: RoutineAdvice[] }[] {
  const out: { title: string; items: RoutineAdvice[] }[] = [];
  for (const a of advice) {
    const title = (a.bestHour >= 24 ? TOMORROW : TODAY)[a.part];
    const last = out[out.length - 1];
    if (last?.title === title) last.items.push(a);
    else out.push({ title, items: [a] });
  }
  return out;
}

const VERDICTS: Readonly<Record<Verdict, { tag: string; action: string }>> = {
  go: { tag: 'Go ahead', action: 'Fine to go.' },
  shorten: { tag: 'Shorten', action: 'Keep it to half the usual time.' },
  mask: { tag: 'Go with N95', action: 'It cannot be skipped, so wear a well-fitted N95.' },
  indoors: { tag: 'Do it indoors', action: 'Move it indoors today.' },
};

function AdviceCard({ a, members, report }: { a: RoutineAdvice } & Omit<Props, 'advice'>) {
  const member = members.find((m) => m.id === a.memberId);
  const routine = member?.routines.find((r) => r.id === a.routineId);
  if (member === undefined || routine === undefined) return null;
  const moved = a.bestHour !== a.usualHour;
  const weather = moved ? weatherReason(report.weather, a.usualHour, a.bestHour) : null;
  return (
    <li className={`card advice verdict-${a.verdict}`}>
      <div className="advice-head">
        <h4>
          {member.name} · {routine.label}
        </h4>
        <span className="tag tag-verdict">{VERDICTS[a.verdict].tag}</span>
      </div>
      <p>
        <strong>
          {moved
            ? `Move from ${hourLabel(a.usualHour)} to ${hourLabel(a.bestHour)}.`
            : `Keep ${hourLabel(a.bestHour)}.`}
        </strong>{' '}
        {VERDICTS[a.verdict].action}
      </p>
      <p className="muted">
        Why: PM2.5 index{' '}
        {moved
          ? `${a.usualAqi} at the usual time, ${a.bestAqi} at ${hourLabel(a.bestHour)}`
          : `${a.bestAqi}, already the cleanest slot in the window`}
        .{weather !== null && ` ${weather}`}
      </p>
      <p>
        {a.savedDose > 0 ? (
          <span className="saves">
            Saves ~{micrograms(a.savedDose)} of PM2.5 for {member.name}
          </span>
        ) : (
          <span className="muted">No change needed.</span>
        )}
      </p>
    </li>
  );
}

/** Today's plan, grouped into morning, afternoon, evening and night. */
export function PlanView({ advice, members, report }: Props) {
  if (advice.length === 0) {
    return <p className="muted">Add a family member with a daily routine to get a plan.</p>;
  }
  const saved = advice.reduce((sum, a) => sum + a.savedDose, 0);
  return (
    <div>
      <div className="card totals">
        <div className="stat">
          <strong className="saves">{micrograms(saved)}</strong>
          <span className="muted">PM2.5 the family avoids by following today&apos;s plan</span>
        </div>
        <div className="stat">
          <strong>{advice.filter((a) => a.bestHour !== a.usualHour).length}</strong>
          <span className="muted">routines moved to a cleaner hour</span>
        </div>
      </div>
      {sections(advice).map(({ title, items }) => (
        <section key={title} className="part" aria-label={title}>
          <h3>{title}</h3>
          <ul className="plain-list">
            {items.map((a) => (
              <AdviceCard
                key={`${a.memberId}-${a.routineId}`}
                a={a}
                members={members}
                report={report}
              />
            ))}
          </ul>
        </section>
      ))}
      <p className="note">
        Dose = PM2.5 × breathing rate for age and activity (US EPA Exposure Factors Handbook 2011) ×
        minutes. Masks are advised but not counted as a saving: fit varies too much.
      </p>
    </div>
  );
}
