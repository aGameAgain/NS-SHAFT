# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NS-SHAFT is a 2D falling-platform game in modern ES modules + Canvas. The same code runs in the browser and as a **WeChat mini game** (微信小游戏). Detailed logic walkthrough: `docs/ARCHITECTURE.md`; roadmap: `docs/ROADMAP.md`.

## Commands

```bash
npm run dev               # Vite dev server: http://localhost:5173 (web) and /wechat.html (WeChat runtime simulator)
npm run build             # dist/web + dist/wechat
npm run build:wechat      # dist/wechat/{game.js,game.json,project.config.json} → import into WeChat DevTools
npm run dev:wechat        # unminified WeChat build in watch mode
npm run lint              # ESLint, including layer rules
npm run test:unit         # Vitest (node env) + WeChat bundle sandbox test
npm run test:coverage     # coverage; src/core must stay >= 90%
npm run test:e2e          # Playwright: chromium, firefox, webkit, mobile-chrome
npx playwright test --project=chromium   # single project
npm test                  # lint + unit + e2e
```

First-time e2e setup: `npx playwright install`.

## Architecture

Layered; dependency direction `entries → platform/app → render → core`, enforced by ESLint (`no-restricted-imports` + no host globals via `no-undef`).

- `src/core/` — pure game logic, **no host APIs at all** (no `window`, `document`, `wx`, `setTimeout`, `console`).
  - `config.js` all tuning numbers (per fixed tick), `rng.js` seeded RNG,
    `GameState`, `Player`, `Platform`/`PlatformManager`, `Physics` (swept landing, ceiling, bounds),
    `GameSession` (one run: `step(input) → events`, deterministic for seed + inputs).
- `src/render/Renderer.js` — draws world, HUD, overlays, touch buttons, debug overlay using only the common `CanvasRenderingContext2D` subset (works on WeChat canvas).
- `src/app/` — platform-agnostic app: `GameApp` (scene state machine title/playing/paused/gameover, fixed-timestep loop at 60 ticks/s, input mapping, best depth storage, debug hooks `getSnapshot()`/`advance(n)`), `InputState`, `layout.js` (logical resolution with fixed width 400, safe area, touch buttons).
- `src/platform/` — adapters implementing the `PlatformAdapter` interface (see JSDoc in `GameApp.js`): `web.js` (DOM, Pointer Events, localStorage), `wechat.js` (the only place touching `wx.*`).
- `src/entries/` — `web.js` (index.html, exposes `window.__NS_SHAFT__`), `wechat.js` (bundled to `game.js`, exposes `GameGlobal.__NS_SHAFT__`).
- `dev/wx-shim.js` — browser implementation of the `wx` APIs we use; `wechat.html` runs the real WeChat entry through it.
- `platforms/wechat/` — mini game project templates copied into `dist/wechat`.

### Coordinate system
World x ∈ [0, 400), y grows downward. Camera `depth` = world y at top of the view, +0.5 per tick. Screen y = world y − depth. Logical view height derives from the device aspect ratio; `Renderer` scales with `setTransform(scale × dpr)`.

### Platform types
Normal (green), Moving (purple, carries the player via `platform.dx`), Breaking (yellow, breaks 60 ticks after landing), Spike (red, pass-through, 1 HP per tick of contact), Spring (blue, launches at `JUMP_POWER × 1.5`). Spawn mix by depth tiers in `DIFFICULTY_TIERS` (>100, >200, >500).

### Key constants (`src/core/config.js`)
`TICK_RATE = 60`, `WORLD_WIDTH = 400`, `SCREEN_SCROLL_SPEED = 0.5`, `PLAYER.GRAVITY = 0.25`, `PLAYER.JUMP_POWER = 8`, `PLATFORM.GAP = 150`, `PLATFORM.WIDTH = 80`, `DAMAGE.SPIKE = 1`, `DAMAGE.CEILING = 10`, `MAX_LIVES = 100`.

## Rules when changing code

- Never use host globals in `src/core`, `src/render`, `src/app`; add a method to the platform adapter instead (and implement it in both `web.js` and `wechat.js`, plus `dev/wx-shim.js` / `tests/helpers/fakes.js` fakes).
- Game logic is tick-based; never use `setTimeout`/wall-clock time for gameplay. Use counters in ticks.
- Use the session's seeded `rng`, never `Math.random()` in gameplay code paths (only `randomSeed()`).
- WeChat bundle must stay ES2015, single-file, free of `window`/`document`; `tests/wechat/bundle.test.js` guards this.
- Bug fixes come with a regression test (`tests/unit/GameSession.test.js`, `GameApp.test.js`).
- E2E tests read state via `__NS_SHAFT__.getSnapshot()`, use `?seed=` and `expect.poll`; avoid fixed sleeps for assertions.

## CI

`.github/workflows/ci.yml`: `check` (lint, unit + coverage, build; uploads `web-dist`, `wechat-minigame`, `coverage`) → `e2e` matrix of 4 Playwright projects against `vite preview` of `dist/web` → `deploy` GitHub Pages on `main` pushes only.
