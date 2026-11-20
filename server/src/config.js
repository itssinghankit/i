// Every setting comes from environment variables, so the same code runs locally, on a free host, or anywhere else.
export const config = {
  port: Number(process.env.PORT) || 4600,
  mongoUri: process.env.MONGODB_URI || '', // empty = local JSON file with dummy data
  mongoDb: process.env.MONGODB_DB || 'i_app',
  // Optional shared secret. When set, every /api call must send header "x-api-key: <value>".
  apiKey: process.env.API_KEY || '',
  // Comma-separated list of web origins allowed to call the API (e.g. your GitHub Pages URL). Empty = allow all.
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Fill an empty database with dummy data. On by default only for the local file store.
  seedDemoData: process.env.SEED_DEMO ? process.env.SEED_DEMO === 'true' : !process.env.MONGODB_URI,
  // "Reset demo data" wipes everything, so it is off on a real database unless ALLOW_RESET=true.
  allowReset: process.env.ALLOW_RESET ? process.env.ALLOW_RESET === 'true' : !process.env.MONGODB_URI,
};
