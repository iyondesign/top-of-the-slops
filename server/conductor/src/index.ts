import http from 'node:http';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

import { Conductor } from './conductor.js';
import { hydratePool } from './pool.js';

/**
 * Cloud Run entry. Deploy singleton:
 *
 *   gcloud run deploy tots-conductor --source server/conductor \
 *     --min-instances=1 --max-instances=1 --no-cpu-throttling \
 *     --set-env-vars FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com
 *
 * Watchdog (idempotent recovery, fable spec):
 *
 *   gcloud scheduler jobs create http tots-watchdog \
 *     --schedule="* * * * *" --uri="https://<service-url>/tick" --http-method=POST
 */
const app = initializeApp({
  credential: applicationDefault(),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase(app);
const firestore = getFirestore(app);
const conductor = new Conductor(db, firestore);

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200).end('ok');
    return;
  }
  if (req.url === '/tick') {
    conductor
      .tick()
      .then((outcome) => res.writeHead(200).end(outcome))
      .catch((err) => {
        console.error('[conductor] tick failed', err);
        res.writeHead(500).end('error');
      });
    return;
  }
  if (req.url === '/hydrate' && req.method === 'POST') {
    // Re-hydrate the pool after the admin edits poolTrackIds.
    hydratePool(db)
      .then(() => res.writeHead(200).end('hydrated'))
      .catch((err) => {
        console.error('[conductor] hydrate failed', err);
        res.writeHead(500).end('error');
      });
    return;
  }
  res.writeHead(404).end();
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, async () => {
  console.log(`[conductor] listening on :${port}`);
  try {
    const hasTracks = (await db.ref('tracks').limitToFirst(1).get()).exists();
    if (!hasTracks) await hydratePool(db);
    await conductor.start();
  } catch (err) {
    console.error('[conductor] startup failed', err);
    process.exitCode = 1;
  }
});
