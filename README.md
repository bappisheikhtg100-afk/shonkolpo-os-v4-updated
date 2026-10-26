# সংকল্প OS — Offline Android App (Capacitor)

100% offline. No CDN, no network calls. All libraries (Tailwind, React, Chart.js, Lucide) and all
fonts (Hind Siliguri, Inter, Baloo Da 2) are bundled inside `www/`. The JSX is pre-compiled into
`www/app.js`, so Babel is not needed at runtime (much faster startup).

## Get the APK (no local setup needed)

1. Create a new GitHub repository.
2. Upload every file in this zip to the repo root (keep the folder structure, including `.github/`).
3. Go to the **Actions** tab → the "Build Android APK" workflow runs automatically on push.
4. When it finishes, open the run → **Artifacts** → download `sonkolpo-os-apk`.
   It contains `app-debug.apk` and a **signed** `app-release.apk`.

> If Actions asks for permission the first time, click "I understand my workflows, go ahead and enable them".

## Release key (signing) — FREE, one-time setup

The release key is not something you buy — **you create it yourself, for free**. This
workflow does it for you on the first build:

1. Run the first build **without** any secrets. The workflow generates a release key
   and uploads an artifact named **`RELEASE-KEY-save-this`**.
2. Download that artifact. It contains:
   - `release.keystore` — your key file. **Back this up forever** (Google Drive, email to
     yourself, etc.). If you ever lose it, you can never update the app again.
   - `keystore-base64.txt` — the same key as text.
   - `passwords.txt` — the key password and alias.
3. In GitHub: repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add:
   - `RELEASE_KEYSTORE_BASE64` → paste the **full contents** of `keystore-base64.txt`
   - `RELEASE_KEYSTORE_PASSWORD` → the password from `passwords.txt`
   - `RELEASE_KEY_ALIAS` → the alias from `passwords.txt`
4. From the next build on, every APK is signed with that same key — the app keeps the
   same identity for all future updates, and it is ready for the Play Store later.
   (The "Install anyway" Play Protect warning still appears for installs outside the
   Play Store — that is normal; it goes away only in the Play Store.)

> Only cost that exists anywhere: a **one-time $25 Google Play Console account**, only if
> you publish to the Play Store. The key itself costs nothing.

> Note: if you already installed the old debug APK, uninstall it once before installing
> the signed release APK (Android blocks updates between different signatures).

## Local build (optional)

```bash
npm install
npx cap add android
npx capacitor-assets generate --android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Structure

- `www/index.html` — app shell (all links rewritten to local files)
- `www/app.js` — pre-compiled application code
- `www/native.js` — Android native glue (back button, status bar, haptics, share, notifications)
- `www/vendor/`, `www/fonts/` — bundled libraries and fonts
- `resources/` — source icon & splash, used to generate all Android densities
- `capacitor.config.json` — app id `com.bappi.sonkolpo`, app name সংকল্প OS

## Native features included

Hardware back button handling, status bar theming (follows dark mode), splash screen,
haptic feedback, native share, file save to Documents, local notifications, keyboard resize,
and Preferences storage — all available offline.

Data still lives in the WebView's localStorage, which persists on-device.

## v4 updates
- New minimal green theme, lighter typography, bottom navigation bar (Home, Study, Cards, Tasks, More)
- Redesigned flashcards (tap-to-reveal list + full-screen study mode)
- Bangla typing fixed (Android keyboard input capture disabled)
- JSON export saves to `Documents/Sonkolpo/` in the phone's file manager and opens the share sheet
- Alarms, schedule and task reminders are scheduled as system notifications, so they fire even when the app is closed
