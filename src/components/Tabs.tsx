import { useRef, type KeyboardEvent } from 'react';

/** The app's sections. */
export type TabId = 'today' | 'family' | 'home' | 'travel' | 'share' | 'ask';

/** The tabs, in display order. */
export const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'family', label: 'Family' },
  { id: 'home', label: 'Home air' },
  { id: 'travel', label: 'Travel' },
  { id: 'share', label: 'Share' },
  { id: 'ask', label: 'Ask' },
];

interface Props {
  readonly current: TabId;
  readonly onSelect: (tab: TabId) => void;
}

/** WAI-ARIA tabs: arrow keys, Home and End move between them. */
export function Tabs({ current, onSelect }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = moves[e.key];
    const tab = next === undefined ? undefined : TABS[next];
    if (next === undefined || tab === undefined) return;
    e.preventDefault();
    onSelect(tab.id);
    refs.current[next]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label="Sections">
      {TABS.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          className="tab"
          aria-selected={current === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={current === t.id ? 0 : -1}
          onClick={() => {
            onSelect(t.id);
          }}
          onKeyDown={(e) => {
            onKey(e, i);
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
