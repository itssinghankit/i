// Builds the Express app. To add a feature: write modules/<feature>.js that returns a Router,
// then add one line to MODULES below. Nothing else needs to change.
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { progressService } from './services/progress.js';
import { seedIfEmpty } from './db/seed.js';
import { daysModule } from './modules/days.js';
import { todosModule, resolutionsModule, needsWantsModule, routineModule, wantToBeModule } from './modules/lists.js';
import { weeklyHabitsModule } from './modules/weeklyHabits.js';
import { insightsModule } from './modules/insights.js';
import { widgetModule } from './modules/widget.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODULES = [
  ['/', daysModule], // /day/:date, /week, /range
  ['/routine', routineModule],
  ['/todos', todosModule],
  ['/resolutions', resolutionsModule],
  ['/needsWants', needsWantsModule],
  ['/wantToBe', wantToBeModule],
  ['/weeklyHabits', weeklyHabitsModule],
  ['/insights', insightsModule],
  ['/widget', widgetModule],
];

export function createApp(store) {
  const ctx = { store, progress: progressService(store) };
  const app = express();
  app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined));
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.get('/health', (req, res) => res.json({ ok: true, store: store.kind(), canReset: config.allowReset }));
  if (config.apiKey) api.use((req, res, next) => (req.get('x-api-key') === config.apiKey ? next() : res.status(401).json({ error: 'bad api key' })));
  for (const [mount, mod] of MODULES) api.use(mount, mod(ctx));
  api.post('/reset', async (req, res, next) => {
    if (!config.allowReset) return res.status(403).json({ error: 'reset is turned off on this server' });
    try { await seedIfEmpty(store, true); res.json({ ok: true }); } catch (e) { next(e); }
  });

  // /api/v1 is the stable address for the app; /api stays as a short alias.
  app.use('/api/v1', api);
  app.use('/api', api);

  // Serve the built React app so one URL works for the Android WebView.
  const dist = path.join(__dirname, '..', '..', 'web', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use((err, req, res, _next) => { console.error(err); res.status(500).json({ error: err.message }); });
  return app;
}
