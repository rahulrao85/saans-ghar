import { inDelhiNcr } from '../engine/geoTypes';
import { bestAiringHour } from '../engine/indoor';
import type { LedgerEntry } from '../engine/ledger';
import type { AirReportData } from '../schemas/air';
import type { Derived } from '../state/derive';
import type { Household, MemberData } from '../state/household';
import { AskView } from './AskView';
import { ExplainPanel } from './ExplainPanel';
import { FamilyEditor } from './FamilyEditor';
import { HomeView } from './HomeView';
import { LedgerCard } from './LedgerCard';
import { PlanView } from './PlanView';
import { ShareView } from './ShareView';
import type { TabId } from './Tabs';
import { TravelView } from './TravelView';

interface Props {
  readonly tab: TabId;
  readonly household: Household;
  readonly report: AirReportData;
  readonly derived: Derived;
  readonly ledger: readonly LedgerEntry[];
  readonly today: string;
  readonly onMembers: (members: MemberData[]) => void;
}

function Panel({
  id,
  current,
  children,
}: {
  id: TabId;
  current: TabId;
  children: React.ReactNode;
}) {
  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      hidden={current !== id}
      className="stack-lg"
    >
      {current === id && children}
    </div>
  );
}

/** The six sections; only the selected one is rendered. */
export function Panels({ tab, household, report, derived, ledger, today, onMembers }: Props) {
  const { facts, advice, nowHour } = derived;
  const place = household.place?.label ?? '';
  const ncr = report.station !== null && inDelhiNcr(report.station.city, report.station.state);
  const cleanest = bestAiringHour(
    report.forecast.filter((h) => h.hour >= nowHour && h.hour < nowHour + 24),
  );
  return (
    <>
      <Panel id="today" current={tab}>
        <PlanView advice={advice} members={household.members} report={report} />
        {facts !== null && facts.items.length > 0 && <ExplainPanel facts={facts} />}
        <LedgerCard entries={ledger} members={household.members} today={today} />
      </Panel>
      <Panel id="family" current={tab}>
        <FamilyEditor members={household.members} onChange={onMembers} />
      </Panel>
      <Panel id="home" current={tab}>
        <HomeView outdoorPm25={report.pm25} forecast={report.forecast} nowHour={nowHour} />
      </Panel>
      <Panel id="travel" current={tab}>
        <TravelView pm25={report.pm25} />
      </Panel>
      <Panel id="share" current={tab}>
        {report.aqi === null ? (
          <p className="muted">A notice needs a live AQI reading.</p>
        ) : (
          <ShareView
            place={place}
            aqi={report.aqi.aqi}
            delhiNcr={ncr}
            cleanestHour={cleanest?.hour ?? null}
          />
        )}
      </Panel>
      <Panel id="ask" current={tab}>
        {facts !== null && <AskView facts={facts} />}
      </Panel>
    </>
  );
}
