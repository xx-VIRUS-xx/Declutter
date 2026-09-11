/**
 * Selector generation strategy.
 *
 * Goal: produce a selector that (a) uniquely identifies the target element
 * on the page right now, and (b) is likely to still match after a reload,
 * even though volatile framework-generated class names (e.g. React/Vue
 * CSS-module hashes like `.css-1a2b3c` or `.jsx-4839201`) should NOT be
 * trusted long-term.
 *
 * Strategy, in priority order, at each level of the ancestor chain:
 *   1. A stable `id` attribute (not obviously auto-generated/numeric-only).
 *   2. A `data-testid` / `data-test` / `data-qa` style test attribute.
 *   3. Stable class names (filtered to drop volatile-looking hashes),
 *      combined with tag name.
 *   4. Structural fallback: tag name + `nth-child` position among siblings.
 *
 * The generator walks upward from the target element, building path
 * segments, and stops as soon as the accumulated selector uniquely matches
 * a single element in `document` (or the provided root, for testing).
 */

const VOLATILE_CLASS_PATTERNS: RegExp[] = [
  /^css-[a-z0-9]+$/i, // styled-components / emotion
  /^jsx-\d+$/i, // styled-jsx
  /^sc-[a-zA-Z0-9]+$/, // styled-components generated
  /^[a-z0-9]{6,}$/i, // bare hash-like tokens (no letters-only word shape)
  /--[a-f0-9]{5,}$/i, // suffixed hash
  /^v-[a-f0-9]{6,}$/i, // vue scoped hash-ish
];

const VOLATILE_ID_PATTERNS: RegExp[] = [
  /^\d+$/, // purely numeric ids (often generated)
  /^:r[0-9a-z]+:$/i, // React 18 useId output like :r0:
  /^radix-/i,
  /^headlessui-/i,
  /^mui-\d+$/i,
];

const TEST_ATTRS = ["data-testid", "data-test", "data-qa", "data-cy"];

function isStableId(id: string): boolean {
  if (!id) return false;
  return !VOLATILE_ID_PATTERNS.some((re) => re.test(id));
}

function isStableClass(cls: string): boolean {
  if (!cls) return false;
  if (/^\d/.test(cls)) return false;
  return !VOLATILE_CLASS_PATTERNS.some((re) => re.test(cls));
}

function escapeSelectorValue(value: string): string {
  if (typeof CSS !== "undefined" && CSS.escape) {
    return CSS.escape(value);
  }
  // Minimal fallback escape for environments without CSS.escape (tests).
  return value.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
}

function getStableClasses(el: Element): string[] {
  const classList = Array.from(el.classList);
  return classList.filter(isStableClass).slice(0, 3);
}

function nthChildSuffix(el: Element): string {
  const parent = el.parentElement;
  if (!parent) return "";
  const siblings = Array.from(parent.children);
  const index = siblings.indexOf(el) + 1;
  return `:nth-child(${index})`;
}

/**
 * True if `selector` matches more than one of `el`'s element siblings
 * (including `el` itself) under their shared parent. Used to decide whether
 * a segment needs an `:nth-child` suffix to disambiguate identical-looking
 * siblings (e.g. a repeated card/list-item structure).
 */
function ambiguousAmongSiblings(el: Element, selector: string): boolean {
  const parent = el.parentElement;
  if (!parent) return false;
  const siblings = Array.from(parent.children);
  let count = 0;
  for (const sibling of siblings) {
    try {
      if (sibling.matches(selector)) count++;
    } catch {
      return true;
    }
    if (count > 1) return true;
  }
  return false;
}

function segmentForElement(el: Element): string {
  const tag = el.tagName.toLowerCase();

  const id = el.getAttribute("id");
  if (id && isStableId(id)) {
    return `#${escapeSelectorValue(id)}`;
  }

  for (const attr of TEST_ATTRS) {
    const val = el.getAttribute(attr);
    if (val) {
      const base = `${tag}[${attr}="${escapeSelectorValue(val)}"]`;
      return ambiguousAmongSiblings(el, base)
        ? `${base}${nthChildSuffix(el)}`
        : base;
    }
  }

  const stableClasses = getStableClasses(el);
  if (stableClasses.length > 0) {
    const base = `${tag}.${stableClasses.map(escapeSelectorValue).join(".")}`;
    // A shared class (e.g. a repeated card/list-item pattern) does not
    // uniquely identify this element among its siblings; fall back to
    // structural disambiguation so ancestor-chain uniqueness is achievable.
    return ambiguousAmongSiblings(el, base)
      ? `${base}${nthChildSuffix(el)}`
      : base;
  }

  // Structural fallback: tag + nth-child among element siblings.
  return `${tag}${nthChildSuffix(el)}`;
}

function matchesUniquely(selector: string, root: ParentNode): boolean {
  try {
    return root.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

/**
 * Generate a CSS selector for `target` that uniquely matches it within
 * `root` (defaults to `document`). Walks up the ancestor chain, prepending
 * segments, until uniqueness is achieved or we run out of ancestors.
 */
export function generateSelector(
  target: Element,
  root: ParentNode = document
): string {
  if (target.id && isStableId(target.id)) {
    const idSelector = `#${escapeSelectorValue(target.id)}`;
    if (matchesUniquely(idSelector, root)) {
      return idSelector;
    }
  }

  const segments: string[] = [];
  let current: Element | null = target;
  let depth = 0;
  const MAX_DEPTH = 8;

  while (current && depth < MAX_DEPTH) {
    segments.unshift(segmentForElement(current));
    const candidate = segments.join(" > ");
    if (matchesUniquely(candidate, root)) {
      return candidate;
    }
    current = current.parentElement;
    depth++;
  }

  // Give up on strict uniqueness after MAX_DEPTH; return the deepest chain
  // we built. Better to over-select slightly than to loop indefinitely on
  // deeply nested documents.
  return segments.join(" > ");
}
