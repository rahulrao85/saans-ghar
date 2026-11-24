import { useMemo, useState } from 'react';
import { AirNow } from './components/AirNow';
import { Header } from './components/Header';
import { Intro, PlaceBar } from './components/Intro';
import { Panels } from './components/Panels';
import { PlacePicker } from './components/PlacePicker';
import { Tabs, type TabId } from './components/Tabs';
import { istDate } from './engine/format';
import type { LedgerEntry } from './engine/ledger';
import type { AirReportData } from './schemas/air';
import { derive, type Derived } from './state/derive';
import { useAir, useLedger } from './state/hooks';
import { loadHousehold, saveHousehold, type Household, type MemberData } from './state/household';

function LoadStatus({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <p className="muted" role="status">
        Getting live air data…
      </p>
    );
  }
  if (error === null) return null;
  return (
    <p className="alert alert-error" role="alert">
      {error}
    </p>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      Air data: CPCB via data.gov.in (Government Open Data Licence – India) and Open-Meteo (CC BY
      4.0, CAMS model). Advice is general guidance, not medical advice. Built for PromptWars Virtual
      Challenge 6.
    </footer>
  );
}

interface PlannerProps {
  readonly place: string;
  readonly household: Household;
  readonly report: AirReportData;
  readonly derived: Derived;
  readonly ledger: readonly LedgerEntry[];
  readonly at: number;
  readonly tab: TabId;
  readonly onTab: (tab: TabId) => void;
  readonly onMembers: (members: MemberData[]) => void;
}

/** Air now, the section tabs and the selected section. */
function Planner(props: PlannerProps) {
  const { place, household, report, derived, ledger, at, tab, onTab, onMembers } = props;
  return (
    <>
      <AirNow place={place} report={report} nowHour={derived.nowHour} at={at} />
      <Tabs current={tab} onSelect={onTab} />
      <Panels
        tab={tab}
        household={household}
        report={report}
        derived={derived}
        ledger={ledger}
        today={istDate(at)}
        onMembers={onMembers}
      />
    </>
  );
}

/** Saans Ghar: pick a place and a family, get today's breathing plan. */
export function App() {
  const [household, setHousehold] = useState<Household>(loadHousehold);
  const [tab, setTab] = useState<TabId>('today');
  const [picking, setPicking] = useState(false);
  const { report, at, error, loading } = useAir(household.place);
  const derived = useMemo(() => derive(household, report, at), [household, report, at]);
  const ledger = useLedger(derived.advice, report === null ? null : at);

  const update = (next: Household) => {
    setHousehold(next);
    saveHousehold(next);
    setPicking(false);
  };
  const place = household.place;
  const people = household.members.length;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the plan
      </a>
      <div className="shell">
        <Header />
        <main id="main" className="stack-lg">
          {place === null ? (
            <Intro />
          ) : (
            <PlaceBar
              place={place}
              people={people}
              picking={picking}
              onToggle={() => {
                setPicking(!picking);
              }}
            />
          )}
          {(place === null || picking) && (
            <PlacePicker
              onPlace={(p) => {
                update({ ...household, place: p });
              }}
              onDemo={(h) => {
                update(h);
                setTab('today');
              }}
            />
          )}
          <LoadStatus loading={loading} error={error} />
          {place !== null && report !== null && (
            <Planner
              place={place.label}
              household={household}
              report={report}
              derived={derived}
              ledger={ledger}
              at={at}
              tab={tab}
              onTab={setTab}
              onMembers={(members) => {
                update({ ...household, members });
              }}
            />
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
