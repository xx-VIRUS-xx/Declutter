/**
 * Core data model for Declutter.
 *
 * A HideRule targets a single element (by CSS selector) on a given origin.
 * Rules are stored per-origin in chrome.storage.local under the key
 * `declutter:rules:<origin>`.
 */
export type HideRule = {
  id: string;
  origin: string;
  selector: string;
  createdAt: number;
  enabled: boolean;
};

/** Prefix for per-origin rule storage keys. */
export const RULES_KEY_PREFIX = "declutter:rules:";

/** Build the chrome.storage.local key for a given origin's rule list. */
export function rulesKeyForOrigin(origin: string): string {
  return `${RULES_KEY_PREFIX}${origin}`;
}

/**
 * Messages exchanged between popup, background, and content scripts.
 * Kept as a small closed union so handlers can switch exhaustively.
 */
export type DeclutterMessage =
  | { type: "GET_STATE" }
  | { type: "STATE"; origin: string; ruleCount: number; editMode: boolean }
  | { type: "ENTER_EDIT_MODE" }
  | { type: "EXIT_EDIT_MODE" }
  | { type: "RESTORE_PAGE" }
  | { type: "CLEAN_PAGE" }
  | { type: "RULE_ADDED"; rule: HideRule }
  | { type: "RULES_CHANGED"; origin: string };
