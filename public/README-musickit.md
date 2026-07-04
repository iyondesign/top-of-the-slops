# Self-hosted MusicKit fallback

If Apple's CDN copy of MusicKit is blocked/neutered by an extension or
corporate proxy, drop a same-origin copy here:

    curl -o public/musickit.js https://js-cdn.music.apple.com/musickit/v3/musickit.js

The loader tries the CDN first, then `/musickit.js`. (musickit.js itself is
gitignored — fetch it locally, don't commit Apple's bundle.)
