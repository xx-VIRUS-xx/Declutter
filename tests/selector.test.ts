import { test } from "node:test";
import assert from "node:assert/strict";
import { installFakeDom } from "./helpers/fake-dom";
import { generateSelector } from "../src/shared/selector";

test("prefers a stable id when present", () => {
  const doc = installFakeDom(`
    <html><body>
      <div id="ad-banner-1">Ad</div>
      <div id="content">Article</div>
    </body></html>
  `);
  const el = doc.getElementById("ad-banner-1")!;
  const selector = generateSelector(el, doc);
  assert.equal(selector, "#ad-banner-1");
  assert.equal(doc.querySelectorAll(selector).length, 1);
});

test("ignores volatile numeric-looking ids and falls back to structure/class", () => {
  const doc = installFakeDom(`
    <html><body>
      <div id="12345" class="sidebar-widget">Widget A</div>
      <div id="67890" class="sidebar-widget">Widget B</div>
    </body></html>
  `);
  const el = doc.querySelectorAll(".sidebar-widget")[1] as Element;
  const selector = generateSelector(el, doc);
  assert.doesNotMatch(selector, /#12345|#67890/);
  const matches = doc.querySelectorAll(selector);
  assert.equal(matches.length, 1);
  assert.equal(matches[0], el);
});

test("ignores volatile css-module-style class names", () => {
  const doc = installFakeDom(`
    <html><body>
      <div class="css-1a2b3c banner">
        <span class="css-9x8y7z">Promo</span>
      </div>
    </body></html>
  `);
  const el = doc.querySelector("span")!;
  const selector = generateSelector(el, doc);
  assert.doesNotMatch(selector, /css-9x8y7z/);
});

test("uses data-testid when available", () => {
  const doc = installFakeDom(`
    <html><body>
      <div data-testid="promo-banner">Promo</div>
      <div data-testid="content-card">Card</div>
    </body></html>
  `);
  const el = doc.querySelector('[data-testid="promo-banner"]')!;
  const selector = generateSelector(el, doc);
  assert.match(selector, /data-testid="promo-banner"/);
  assert.equal(doc.querySelectorAll(selector).length, 1);
});

test("falls back to nth-child structural path for unstyled siblings", () => {
  const doc = installFakeDom(`
    <html><body>
      <ul>
        <li>One</li>
        <li>Two</li>
        <li>Three</li>
      </ul>
    </body></html>
  `);
  const items = doc.querySelectorAll("li");
  const target = items[1];
  const selector = generateSelector(target, doc);
  const matches = doc.querySelectorAll(selector);
  assert.equal(matches.length, 1);
  assert.equal(matches[0], target);
});

test("generated selector uniquely matches even in deeply nested structures", () => {
  const doc = installFakeDom(`
    <html><body>
      <div class="page">
        <div class="row">
          <div class="col"><div class="card"><p>A</p></div></div>
          <div class="col"><div class="card"><p>B</p></div></div>
        </div>
      </div>
    </body></html>
  `);
  const paragraphs = doc.querySelectorAll("p");
  const target = paragraphs[1];
  const selector = generateSelector(target, doc);
  const matches = doc.querySelectorAll(selector);
  assert.equal(matches.length, 1);
  assert.equal(matches[0], target);
});
