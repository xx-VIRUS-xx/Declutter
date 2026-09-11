import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHideCss } from "../src/shared/hiding";
import { HideRule } from "../src/shared/types";

function makeRule(overrides: Partial<HideRule>): HideRule {
  return {
    id: "id",
    origin: "https://example.com",
    selector: ".x",
    createdAt: 0,
    enabled: true,
    ...overrides,
  };
}

test("buildHideCss emits display:none !important for enabled rules", () => {
  const css = buildHideCss([makeRule({ selector: "#ad" })]);
  assert.match(css, /#ad\s*\{\s*display:\s*none\s*!important;\s*\}/);
});

test("buildHideCss skips disabled rules", () => {
  const css = buildHideCss([
    makeRule({ selector: "#ad", enabled: false }),
    makeRule({ selector: "#banner", enabled: true }),
  ]);
  assert.doesNotMatch(css, /#ad/);
  assert.match(css, /#banner/);
});

test("buildHideCss returns empty string for no rules", () => {
  assert.equal(buildHideCss([]), "");
});

test("buildHideCss combines multiple enabled rules", () => {
  const css = buildHideCss([
    makeRule({ selector: ".a" }),
    makeRule({ selector: ".b" }),
  ]);
  assert.match(css, /\.a/);
  assert.match(css, /\.b/);
});
