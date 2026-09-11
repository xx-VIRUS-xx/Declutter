import { HideRule } from "../shared/types";
import { buildHideCss, DECLUTTER_STYLE_ID } from "../shared/hiding";

/**
 * Injects/updates a single <style> element containing all enabled rules'
 * hide CSS. Using one stylesheet (rather than per-rule inline styles) means
 * hiding is purely additive/CSS-based and trivially reversible by removing
 * or emptying the style element — matching the "prefer CSS hiding over
 * destructive DOM removal" constraint.
 */
export function applyRules(rules: HideRule[]): void {
  let style = document.getElementById(DECLUTTER_STYLE_ID) as
    | HTMLStyleElement
    | null;
  if (!style) {
    style = document.createElement("style");
    style.id = DECLUTTER_STYLE_ID;
    (document.head ?? document.documentElement).appendChild(style);
  }
  style.textContent = buildHideCss(rules);
}

/** Removes the injected stylesheet entirely, revealing everything again. */
export function clearAppliedRules(): void {
  const style = document.getElementById(DECLUTTER_STYLE_ID);
  if (style) {
    style.remove();
  }
}

/**
 * Watches for DOM mutations and re-applies the current stylesheet's CSS
 * text is already global (selectors, not element references) so newly
 * added nodes matching an existing selector are hidden automatically by
 * the browser's own CSS engine — no observer action needed for that case.
 *
 * However, some SPAs replace <head> or strip injected <style> tags during
 * client-side navigation. This observer detects that and re-injects the
 * stylesheet, debounced to avoid thrashing on high-frequency mutations.
 */
export class RuleReapplier {
  private rules: HideRule[] = [];
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(debounceMs = 250) {
    this.debounceMs = debounceMs;
  }

  setRules(rules: HideRule[]): void {
    this.rules = rules;
    applyRules(this.rules);
  }

  start(): void {
    if (this.observer) return;
    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        const styleGone = !document.getElementById(DECLUTTER_STYLE_ID);
        if (styleGone && this.rules.length > 0) {
          applyRules(this.rules);
        }
      }, this.debounceMs);
    });
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
