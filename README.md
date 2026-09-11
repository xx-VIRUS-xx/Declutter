# Declutter

A browser extension that lets users remove distracting UI elements from web apps and persist those preferences per site.

## Product goal

Make the web feel like a user-owned interface rather than a pile of UI decisions made by every website.

### MVP

- Manifest V3 Chrome/Chromium extension
- Popup with **Clean this page** and **Edit layout**
- Element picker for manually hiding elements
- Persist rules by origin
- Apply saved rules on subsequent page loads
- Safe reversible hiding using CSS rather than destructive DOM deletion
- Local-only storage for MVP
- No AI/API dependency in v0.1

### Future

- Heuristic clutter detection
- AI-assisted "hide everything except what matters"
- Named layouts/profiles
- Per-site presets
- Firefox/Safari support
- Optional sync/account layer

## Development

Requirements: Node.js 20+ (developed/verified on Node 24).

```bash
npm install
npm run build
npm test
```

`npm run build` type-checks with `tsc --noEmit`, bundles `background`,
`content`, and `popup` entry points with esbuild, and copies
`public/manifest.json`, `public/icons/`, and the popup HTML/CSS into `dist/`.
`npm run watch` runs the esbuild step in watch mode for iterative development
(re-run `npm run copy-assets` if you only change manifest/popup HTML/CSS).

### Load the extension in Chrome

1. Run `npm run build` (this produces a self-contained `dist/` directory).
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `dist/` folder (not the repo root).
5. The Declutter icon appears in the toolbar. Pin it for easy access.
6. After any source change, re-run `npm run build` and click the refresh
   icon on the Declutter card in `chrome://extensions`.

### Using it

1. Open any `http(s)://` webpage.
2. Click the Declutter icon to open the popup.
3. Click **Edit layout** — the button switches to "Done editing" and hovered
   elements on the page highlight in red.
4. Click an element to hide it immediately (CSS `display:none !important`);
   the picker stays active so you can hide multiple elements in one pass.
5. Press **Escape** on the page, or click **Done editing** in the popup, to
   leave edit mode.
6. Reload the page — hidden elements stay hidden (rules are re-applied from
   `chrome.storage.local`, keyed by page origin).
7. **Clean this page** runs conservative, deterministic heuristics (ad/promo
   labels, large fixed/sticky banners, newsletter overlays, cookie-consent
   banners, "recommended" sections) and hides only high-confidence matches —
   no AI/network calls involved.
8. **Restore page** deletes all saved rules for the current origin and
   reloads the tab.

## Architecture

`content/` runs in the page and owns element selection, selector generation,
CSS-based hiding/restoring, the element picker, the MutationObserver-based
re-applier, and the deterministic "Clean this page" scan. It listens for
messages from the popup (`GET_STATE`, `ENTER_EDIT_MODE`, `EXIT_EDIT_MODE`,
`RESTORE_PAGE`, `CLEAN_PAGE`).

`background/` is a minimal MV3 service worker reserved for future
cross-tab orchestration; it does not touch page content or storage directly
in this MVP.

`popup/` is the lightweight control surface (hostname, active rule count,
Clean this page / Edit layout / Restore page buttons). It talks to the
active tab's content script via `chrome.tabs.sendMessage`.

`shared/` contains the `HideRule` data model, `chrome.storage.local`
wrappers (`src/shared/storage.ts`), CSS-hiding helpers
(`src/shared/hiding.ts`), the selector-generation strategy
(`src/shared/selector.ts`), and the clutter-detection heuristics
(`src/shared/heuristics.ts`) — all pure/unit-testable independent of a live
browser where possible.

### Data model

```ts
type HideRule = {
  id: string;
  origin: string;
  selector: string;
  createdAt: number;
  enabled: boolean;
};
```

Rules are stored in `chrome.storage.local` under the key
`declutter:rules:<origin>`, as an array of `HideRule`.

### Selector generation strategy

For a clicked element, `generateSelector` walks up the ancestor chain and,
at each level, prefers (in order): a stable `id` (numeric-only or
framework-generated-looking ids like `:r0:`/`radix-*` are rejected), a
`data-testid`/`data-test`/`data-qa`/`data-cy` attribute, stable class names
(hash-like class names such as `css-1a2b3c` or `sc-xxxxx` are filtered out),
and finally a structural `tag:nth-child(n)` fallback. Whichever segment is
chosen, it is disambiguated with `:nth-child` if it would otherwise match
more than one sibling (e.g. repeated card/list-item structures). The walk
stops as soon as the accumulated selector uniquely matches one element.

### Tests

Unit tests (`node --test` via `tsx`) live in `tests/` and cover:
- `tests/storage.test.ts` — rule CRUD against a fake in-memory
  `chrome.storage.local`.
- `tests/selector.test.ts` — selector generation against real DOM structures
  (via `jsdom`), including volatile-id/class rejection and sibling
  disambiguation.
- `tests/hiding.test.ts` — CSS generation from rule sets.
- `tests/heuristics.test.ts` — "Clean this page" clutter classification,
  including that protected content (nav/main/form/inputs/buttons) is never
  flagged.

## Privacy principle

The first release should work without sending page contents anywhere. Do not add telemetry or remote AI calls unless explicitly designed, disclosed, and opt-in.
