// Vercel entry point. Vercel runs this file on demand for every /api/* request
// (see vercel.json). It reuses the same Express app as `npm start`, so there is one code path.
import { openStore } from '../server/src/db/store.js';
import { seedIfEmpty } from '../server/src/db/seed.js';
import { createApp } from '../server/src/app.js';
import { config } from '../server/src/config.js';

let appPromise = null;
const getApp = () => (appPromise ||= (async () => {
  const store = await openStore();
  if (config.seedDemoData) await seedIfEmpty(store);
  return createApp(store);
})().catch((e) => { appPromise = null; throw e; }));

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (e) {
    console.error('startup failed', e);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'database not reachable', detail: e.message }));
  }
}
