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

- **`src/api/twitch.js`** — Twitch GraphQL integration using persisted queries (no auth needed). Client-ID is hardcoded. Three fetch strategies with fallback chain: `fetchMultipleCriteriaClips` (4 time filters in parallel) → `fetchDiverseClips` (paginated, up to 300+ clips) → `fetchClipsCards` (single filter). Clip playback URLs require per-clip signature/token fetched via `getClipPlaybackUrl`.

- **`src/player/playlist-manager.js`** — Two-phase loading: fast initial batch (~100 clips) for immediate playback, then background loading of remaining clips while playing. Handles multi-channel support (comma-separated names), deduplication, filtering by date range/view count, and shuffle strategy selection.

- **`src/player/video-player.js`** — HTML5 video wrapper with preloading system. Uses a hidden `clip-preloader` element to buffer the next clip for seamless transitions. Includes retry logic, countdown timer, and automatic advancement on clip end.

- **`src/ui/ui-manager.js`** — Controls loading screen, clip info overlay, periodic logo animation (every N clips), countdown timer display.

- **`src/ui/generator.js`** — Landing page form that builds player URLs from user-selected options. Includes popular streamer quick-buttons and copy/test functionality.

- **`src/utils/array.js`** — Four shuffle algorithms: Fisher-Yates (`shuffle`), `stratifiedShuffle` (view count quartiles), `weightedShuffle` (diversity factor 0.3), `smartShuffle` (auto-selects based on clip count: >200→stratified, >50→weighted, else random).

- **`src/utils/url.js`** — URL parameter parsing with automatic type coercion (string booleans → bool, numeric strings → float).

### Key URL Parameters

`channelName` (required, comma-separated for multi-channel), `days` (default 900), `views` (min views, default 0), `shuffle` (smart|stratified|weighted|random), `volume` (0-1), `showLogo`, `logoFreq`, `showInfo`, `showTimer`.

## Deployment

Deployed to Vercel. SPA routing configured — all paths rewrite to `/index.html`. No environment variables needed.
