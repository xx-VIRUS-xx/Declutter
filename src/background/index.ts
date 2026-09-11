import { DeclutterMessage } from "../shared/types";

/**
 * MV3 background service worker.
 *
 * Responsibilities in this MVP are intentionally minimal: relay
 * RULE_ADDED notifications (for any future cross-tab/badge use) and act as
 * a message pass-through point. All actual rule storage/application lives
 * in the content script + chrome.storage.local; the background script does
 * not itself read page content, matching the "no telemetry / no DOM to a
 * server" constraint trivially since it never touches the DOM at all.
 */
chrome.runtime.onMessage.addListener((message: DeclutterMessage, sender) => {
  if (message.type === "RULE_ADDED") {
    // Placeholder for future cross-tab orchestration (e.g. badge count).
    // Intentionally a no-op beyond logging in dev; no network calls.
    void sender;
  }
  // Returning nothing/false: no async response needed from background here.
  return false;
});
