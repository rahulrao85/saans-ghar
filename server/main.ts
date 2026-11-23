import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { AirService } from './air';
import { createApp } from './app';
import { fetchJson } from './fetchJson';
import { log } from './log';

/** Production entry point: the API plus the built, precompressed front end. */
function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value === '' ? undefined : value;
}
const dataGovKey = env('DATA_GOV_API_KEY');
const air = new AirService({ fetchJson, dataGovKey, now: Date.now });
const app = createApp({ air, fetchJson, aiEnabled: env('GEMINI_API_KEY') !== undefined });
if (dataGovKey === undefined) log('warn', 'DATA_GOV_API_KEY not set: modelled air data only');

const root = './dist/public';
app.use(
  '/assets/*',
  serveStatic({
    root,
    precompressed: true,
    onFound: (_path, c) => {
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);
app.use('*', serveStatic({ root, precompressed: true }));
app.get('*', serveStatic({ root, path: 'index.html', precompressed: true }));

const port = Number(env('PORT') ?? '8787');
serve({ fetch: app.fetch, port }, (info) => {
  log('info', 'Saans Ghar listening', { port: info.port });
  void air.allStations();
});
