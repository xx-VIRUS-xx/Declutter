import { JSDOM } from "jsdom";

/**
 * Installs a jsdom-backed document/window/Element/CSS globals for tests that
 * exercise real DOM traversal (selector generation). Scoped to a helper so
 * selector tests read close to how the content script actually runs.
 */
export function installFakeDom(html: string): Document {
  const dom = new JSDOM(html);
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).Element = dom.window.Element;
  (globalThis as any).CSS = dom.window.CSS ?? {
    escape: (value: string) => value.replace(/([^a-zA-Z0-9_-])/g, "\\$1"),
  };
  return dom.window.document;
}
