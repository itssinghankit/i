# i — a self-improving routine app

Made by **itssinghankit**. Android package: `com.itssinghankit.i`.

## Run it on your computer (dummy data, no database needed)

```bash
cd web && npm install && npm run build      # build the UI once
cd ../server && npm install && npm start    # http://localhost:4600
```

While working on the UI, run `npm run dev` in `web/` instead (http://localhost:5180, reloads on save; it forwards `/api` to the server).

`npm run seed` in `server/` resets everything to the dummy data.

## Use MongoDB Atlas

Set one variable and restart. Nothing else changes:

```bash
MONGODB_URI="mongodb+srv://…" npm start
```

Other settings (all optional): `PORT`, `MONGODB_DB`, `APP_TZ`, `API_KEY` (calls must send `x-api-key`), `CORS_ORIGINS`, `SEED_DEMO`, `ALLOW_RESET`.

Run the tests: `npm test` (file store) or `MONGODB_URI=… npm test` (MongoDB).

## How it fits together

```
 Phone                                   Server (Node + Express)            Database
┌──────────────────────────────┐        ┌───────────────────────────┐     ┌──────────────┐
│ Android app (Kotlin)         │        │ app.js  → mounts modules   │     │ MongoDB Atlas│
│  ├─ WebView ── loads ────────┼──────▶ │ modules/ one file/feature  │ ──▶ │   or         │
│  │   React UI (web/dist)     │  /api/v1  services/ shared logic   │     │ data/db.json │
│  ├─ Home-screen widget ──────┼──────▶ │ db/store.js (Mongo | file) │     │ (local demo) │
│  └─ Update check → GitHub    │        └───────────────────────────┘     └──────────────┘
└──────────────────────────────┘
```

```
server/src/
  index.js            start the server
  app.js              list of feature modules (add one line per new feature)
  config.js           all settings from environment variables
  db/store.js         one storage interface, two back ends (MongoDB or JSON file)
  db/seed.js          dummy data
  services/progress.js  routine-of-the-day, % done, day time budget
  modules/
    crud.js           list/create/update/delete in one call
    lists.js          routine, to-dos, resolutions, needs/wants, want-to-be
    days.js           home data, ticks, week chart, calendar, settings
    weeklyHabits.js   habit of the week + "graduate into routine"
    insights.js       self-improving tips (a list of small rules)
    widget.js         data for the Android widget
web/src/
  api.js  ui.jsx  App.jsx  screens/{Home,Routine,Goals}.jsx
android/              WebView app, widget, update checker
.github/workflows/    CI + release
```

### Adding a feature later

1. **Simple list** (e.g. "Books to read"): add 3 lines to `modules/lists.js` with `crudRouter(store, 'books', { fields: [...] })`, add one line to `MODULES` in `app.js`. Then add a screen in `web/src/screens/` and one entry in the `MORE` menu in `App.jsx`.
2. **New insight rule**: add one function to `RULES` in `modules/insights.js`.
3. **Change the database**: write another class with the same calls as `FileStore`/`MongoStore` in `db/store.js`.

The API lives under `/api/v1`. If you ever need breaking changes, add `/api/v2` next to it, so older app versions keep working.

## Deploy the web app + API on Vercel (free, auto-deploy on every push)

1. On vercel.com: **Add New → Project → Import** the GitHub repo `itssinghankit/i`. Keep the settings from `vercel.json`.
2. In the project's **Settings → Environment Variables**, add `MONGODB_URI` = your Atlas connection link (with your database password). Optional: `SEED_DEMO=true` once, to start with dummy data.
3. Deploy. Every `git push` to `master` deploys again in about a minute.
4. Put the Vercel address (e.g. `https://i-xxxx.vercel.app`) in `android/gradle.properties` → `I_APP_URL`, or as the `I_APP_URL` variable in GitHub Actions.

Notes:
- `api/index.js` is the Vercel entry point; it runs the same Express app as `npm start`.
- Server dates use India time (`APP_TZ`, default `Asia/Kolkata`) because Vercel runs on UTC.
- On a real database, "Reset demo data" is turned off unless `ALLOW_RESET=true`.
- Atlas → Network Access must allow Vercel. Vercel has no fixed address, so this means `0.0.0.0/0` with a strong database password.

## Release a new version (free, with GitHub)

GitHub can build and host the **Android app** for free. It cannot run the **Node server**, so host that elsewhere (free options: Render, Koyeb; database: MongoDB Atlas free tier).

1. Push this folder to a GitHub repo (the app expects `itssinghankit/i`; change `I_GITHUB_REPO` in `android/gradle.properties` if different).
2. In the repo: Settings → Variables → Actions → add `I_APP_URL` = your server's https address.
3. (Recommended) add your signing key as secrets `I_KEYSTORE_BASE64`, `I_KEYSTORE_PASSWORD`, `I_KEY_ALIAS`, `I_KEY_PASSWORD`. Keep using the same key forever, or phones can't update.
4. Tag and push:

   ```bash
   git tag v1.0.1 && git push origin v1.0.1
   ```

GitHub Actions builds `i-v1.0.1.apk` and attaches it to a Release. When the app starts, it checks the latest Release and offers the download.

Because the UI is loaded from the server, **most changes (screens, colours, features) need no new APK**: redeploy the server and every phone gets them. A new APK is only needed for native changes (widget, permissions, icon).

## Build the APK yourself

Open `android/` in Android Studio, or:

```bash
cd android && ./gradlew assembleDebug    # app/build/outputs/apk/debug/app-debug.apk
```

The emulator reaches your computer at `10.0.2.2`, which is the default `I_APP_URL`.
