/**
 * Deterministic heuristics for "Clean this page". No AI/ML — plain signal
 * checks on attributes, text, and layout geometry. Conservative by design:
 * only flag elements when confidence is high, and never flag anything that
 * looks like primary content, navigation, forms, or auth/checkout UI.
 *
 * Exported as pure predicate functions operating on a minimal "ElementInfo"
 * shape so they can be unit tested without a real DOM/layout engine, and a
 * `scanForClutter` function that adapts them to live Elements.
 */

export type ElementInfo = {
  tagName: string;
  attributes: Record<string, string>;
  textContent: string;
  rect: { top: number; left: number; width: number; height: number };
  viewport: { width: number; height: number };
  isFixedOrSticky: boolean;
};

const AD_HINT_PATTERN =
  /\b(ad|ads|advert|advertisement|sponsor(ed)?|promo(tion)?)\b/i;

const NEWSLETTER_PATTERN =
  /\b(newsletter|subscribe|sign[\s-]?up.*(email|updates)|join our list)\b/i;

const COOKIE_CONSENT_PATTERN =
  /\b(cookie|consent|gdpr|privacy preferences)\b/i;

const RECOMMENDATION_PATTERN =
  /\b(recommended|you might (also )?like|related (articles|posts|products)|more from|up next|trending now)\b/i;

const PROTECTED_PATTERN =
  /\b(main|article|content|nav(igation)?|menu|header|footer|form|login|sign[\s-]?in|checkout|payment|cart|search)\b/i;

function attrBundle(info: ElementInfo): string {
  const { id = "", class: className = "", role = "", "aria-label": ariaLabel = "" } =
    info.attributes;
  return `${id} ${className} ${role} ${ariaLabel}`.toLowerCase();
}

/** True if the element looks structurally/semantically protected. */
export function isProtected(info: ElementInfo): boolean {
  if (["nav", "form", "main", "article", "header", "footer"].includes(info.tagName.toLowerCase())) {
    return true;
  }
  if (
    info.tagName.toLowerCase() === "input" ||
    info.tagName.toLowerCase() === "button" ||
    info.tagName.toLowerCase() === "select" ||
    info.tagName.toLowerCase() === "textarea"
  ) {
    return true;
  }
  return PROTECTED_PATTERN.test(attrBundle(info));
}

function viewportAreaRatio(info: ElementInfo): number {
  const viewportArea = info.viewport.width * info.viewport.height;
  if (viewportArea <= 0) return 0;
  const elArea = Math.max(0, info.rect.width) * Math.max(0, info.rect.height);
  return elArea / viewportArea;
}

/** Ad or promotional labeling on id/class/role/aria-label. */
export function looksLikeAd(info: ElementInfo): boolean {
  if (isProtected(info)) return false;
  return AD_HINT_PATTERN.test(attrBundle(info));
}

/** Fixed/sticky banner occupying a substantial share of the viewport. */
export function looksLikeStickyBanner(info: ElementInfo): boolean {
  if (isProtected(info)) return false;
  if (!info.isFixedOrSticky) return false;
  return viewportAreaRatio(info) >= 0.15;
}

/** Newsletter/signup overlay. */
export function looksLikeNewsletterOverlay(info: ElementInfo): boolean {
  if (isProtected(info)) return false;
  const bundle = attrBundle(info) + " " + info.textContent.toLowerCase();
  return NEWSLETTER_PATTERN.test(bundle);
}

/**
 * Cookie/consent overlay — only flagged when it is clearly non-essential,
 * i.e. it is not the only interactive element and doesn't contain a form.
 */
export function looksLikeCookieOverlay(info: ElementInfo): boolean {
  if (isProtected(info)) return false;
  return COOKIE_CONSENT_PATTERN.test(attrBundle(info));
}

/** Recommendation/related-content section. */
export function looksLikeRecommendationSection(info: ElementInfo): boolean {
  if (isProtected(info)) return false;
  const bundle = attrBundle(info) + " " + info.textContent.toLowerCase();
  return RECOMMENDATION_PATTERN.test(bundle);
}

export type ClutterMatch = {
  reason:
    | "ad"
    | "sticky-banner"
    | "newsletter-overlay"
    | "cookie-overlay"
    | "recommendation-section";
};

/** Runs all heuristics against one ElementInfo; returns the first match, if any. */
export function classifyClutter(info: ElementInfo): ClutterMatch | null {
  if (looksLikeAd(info)) return { reason: "ad" };
  if (looksLikeStickyBanner(info)) return { reason: "sticky-banner" };
  if (looksLikeNewsletterOverlay(info)) return { reason: "newsletter-overlay" };
  if (looksLikeCookieOverlay(info)) return { reason: "cookie-overlay" };
  if (looksLikeRecommendationSection(info)) return { reason: "recommendation-section" };
  return null;
}

/** Adapts a live DOM Element into the pure ElementInfo shape. */
export function elementToInfo(el: Element): ElementInfo {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    attributes[attr.name] = attr.value;
  }
  return {
    tagName: el.tagName,
    attributes,
    textContent: (el.textContent ?? "").slice(0, 300),
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    isFixedOrSticky: style.position === "fixed" || style.position === "sticky",
  };
}

/**
 * Scans a live document/root for high-confidence clutter candidates.
 * Only considers reasonably-sized container-like elements to limit cost.
 */
export function scanForClutter(root: ParentNode = document): Element[] {
  const candidates = Array.from(
    root.querySelectorAll("div, section, aside, dialog, [role='dialog'], [role='banner']")
  );
  const matches: Element[] = [];
  for (const el of candidates) {
    const info = elementToInfo(el);
    if (classifyClutter(info)) {
      matches.push(el);
    }
  }
  return matches;
}
