# Architecture

A Manifest V3 browser extension that lets a user hide page elements and remembers those choices per site. Everything runs locally; there are no network calls.

## System context

```
 Popup (action UI)                     Content script (in each http/https page)
 popup/index.ts   -- chrome.tabs.sendMessage -->  content/index.ts
   GET_STATE | ENTER_EDIT_MODE |                    |-- picker.ts      element picker (hover + click)
   EXIT_EDIT_MODE | CLEAN_PAGE |                    |-- shared/selector.ts   element -> CSS selector
   RESTORE_PAGE                                     |-- shared/heuristics.ts deterministic clutter scan
                                                    |-- shared/storage.ts    chrome.storage.local
 Background service worker                          `-- apply.ts       <style> injection + MutationObserver
 background/index.ts  (RULE_ADDED relay, no-op)
```

## Components

| Module | Responsibility |
|---|---|
| `content/index.ts` | Orchestrator: loads rules for `window.location.origin`, handles popup messages, owns edit mode and "Clean this page" |
| `content/picker.ts` | Hover highlight and click capture for edit mode |
| `content/apply.ts` | `applyRules` writes one `<style id="declutter-hide-style">`; `RuleReapplier` re-injects it if a single-page app strips it during navigation (debounced) |
| `shared/selector.ts` | `generateSelector`: walks up the ancestors, preferring stable id, then `data-testid`-style attributes, then stable classes, then `:nth-child`; filters framework-generated ids and hashed class names; stops at the first selector that matches exactly one element |
| `shared/heuristics.ts` | `scanForClutter`: conservative rules (promo labels, large fixed/sticky banners, newsletter overlays, cookie banners, "recommended" sections); never flags protected content (nav, main, forms, inputs, buttons) |
| `shared/hiding.ts` | Pure `buildHideCss`: `selector { display: none !important; }` per enabled rule |
| `shared/storage.ts` | Thin `chrome.storage.local` wrapper: get, save, add, remove, enable/disable, clear; keyed `declutter:rules:<origin>` |
| `shared/types.ts` | `HideRule` and the message union shared by popup, content and background |
| `background/index.ts` | Minimal service worker reserved for future cross-tab work |

## Data model

```ts
type HideRule = { id: string; origin: string; selector: string; createdAt: number; enabled: boolean };
```

Rules are an array per origin in `chrome.storage.local`.

## Core flow: hide an element and keep it hidden

1. User clicks **Edit layout**; the popup sends `ENTER_EDIT_MODE` to the tab's content script.
2. Picker highlights hovered elements; on click, `generateSelector` produces a selector and a `HideRule` is saved for the origin.
3. `RuleReapplier.setRules` rebuilds the stylesheet, so the element disappears immediately. Picker stays active for more picks.
4. On every later load the content script reads the origin's rules and injects the same stylesheet.
5. **Restore page** clears the origin's rules and removes the stylesheet.

## Key design decisions

- **CSS hiding, not DOM removal.** Hiding is additive and reversible: removing the style element restores the page and the page's own scripts keep a consistent DOM.
- **Selectors, not element references.** Because the stylesheet is global, elements added later that match a selector are hidden by the browser's CSS engine with no observer work.
- **Observer only for the stylesheet.** The `MutationObserver` exists to survive SPAs that rewrite `<head>`, and is debounced to avoid thrashing.
- **Stability-ranked selectors.** Prefer attributes that survive redeploys; reject ids and classes that look generated; disambiguate repeated siblings.
- **Deterministic cleanup.** "Clean this page" is rules, not a model: predictable, explainable, and offline.
- **Per-origin storage.** Rules are keyed by origin, so one site's rules never affect another.
- **Privacy by construction.** No telemetry, no remote calls, no account. The background worker never touches page content.
- **Pure logic split out.** Selector generation, CSS building, heuristics and storage are testable without a live browser (`jsdom` and a fake `chrome.storage.local`).

## Scaling and operational notes

- Storage is bounded by the user's own rules; `chrome.storage.local` quotas apply.
- `host_permissions` cover all http(s) sites, which is required for per-site rules but is a broad permission to justify in a store listing.

## Known limitations

- Structural `:nth-child` fallbacks can break when a site's layout changes.
- Rules are per origin, not per path.
- No sync across devices or browsers; Chromium only.
- Background worker is a placeholder.
