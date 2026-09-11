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

Requirements: Node.js 20+

```bash
npm install
npm run build
npm test
```

Load `dist/` as an unpacked extension in Chrome at `chrome://extensions` with Developer Mode enabled.

## Architecture

`content/` runs in the page and owns element selection/application.

`background/` owns extension messaging and future cross-tab orchestration.

`popup/` is the lightweight control surface.

`shared/` contains storage types and utilities.

## Privacy principle

The first release should work without sending page contents anywhere. Do not add telemetry or remote AI calls unless explicitly designed, disclosed, and opt-in.
