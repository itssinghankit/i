import { config } from './config.js';
import { openStore } from './db/store.js';
import { seedIfEmpty } from './db/seed.js';
import { createApp } from './app.js';

const store = await openStore();
if (config.seedDemoData) await seedIfEmpty(store);

createApp(store).listen(config.port, '0.0.0.0', () =>
  console.log(`i server on http://localhost:${config.port} (store: ${store.kind()})`),
);
