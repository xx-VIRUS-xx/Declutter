import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ElementInfo,
  classifyClutter,
  isProtected,
  looksLikeAd,
  looksLikeCookieOverlay,
  looksLikeNewsletterOverlay,
  looksLikeRecommendationSection,
  looksLikeStickyBanner,
} from "../src/shared/heuristics";

function makeInfo(overrides: Partial<ElementInfo>): ElementInfo {
  return {
    tagName: "DIV",
    attributes: {},
    textContent: "",
    rect: { top: 0, left: 0, width: 100, height: 100 },
    viewport: { width: 1000, height: 1000 },
    isFixedOrSticky: false,
    ...overrides,
  };
}

test("looksLikeAd flags elements with ad-related class names", () => {
  const info = makeInfo({ attributes: { class: "ad-container top-banner" } });
  assert.equal(looksLikeAd(info), true);
});

test("looksLikeAd does not flag unrelated elements", () => {
  const info = makeInfo({ attributes: { class: "card list-item" } });
  assert.equal(looksLikeAd(info), false);
});

test("isProtected guards nav/main/form/article and form controls", () => {
  assert.equal(isProtected(makeInfo({ tagName: "NAV" })), true);
  assert.equal(isProtected(makeInfo({ tagName: "MAIN" })), true);
  assert.equal(isProtected(makeInfo({ tagName: "FORM" })), true);
  assert.equal(isProtected(makeInfo({ tagName: "BUTTON" })), true);
  assert.equal(isProtected(makeInfo({ tagName: "INPUT" })), true);
  assert.equal(
    isProtected(makeInfo({ attributes: { id: "checkout-panel" } })),
    true
  );
});

test("looksLikeAd never flags protected elements even with ad-like class", () => {
  const info = makeInfo({ tagName: "NAV", attributes: { class: "ad" } });
  assert.equal(looksLikeAd(info), false);
});

test("looksLikeStickyBanner requires fixed/sticky position and large area", () => {
  const small = makeInfo({
    isFixedOrSticky: true,
    rect: { top: 0, left: 0, width: 50, height: 20 },
    viewport: { width: 1000, height: 1000 },
  });
  const large = makeInfo({
    isFixedOrSticky: true,
    rect: { top: 0, left: 0, width: 1000, height: 200 },
    viewport: { width: 1000, height: 1000 },
  });
  assert.equal(looksLikeStickyBanner(small), false);
  assert.equal(looksLikeStickyBanner(large), true);
});

test("looksLikeStickyBanner ignores non-fixed large elements", () => {
  const large = makeInfo({
    isFixedOrSticky: false,
    rect: { top: 0, left: 0, width: 1000, height: 500 },
  });
  assert.equal(looksLikeStickyBanner(large), false);
});

test("looksLikeNewsletterOverlay matches subscribe/newsletter copy", () => {
  const info = makeInfo({ textContent: "Subscribe to our newsletter today" });
  assert.equal(looksLikeNewsletterOverlay(info), true);
});

test("looksLikeCookieOverlay matches cookie/consent labeling", () => {
  const info = makeInfo({ attributes: { class: "cookie-consent-banner" } });
  assert.equal(looksLikeCookieOverlay(info), true);
});

test("looksLikeRecommendationSection matches related-content copy", () => {
  const info = makeInfo({ textContent: "You might also like these posts" });
  assert.equal(looksLikeRecommendationSection(info), true);
});

test("classifyClutter never flags main content or forms", () => {
  const main = makeInfo({
    tagName: "MAIN",
    attributes: { class: "ad" },
    textContent: "subscribe newsletter recommended",
  });
  assert.equal(classifyClutter(main), null);
});

test("classifyClutter returns first matching reason", () => {
  const info = makeInfo({ attributes: { class: "ad-slot" } });
  const match = classifyClutter(info);
  assert.deepEqual(match, { reason: "ad" });
});

test("classifyClutter returns null for ordinary content", () => {
  const info = makeInfo({
    attributes: { class: "product-card" },
    textContent: "A regular product description.",
  });
  assert.equal(classifyClutter(info), null);
});
