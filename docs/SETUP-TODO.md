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

## 2. Google Cloud / Firebase (status: ✅ web config wired — console toggles remain)

Project **`top-of-the-slops`** exists and its web config ships as committed
defaults in `src/firebase.ts`. Remaining console steps
([console.firebase.google.com](https://console.firebase.google.com) →
top-of-the-slops):

- [ ] **Build → Authentication → Sign-in method**: enable
  - **Anonymous** (the instant-entry funnel — do this first),
  - **Google** (works immediately),
  - **Email/Password** (direct accounts),
  - **Apple** (add once the Apple Developer account is approved).
- [ ] **Build → Realtime Database** → create → paste rules from
  `firebase/database.rules.json`. If the console shows a URL other than
  `https://top-of-the-slops-default-rtdb.firebaseio.com`, set
  `EXPO_PUBLIC_FIREBASE_DATABASE_URL` in `.env`.
- [ ] **Build → Firestore** → create → paste rules from
  `firebase/firestore.rules`.

With Anonymous enabled, identity runs on real Firebase Auth on next app
start; "Keep your cred" (Google/email) works as soon as those providers are
on. Every backend failure falls back to the local profile — the app never
blocks on console state.

**Going fully live** (real shared room):
- [ ] Deploy `server/conductor/` to Cloud Run on this project (its README
  has the two gcloud commands; uses the runtime service account — no key
  file).
- [ ] Set `EXPO_PUBLIC_LIVE_CHANNEL=1` — flips the channel, chat, presence,
  and votes from the stub to RTDB/Firestore.
