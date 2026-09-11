import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installFakeChrome } from "./helpers/fake-chrome";

beforeEach(() => {
  installFakeChrome();
});

test("getRulesForOrigin returns empty array when nothing stored", async () => {
  const { getRulesForOrigin } = await import("../src/shared/storage");
  const rules = await getRulesForOrigin("https://example.com");
  assert.deepEqual(rules, []);
});

test("addRule persists and getRulesForOrigin reads it back", async () => {
  const { addRule, getRulesForOrigin } = await import("../src/shared/storage");
  const rule = {
    id: "r1",
    origin: "https://example.com",
    selector: "#ad-banner",
    createdAt: 123,
    enabled: true,
  };
  await addRule(rule);
  const rules = await getRulesForOrigin("https://example.com");
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0], rule);
});

test("rules are isolated per-origin", async () => {
  const { addRule, getRulesForOrigin } = await import("../src/shared/storage");
  await addRule({
    id: "r1",
    origin: "https://a.com",
    selector: ".a",
    createdAt: 1,
    enabled: true,
  });
  await addRule({
    id: "r2",
    origin: "https://b.com",
    selector: ".b",
    createdAt: 2,
    enabled: true,
  });
  const aRules = await getRulesForOrigin("https://a.com");
  const bRules = await getRulesForOrigin("https://b.com");
  assert.equal(aRules.length, 1);
  assert.equal(bRules.length, 1);
  assert.equal(aRules[0].selector, ".a");
  assert.equal(bRules[0].selector, ".b");
});

test("removeRule deletes only the targeted rule", async () => {
  const { addRule, removeRule, getRulesForOrigin } = await import(
    "../src/shared/storage"
  );
  await addRule({
    id: "r1",
    origin: "https://example.com",
    selector: ".a",
    createdAt: 1,
    enabled: true,
  });
  await addRule({
    id: "r2",
    origin: "https://example.com",
    selector: ".b",
    createdAt: 2,
    enabled: true,
  });
  await removeRule("https://example.com", "r1");
  const rules = await getRulesForOrigin("https://example.com");
  assert.equal(rules.length, 1);
  assert.equal(rules[0].id, "r2");
});

test("setRuleEnabled toggles only the targeted rule's enabled flag", async () => {
  const { addRule, setRuleEnabled, getRulesForOrigin } = await import(
    "../src/shared/storage"
  );
  await addRule({
    id: "r1",
    origin: "https://example.com",
    selector: ".a",
    createdAt: 1,
    enabled: true,
  });
  await setRuleEnabled("https://example.com", "r1", false);
  const rules = await getRulesForOrigin("https://example.com");
  assert.equal(rules[0].enabled, false);
});

test("clearRulesForOrigin empties only that origin's rules", async () => {
  const { addRule, clearRulesForOrigin, getRulesForOrigin } = await import(
    "../src/shared/storage"
  );
  await addRule({
    id: "r1",
    origin: "https://a.com",
    selector: ".a",
    createdAt: 1,
    enabled: true,
  });
  await addRule({
    id: "r2",
    origin: "https://b.com",
    selector: ".b",
    createdAt: 2,
    enabled: true,
  });
  await clearRulesForOrigin("https://a.com");
  assert.deepEqual(await getRulesForOrigin("https://a.com"), []);
  assert.equal((await getRulesForOrigin("https://b.com")).length, 1);
});

test("generateRuleId produces unique ids", async () => {
  const { generateRuleId } = await import("../src/shared/storage");
  const a = generateRuleId();
  const b = generateRuleId();
  assert.notEqual(a, b);
  assert.ok(a.length > 0);
});
