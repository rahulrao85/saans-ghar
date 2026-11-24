import { micrograms } from '../engine/format';
import { weekTotals, type LedgerEntry } from '../engine/ledger';
import type { MemberData } from '../state/household';

interface Props {
  readonly entries: readonly LedgerEntry[];
  readonly members: readonly MemberData[];
  readonly today: string;
}

/** "This week the family avoided ~X µg": kept on this device only. */
export function LedgerCard({ entries, members, today }: Props) {
  const totals = weekTotals(entries, today);
  const rows = members.map((m) => ({ m, saved: totals[m.id] ?? 0 }));
  const all = rows.reduce((sum, r) => sum + r.saved, 0);
  return (
    <section className="card stack" aria-labelledby="ledger-h">
      <h3 id="ledger-h">This week</h3>
      <p>
        Your family avoided <strong className="saves">~{micrograms(all)}</strong> of PM2.5 over the
        last 7 days.
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
        Counted from the days you opened the plan. Stored only in this browser.
      </p>
    </section>
  );
}
