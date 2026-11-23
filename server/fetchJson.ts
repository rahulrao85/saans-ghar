import type { FetchJson } from './sources/cpcb';

/** data.gov.in can take close to a minute; give up after this. */
const TIMEOUT_MS = 70_000;

/** GET a URL and parse JSON; non-2xx responses and timeouts throw. */
export const fetchJson: FetchJson = async (url) => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': 'saans-ghar/0.1 (air-quality assistant)' },
  });
  if (!response.ok) throw new Error(`Upstream ${response.status}`);
  return response.json();
};
