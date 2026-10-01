# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BRB Screen is a client-side Twitch clip player for streamers to entertain audiences during breaks. It runs entirely in the browser with no backend — clips are fetched from Twitch's public GraphQL API. Live at https://brbscreen.com. Licensed CC BY 4.0 (must credit IRLServer.com).

## Commands

- `npm run dev` — Start dev server (port 3000, auto-opens browser)
- `npm run build` — Production build to `dist/`
- `npm run preview` — Preview production build

No test runner or linter is configured.

## Architecture

Vanilla JavaScript ES modules, bundled with Vite. No frameworks, no runtime dependencies.

### Entry Flow

`index.html` → `src/main.js` (`ClipPlayerApp` class)

Route detection is URL-parameter based:
- **With `channelName` param** → Player mode: loads clips and starts playback
- **Without `channelName` param** → Landing page with URL generator modal

The app instance is exposed as `window.clipPlayerApp` for debugging.

### Module Structure

- **`src/api/twitch.js`** — Twitch GraphQL integration using persisted queries (no auth needed). Client-ID is hardcoded. Twitch sorts clip listings by views and ends every listing at about 1100 clips, so `fetchClipsCards` takes an optional `startAt`/`endAt` window (built by `clipDateRange` from `days`). The window is undocumented: Twitch's own site doesn't send it, but the criteria input accepts it and filters server side. Clip playback URLs require per-clip signature/token fetched via `getClipPlaybackUrl`.

- **`src/player/playlist-manager.js`** — Plays from the first page of every channel's date window, then pages through the rest of the window in the background. If Twitch rejects the date window, it falls back to the all time listing and keeps paging until `minInitialClips` (50) clips match, since a tiny first pool would open every session with the same top clips. When a cached clip list exists, playback starts from it instantly and the full pool is refetched in the background. Pools cut short by a failed page are never cached. Handles multi-channel support (comma-separated names), deduplication, filtering by date range/view count, and shuffle strategy selection.

- **`src/player/video-player.js`** — HTML5 video wrapper with preloading system. Uses a hidden `clip-preloader` element to buffer the next clip for seamless transitions. Includes retry logic, countdown timer, and automatic advancement on clip end.

- **`src/ui/ui-manager.js`** — Controls loading screen, clip info overlay, periodic logo animation (every N clips), countdown timer display.

- **`src/ui/generator.js`** — Landing page form that builds player URLs from user-selected options. Includes popular streamer quick-buttons and copy/test functionality.

- **`src/utils/array.js`** — Four shuffle algorithms: Fisher-Yates (`shuffle`), `stratifiedShuffle` (view count quartiles), `weightedShuffle` (diversity factor 0.3), `smartShuffle` (auto-selects based on clip count: >200→stratified, >50→weighted, else random).

- **`src/utils/clip-cache.js`**: caches each channel/days/views clip pool in `localStorage` for 7 days. Bump `KEY_PREFIX` when cached pools stop being valid. Every storage call is guarded, since browser sources can block storage.

- **`src/utils/url.js`** — URL parameter parsing with automatic type coercion (string booleans → bool, numeric strings → float).

### Key URL Parameters

`channelName` (required, comma-separated for multi-channel), `days` (default 900), `views` (min views, default 0), `shuffle` (smart|stratified|weighted|random), `volume` (0-1), `showLogo`, `logoFreq`, `showInfo`, `infoScale` (overlay size multiplier, default 1), `showTimer`.

## Deployment

Deployed to Vercel. SPA routing configured — all paths rewrite to `/index.html`. No environment variables needed.
