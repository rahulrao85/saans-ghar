import { micrograms } from '../engine/format';
import { weekTotals, type LedgerEntry } from '../engine/ledger';
import type { MemberData } from '../state/household';

interface Props {
  readonly entries: readonly LedgerEntry[];
  readonly members: readonly MemberData[];
  readonly today: string;
}

/** Planned savings over the last 7 days: kept on this device only. */
export function LedgerCard({ entries, members, today }: Props) {
  const totals = weekTotals(entries, today);
  const rows = members.map((m) => ({ m, saved: totals[m.id] ?? 0 }));
  const all = rows.reduce((sum, r) => sum + r.saved, 0);
  return (
    <section className="card stack" aria-labelledby="ledger-h">
      <h3 id="ledger-h">This week&apos;s plans</h3>
      <p>
        Following the plans you opened over the last 7 days spares your family{' '}
        <strong className="saves">~{micrograms(all)}</strong> of PM2.5.
      </p>
      <ul className="plain-list">
        {rows.map(({ m, saved }) => (
          <li key={m.id} className="advice-head">
            <span>{m.name}</span>
            <span className="muted">{micrograms(saved)}</span>
          </li>
        ))}
      </ul>
      <p className="note">
        Planned savings, counted for each day you opened the plan; the app can&apos;t see whether it
        was followed. Stored only in this browser.
      </p>
    </section>
  );
}
