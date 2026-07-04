# Setup TODO — the two credentials that turn TOTS live

Everything in the app is wired and waiting on these. Each activates
independently; nothing breaks while the other is pending.

## Security ground rules (read first)

**Safe to share / put in `.env`** (client-side by design):
- The **Firebase web app config** (`apiKey`, `authDomain`, `projectId`,
  `databaseURL`, `storageBucket`, `messagingSenderId`, `appId`). Despite the
  name, the Firebase web `apiKey` is not a secret — it only identifies the
  project; security comes from the Auth + database rules (already written in
  `firebase/`).
- The **Apple Music developer token** (it's designed to ship in clients;
  short-lived and scoped to catalog/playback).

**NEVER paste into chat / never commit:**
- Google Cloud **service-account JSON** (the conductor uses the runtime
  service account on Cloud Run instead — no key file needed).
- The Apple **`.p8` private key** (keep it on your machine; only the minted
  token leaves it).
- **Gemini / AI Studio API keys** — those belong server-side only (the
  moderation/VJAI functions later), set as Cloud Run/Functions env vars via
  `gcloud`, not in the Expo app.

---

## 1. Apple Music (status: ⏳ developer account pending approval)

When the Apple Developer account is approved:

1. developer.apple.com → **Certificates, Identifiers & Profiles → Identifiers**
   → create a **Media ID** (e.g. `media.design.iyon.tots`).
2. **Keys** → create a key with **MusicKit** enabled, bound to that Media ID.
   Download the `.p8` file (one chance!) and note the **Key ID** (10 chars)
   and your **Team ID** (top-right of the membership page).
3. Mint the developer token (ES256 JWT, max 6 months):
   ```bash
   node scripts/mint-apple-developer-token.mjs \
     --key ./AuthKey_ABC123DEFG.p8 --kid ABC123DEFG --team YOURTEAMID
   ```
4. Put the output in `.env`:
   `EXPO_PUBLIC_APPLE_DEVELOPER_TOKEN=eyJhbGciOiJFUzI1NiIs…`
5. Restart Expo. The **Connect Apple Music** button now runs the real
   MusicKit sign-in; subscribers get full synced tracks.

Then (next increment): import your Apple Music library/playlists into the
candidate pool via the user token the sign-in grants.

## 2. Google Cloud / Firebase (status: ⏳ needs project + web config)

One Firebase project carries identity, the live channel, chat, and votes —
and later the Gemini moderation + AI layer on the same Google Cloud project.

1. [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project** (e.g. `top-of-the-slops`).
2. **Build → Authentication → Sign-in method**: enable
   - **Anonymous** (the instant-entry funnel),
   - **Google** (works immediately),
   - **Email/Password** (direct accounts),
   - **Apple** (needs the Apple Developer account — add once approved).
3. **Build → Realtime Database** → create (locked mode) → paste rules from
   `firebase/database.rules.json`.
4. **Build → Firestore** → create → paste rules from
   `firebase/firestore.rules`.
5. **Project settings → Your apps → Web app** → register → copy the config
   object and fill `.env` (`EXPO_PUBLIC_FIREBASE_*` — see `.env.example`).
6. Restart Expo. Identity switches to real Firebase Anonymous Auth; the
   "Keep your cred" buttons in the profile sheet go live (Google + email
   immediately; Apple after step 2's Apple provider).
7. (Later, server): deploy `server/conductor/` to Cloud Run on the same
   project — it uses the runtime service account, no key file.

## What to hand over in chat

Just the values from step 5 (the `EXPO_PUBLIC_FIREBASE_*` set) — or add
them to `.env` yourself locally and tell me; either works. Nothing else.
