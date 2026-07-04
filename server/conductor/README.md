# TOTS Conductor

The channel's single source of truth: a **singleton** Cloud Run service that
owns `/channels/global/state` in RTDB. It advances the curated pool through
track boundaries, tallies live votes, aggregates presence into
`listenerCount`, and pauses/resumes on the `isLive` failsafe. It never
touches audio.

## Guarantees

- **Exactly one advance per boundary.** Deploy with
  `--min-instances=1 --max-instances=1`; the version-guarded RTDB
  transaction in `advance()` makes a racing writer abort.
- **Idempotent recovery.** Cloud Scheduler POSTs `/tick` every minute; it
  only advances if `nextAdvanceAtMs + advanceGraceMs` is genuinely past.
- **No live catalog calls at advance time.** `/tracks/{id}` (including
  `durationMs`) is pre-hydrated at boot or via `POST /hydrate`.

## Run locally

```bash
npm install
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json \
FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com \
npm run dev
```

## Deploy

```bash
gcloud run deploy tots-conductor --source . \
  --min-instances=1 --max-instances=1 --no-cpu-throttling \
  --set-env-vars FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com

gcloud scheduler jobs create http tots-watchdog \
  --schedule="* * * * *" \
  --uri="https://<service-url>/tick" --http-method=POST
```

Env vars: `FIREBASE_DATABASE_URL` (required), `APPLE_DEVELOPER_TOKEN`
(catalog metadata for the admin pool), `POOL_SEARCH_TERM` (dev-only pool
seeding), `APPLE_STOREFRONT` (default `us`), `VOTES_ENABLED=1` (M4: turns on
boo-to-skip + hype-to-replay).

## Endpoints

| Route | Purpose |
| --- | --- |
| `GET /healthz` | liveness |
| `POST /tick` | Cloud Scheduler watchdog (idempotent) |
| `POST /hydrate` | re-hydrate `/tracks` after editing `poolTrackIds` |
