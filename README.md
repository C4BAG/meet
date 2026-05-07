# meet (C4BAG fork)

This is the C4BAG fork of [`livekit-examples/meet`](https://github.com/livekit-examples/meet).
It is **not** a redistribution of LiveKit Meet — it is a thin
deployment shell for one specific job:

> **Smoke-test our XPhone Connect server infrastructure
> (WebClientApi + Axon MediaServer) using a known-good
> LiveKit-provided client.**

If a participant cannot join a room here, the issue is on our
side — not in the client. Treat regressions in this app as
regressions in our backend.

## What is different from upstream

Everything in `app/custom/`, `lib/`, and the rest of the LiveKit
conference UI is the **upstream code, untouched**, so we can keep
pulling future improvements from `livekit-examples/meet` without
hand-merging UI changes.

The only deviations from upstream:

| Path | Status | Why |
|---|---|---|
| `app/lobby/` | **Added** | Custom lobby page that fetches a JWT from the WebClientApi (`/api/v10.2/meeting/getAnonymousMediaServerToken`) and forwards to the upstream `/custom/` route. URLs default to the page's host (`<origin>/XPhoneConnect/...`) and are user-overridable in the lobby UI. |
| `next.config.js` | **+2 lines** | `output: 'export'` and `trailingSlash: true` — turn the app into a pure-static deploy. |
| `app/custom/page.tsx` | **Modified** | Async server component (`await searchParams`) converted to a client component using `useSearchParams` + `<Suspense>`. Behaviour identical; required by `output: 'export'`. |
| `package.json` | **build script** | Appends `&& node scripts/post-build-redirect.mjs` so `/` → `/lobby/` after build. |
| `app/api/`, `app/rooms/`, `middleware.ts` | **Deleted** | Token-signing API routes, the dynamic `/rooms/[roomName]` route that consumes them, and our former `/` rewrite middleware. All incompatible with static export and unused by our flow (the WebClientApi signs the JWT instead of `/api/connection-details`). |
| `scripts/post-build-redirect.mjs` | **Added** | Writes a meta-refresh redirect into `out/index.html` so the deploy root lands on `/lobby/`. |

That is the entire diff from upstream.

## Working in this fork — guidelines

**Goal: keep merges from upstream as boring as possible.**

1. **Do not touch any other upstream file.** If you find yourself
   wanting to edit anything in `app/`, `lib/`, `styles/`, or any
   asset that came from upstream, stop and ask whether the change
   really belongs here. The default answer is no.
2. **Add, don't modify.** New behaviour goes in new files (new
   routes under `app/<our-name>/`, new helpers in new files).
3. **No new server-side code.** No middleware, no route handlers
   (`app/api/...`), no async server components reading
   `searchParams` — they break `output: 'export'`. Anything
   server-side belongs on the WebClientApi, not here.
4. **No `.env`-based config.** This app must run from any static
   host without per-deployment build steps. Read configuration
   from `window.location` or from the lobby UI (persisted in
   `localStorage`), never from `process.env.NEXT_PUBLIC_*`.
5. **Keep the upstream `app/page.tsx` reachable but unused.** It
   stays in the bundle so upstream changes to it merge cleanly;
   our redirect just hides it from end users.
6. **Pulling upstream**: expect delete/modify conflicts on the
   files in the table above. Always resolve "keep deleted" for
   `app/api/` and `app/rooms/`, and re-apply the small edits to
   `next.config.js`, `package.json`, and `app/custom/page.tsx`.
   The marker comment in `app/custom/page.tsx` makes that one
   easy to find.

## Build & deploy

```sh
pnpm install
pnpm build      # runs `next build` then writes the / -> /lobby/ redirect
```

Deploy the contents of `out/` to any static host (IIS, Nginx,
served from the WebClientApi as static content, etc.).

```
out/
  index.html        meta-refresh to /lobby/
  lobby/            our landing page
  custom/           upstream conference UI (consumes liveKitUrl + token)
  _next/static/     JS / CSS chunks
  ...
```

No Node.js process needs to run on the target.

## Runtime requirements (server side)

For the lobby's "Join" to actually return a token, the
WebClientApi deployment must have:

- `AnonymousMediaServerTokenEnabled` feature flag set to `true`
  (this is a debug-only flag — see WebClientApi `appsettings.json`).
- CORS configured so the origin where this static app is hosted
  is an allowed origin (the token is fetched from the browser).
- The Axon MediaServer module configured to sign tokens against
  the same LiveKit server the lobby's `LiveKit URL` points at.

If those are not in place, the lobby surfaces the WebClientApi
HTTP status / response in the error banner.

## Using a different LiveKit / WebClientApi

The lobby has a "Server configuration" panel for both URLs.
Defaults are derived from `window.location` at runtime:

```
LiveKit URL:        wss://<host>/XPhoneConnect/ReverseProxy/MediaServer
WebClientApi base:  <origin>/XPhoneConnect/WebClientApi
```

Overrides are persisted in `localStorage` only when they differ
from the host-derived defaults — so moving the deployment to a
new host picks up new defaults instead of carrying stale URLs.

## Upstream

- Upstream repo: <https://github.com/livekit-examples/meet>
- Upstream license and credits: see `LICENSE` (unchanged).
