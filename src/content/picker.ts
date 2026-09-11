/**
 * Element picker: highlights the hovered element and reports a click as a
 * selection. Designed to be inert (no listeners attached) unless explicitly
 * started, so it never interferes with normal page interaction outside of
 * edit mode.
 */

const HIGHLIGHT_CLASS = "declutter-picker-highlight";
const OVERLAY_STYLE_ID = "declutter-picker-style";

function ensureOverlayStyle(): void {
  if (document.getElementById(OVERLAY_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = OVERLAY_STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid #ff4d4f !important;
      outline-offset: -2px !important;
      background-color: rgba(255, 77, 79, 0.15) !important;
      cursor: pointer !important;
    }
  `;
  document.documentElement.appendChild(style);
}

export type PickerHandlers = {
  onPick: (el: Element) => void;
  onCancel: () => void;
};

export class ElementPicker {
  private active = false;
  private currentHighlight: Element | null = null;
  private handlers: PickerHandlers | null = null;

  private onMouseOver = (e: MouseEvent): void => {
    const target = e.target as Element | null;
    if (!target || target === this.currentHighlight) return;
    this.clearHighlight();
    if (target instanceof Element && this.isSelectable(target)) {
      target.classList.add(HIGHLIGHT_CLASS);
      this.currentHighlight = target;
    }
  };

  private onClick = (e: MouseEvent): void => {
    if (!this.active) return;
    const target = e.target as Element | null;
    if (!target || !this.isSelectable(target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.handlers?.onPick(target);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      this.handlers?.onCancel();
    }
  };

  private isSelectable(el: Element): boolean {
    // Never allow picking the picker's own UI or the <html>/<body> root.
    if (el === document.documentElement || el === document.body) return false;
    if (el.id === OVERLAY_STYLE_ID) return false;
    return true;
  }

  private clearHighlight(): void {
    if (this.currentHighlight) {
      this.currentHighlight.classList.remove(HIGHLIGHT_CLASS);
      this.currentHighlight = null;
    }
  }

  start(handlers: PickerHandlers): void {
    if (this.active) return;
    ensureOverlayStyle();
    this.handlers = handlers;
    this.active = true;
    document.addEventListener("mouseover", this.onMouseOver, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKeyDown, true);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.clearHighlight();
    document.removeEventListener("mouseover", this.onMouseOver, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("keydown", this.onKeyDown, true);
    this.handlers = null;
  }

  isActive(): boolean {
    return this.active;
  }
}
