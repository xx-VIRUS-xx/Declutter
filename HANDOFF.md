# Declutter - Codex Handoff

## Mission
Build the first working MVP of Declutter, a Chrome/Chromium Manifest V3 extension that lets a user hide clutter from arbitrary webpages and remember those choices per site.

## Current status

Fresh scaffold. No implementation is assumed to exist.

## Product definition

Core loop:
1. User opens a webpage.
2. Opens Declutter.
3. Clicks **Edit layout**.
4. Moves over an element and selects it.
5. Extension hides the element immediately.
6. User exits edit mode.
7. Rule is stored against the page origin.
8. On later navigation/page load, the rule is reapplied.
9. User can disable/delete a rule and restore the page.

Secondary action:
- **Clean this page** may initially run deterministic heuristics only. Do not use an LLM in MVP.

## Technical constraints

- Manifest V3.
- TypeScript preferred.
- Minimal dependencies.
- Chrome APIs only for MVP.
- Use `chrome.storage.local`.
- Never transmit page content or DOM to a server.
- Prefer CSS hiding (`display:none !important`) over removing nodes.
- Avoid breaking forms, navigation, authentication, checkout, or primary content.
- Handle dynamic SPAs with a MutationObserver, but debounce it.
- Rules must survive reloads and client-side route changes.

## Suggested data model

```ts
export type HideRule = {
  id: string;
  origin: string;
  selector: string;
  createdAt: number;
  enabled: boolean;
};
```

Storage key:

```text
declutter:rules:<origin>
```

If selector generation is fragile, improve it with a selector strategy using stable IDs/classes and a structural fallback. Avoid blindly persisting generated CSS paths that depend on volatile React/Vue class names.

## UI requirements

Popup:
- Current site hostname
- `Clean this page`
- `Edit layout`
- `Restore page`
- Small status/count of active rules

Picker:
- Highlight hovered element
- Click to hide
- Escape cancels
- Do not interfere with normal page clicks outside picker mode

Options are not required for v0.1.

## Heuristic cleanup candidates

Only hide when confidence is high. Candidate signals:
- elements with obvious ad/promotional labels
- fixed/sticky banners occupying substantial viewport area
- newsletter/signup overlays
- cookie/consent overlays only when clearly non-essential to interaction
- recommendation sections after primary content
- repeated sidebar/card groups

Do NOT automatically hide:
- main/article content
- primary navigation
- forms
- buttons required for the page's primary task
- login/authentication UI
- payment/checkout UI

## Acceptance criteria

- `npm run build` succeeds.
- Extension loads unpacked in Chrome without manifest errors.
- On any ordinary test webpage, Edit Layout can select and hide an element.
- Reloading the page restores the hidden element automatically.
- Restore page removes all saved rules for the current origin and reloads/reveals the page.
- Dynamic content added after load is handled when matching a saved selector.
- No network request is required for core functionality.
- Include unit tests for selector/storage logic where practical.

## Suggested implementation order

1. Create package/TypeScript build setup.
2. Add Manifest V3.
3. Implement shared storage API and types.
4. Implement content script rule application.
5. Implement selector generation.
6. Implement picker/highlight interaction.
7. Implement popup messaging and controls.
8. Add MutationObserver handling.
9. Add basic deterministic cleanup heuristics behind `Clean this page`.
10. Add tests and update README with exact build/load instructions.

## Important engineering judgment

Do not overbuild the AI layer. The differentiator eventually becomes intelligent intent-aware decluttering, but the first product must prove that persistent UI control feels useful with zero model cost.

## Definition of done for this handoff

Leave a runnable repository with source, tests, build configuration, README, and this handoff. The next Codex session should be able to continue from the repo without needing product context from chat history.
