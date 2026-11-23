import { useEffect, useState } from 'react';

interface Health {
  stations: number;
  stale: boolean;
}

/** Temporary shell while the household planner UI is built. */
export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  useEffect(() => {
    fetch('api/health')
      .then((r) => r.json() as Promise<Health>)
      .then(setHealth)
      .catch(() => {
        setHealth(null);
      });
  }, []);
  return (
    <main>
      <h1>Saans Ghar</h1>
      <p>A breathing plan for your whole household, built on live CPCB air data.</p>
      <p role="status">
        {health === null
          ? 'Checking the CPCB feed…'
          : `CPCB stations loaded: ${health.stations}${health.stale ? ' (cached; feed slow)' : ''}`}
      </p>
    </main>
  );
}
