import { DeclutterMessage, HideRule } from "../shared/types";
import {
  addRule,
  clearRulesForOrigin,
  generateRuleId,
  getRulesForOrigin,
  saveRulesForOrigin,
} from "../shared/storage";
import { generateSelector } from "../shared/selector";
import { clearAppliedRules, RuleReapplier } from "./apply";
import { ElementPicker } from "./picker";
import { scanForClutter } from "../shared/heuristics";

const origin = window.location.origin;
const reapplier = new RuleReapplier();
const picker = new ElementPicker();

async function loadAndApplyRules(): Promise<HideRule[]> {
  const rules = await getRulesForOrigin(origin);
  reapplier.setRules(rules);
  return rules;
}

function startEditMode(): void {
  picker.start({
    onPick: async (el) => {
      const selector = generateSelector(el);
      const rule: HideRule = {
        id: generateRuleId(),
        origin,
        selector,
        createdAt: Date.now(),
        enabled: true,
      };
      const rules = await addRule(rule);
      reapplier.setRules(rules);
      chrome.runtime.sendMessage({
        type: "RULE_ADDED",
        rule,
      } satisfies DeclutterMessage);
      // Stay in edit mode so the user can hide multiple elements in a row.
    },
    onCancel: () => {
      picker.stop();
    },
  });
}

function stopEditMode(): void {
  picker.stop();
}

/**
 * Deterministic "Clean this page": scans for high-confidence clutter
 * elements and creates hide rules for each, same as manual picking would.
 */
async function cleanPage(): Promise<void> {
  const matches = scanForClutter(document);
  if (matches.length === 0) return;
  let rules = await getRulesForOrigin(origin);
  for (const el of matches) {
    const selector = generateSelector(el);
    if (rules.some((r) => r.selector === selector)) continue;
    const rule: HideRule = {
      id: generateRuleId(),
      origin,
      selector,
      createdAt: Date.now(),
      enabled: true,
    };
    rules = [...rules, rule];
  }
  await saveRulesForOrigin(origin, rules);
  reapplier.setRules(rules);
}

async function restorePage(): Promise<void> {
  await clearRulesForOrigin(origin);
  clearAppliedRules();
  reapplier.setRules([]);
}

chrome.runtime.onMessage.addListener(
  (message: DeclutterMessage, _sender, sendResponse) => {
    (async () => {
      switch (message.type) {
        case "GET_STATE": {
          const rules = await getRulesForOrigin(origin);
          sendResponse({
            type: "STATE",
            origin,
            ruleCount: rules.filter((r) => r.enabled).length,
            editMode: picker.isActive(),
          } satisfies DeclutterMessage);
          return;
        }
        case "ENTER_EDIT_MODE":
          startEditMode();
          sendResponse({ ok: true });
          return;
        case "EXIT_EDIT_MODE":
          stopEditMode();
          sendResponse({ ok: true });
          return;
        case "RESTORE_PAGE":
          await restorePage();
          sendResponse({ ok: true });
          return;
        case "CLEAN_PAGE":
          await cleanPage();
          sendResponse({ ok: true });
          return;
        default:
          sendResponse({ ok: false });
      }
    })();
    return true; // keep sendResponse channel open for async work
  }
);

reapplier.start();
void loadAndApplyRules();
