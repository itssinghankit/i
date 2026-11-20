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
  // Google sign-in. Set GOOGLE_CLIENT_ID (your Google "Web application" OAuth client ID) to turn it on.
  // Several IDs can be given, comma-separated; the first is the one the app uses.
  googleClientIds: (process.env.GOOGLE_CLIENT_ID || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Long random secret that signs our login tokens. Required when sign-in is on.
  sessionSecret: process.env.SESSION_SECRET || '',
};
config.authRequired = config.googleClientIds.length > 0;
