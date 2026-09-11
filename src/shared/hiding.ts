import { HideRule } from "./types";

/**
 * Builds the CSS text for a <style> element that hides all enabled rules'
 * selectors via `display: none !important`. Pure function so it is easy to
 * unit test independent of the DOM.
 */
export function buildHideCss(rules: HideRule[]): string {
  return rules
    .filter((r) => r.enabled)
    .map((r) => `${r.selector} { display: none !important; }`)
    .join("\n");
}

export const DECLUTTER_STYLE_ID = "declutter-hide-style";
