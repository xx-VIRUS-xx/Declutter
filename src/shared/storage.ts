import { HideRule, rulesKeyForOrigin } from "./types";

/**
 * Thin wrapper around chrome.storage.local for HideRule persistence.
 * Isolated here so the logic is unit-testable without a real chrome.storage
 * implementation (tests inject a fake `chrome.storage.local`).
 */

function getStorageArea(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

export function getRulesForOrigin(origin: string): Promise<HideRule[]> {
  const key = rulesKeyForOrigin(origin);
  return new Promise((resolve, reject) => {
    getStorageArea().get([key], (result) => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      const rules = (result[key] as HideRule[] | undefined) ?? [];
      resolve(rules);
    });
  });
}

export function saveRulesForOrigin(
  origin: string,
  rules: HideRule[]
): Promise<void> {
  const key = rulesKeyForOrigin(origin);
  return new Promise((resolve, reject) => {
    getStorageArea().set({ [key]: rules }, () => {
      const err = chrome.runtime?.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
}

export async function addRule(rule: HideRule): Promise<HideRule[]> {
  const existing = await getRulesForOrigin(rule.origin);
  const next = [...existing, rule];
  await saveRulesForOrigin(rule.origin, next);
  return next;
}

export async function removeRule(
  origin: string,
  ruleId: string
): Promise<HideRule[]> {
  const existing = await getRulesForOrigin(origin);
  const next = existing.filter((r) => r.id !== ruleId);
  await saveRulesForOrigin(origin, next);
  return next;
}

export async function setRuleEnabled(
  origin: string,
  ruleId: string,
  enabled: boolean
): Promise<HideRule[]> {
  const existing = await getRulesForOrigin(origin);
  const next = existing.map((r) => (r.id === ruleId ? { ...r, enabled } : r));
  await saveRulesForOrigin(origin, next);
  return next;
}

export async function clearRulesForOrigin(origin: string): Promise<void> {
  await saveRulesForOrigin(origin, []);
}

export function generateRuleId(): string {
  // crypto.randomUUID is available in MV3 service workers and modern content
  // script contexts (Chrome 92+). Fall back defensively just in case.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
