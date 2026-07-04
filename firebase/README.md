# Firebase setup

One Firebase project backs TOTS (on the same Google Cloud project as the
conductor). Enable: **Realtime Database**, **Firestore**, **Anonymous Auth**,
**Cloud Run**, **Cloud Scheduler**.

Why two databases: RTDB holds fast-changing, latency-sensitive data
(channel state, presence) and provides `onDisconnect` + a server-time
offset; Firestore holds durable/queryable data (users, messages, votes;
leaderboard history later).

## Deploy the rules

```bash
firebase deploy --only database,firestore:rules
```

(Point `firebase.json` at `firebase/database.rules.json` and
`firebase/firestore.rules`, or paste them in the console.)

## Posture

- Clients **read** `/app/config`, `/channels/*`, `/tracks` — never write them.
- Clients **write only their own** `/presence/{uid}` (RTDB) and
  `/users/{uid}`, messages, votes (Firestore, own-uid + validation).
- The channel timeline is written **only** by the conductor's Admin SDK.
- One vote per user per track-play is enforced by deterministic vote doc
  ids (`<playId>:<uid>`) with create-only rules.
