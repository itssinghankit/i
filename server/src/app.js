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
import { learnCategoriesModule, learningsModule } from './modules/learnings.js';
import { authModule, requireUser } from './modules/auth.js';
import { scopedStore } from './db/scoped.js';
import { googleVerifier } from './auth/google.js';

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
  ['/learnCategories', learnCategoriesModule],
  ['/learnings', learningsModule],
];

// options.verifyGoogleToken lets tests replace the real Google check.
export function createApp(baseStore, options = {}) {
  if (config.authRequired && config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be set (32+ characters) when GOOGLE_CLIENT_ID is set');
  }
  // Every feature sees only the signed-in person's data (see db/scoped.js).
  const store = scopedStore(baseStore);
  const verifyGoogleToken = options.verifyGoogleToken || (config.authRequired ? googleVerifier(config.googleClientIds) : null);
  const ctx = { store, config, verifyGoogleToken, progress: progressService(store) };
  const app = express();
  app.use(cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined));
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.get('/health', (req, res) => res.json({ ok: true, store: store.kind(), canReset: config.allowReset, authRequired: config.authRequired }));
  if (config.apiKey) api.use((req, res, next) => (req.get('x-api-key') === config.apiKey ? next() : res.status(401).json({ error: 'bad api key' })));
  api.use('/auth', authModule(ctx));     // open: sign-in itself
  api.use(requireUser(config));          // everything below needs a signed-in user (when sign-in is on)
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

  // Errors with a status (e.g. 400 'category not found') keep it; anything else is a 500.
  app.use((err, req, res, _next) => {
    const status = err.status && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message });
  });
  return app;
}
