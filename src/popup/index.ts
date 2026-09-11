import { DeclutterMessage } from "../shared/types";

const hostnameEl = document.getElementById("hostname") as HTMLParagraphElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const hintEl = document.getElementById("hint") as HTMLParagraphElement;
const cleanBtn = document.getElementById("cleanPage") as HTMLButtonElement;
const editBtn = document.getElementById("editLayout") as HTMLButtonElement;
const restoreBtn = document.getElementById("restorePage") as HTMLButtonElement;

let activeTabId: number | undefined;
let editMode = false;

function setHint(text: string): void {
  hintEl.textContent = text;
}

function renderEditMode(): void {
  editBtn.textContent = editMode ? "Done editing" : "Edit layout";
  editBtn.setAttribute("aria-pressed", String(editMode));
  setHint(
    editMode
      ? "Click any element on the page to hide it. Press Escape to stop."
      : ""
  );
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToContent<T = unknown>(
  message: DeclutterMessage
): Promise<T | undefined> {
  if (!activeTabId) return undefined;
  try {
    return await chrome.tabs.sendMessage(activeTabId, message);
  } catch {
    setHint("Declutter can't run on this page.");
    return undefined;
  }
}

async function refreshState(): Promise<void> {
  const state = await sendToContent<{
    origin: string;
    ruleCount: number;
    editMode: boolean;
  }>({ type: "GET_STATE" });
  if (!state) {
    hostnameEl.textContent = "Unsupported page";
    statusEl.textContent = "";
    cleanBtn.disabled = true;
    editBtn.disabled = true;
    restoreBtn.disabled = true;
    return;
  }
  hostnameEl.textContent = state.origin;
  statusEl.textContent = `${state.ruleCount} active rule${
    state.ruleCount === 1 ? "" : "s"
  }`;
  editMode = state.editMode;
  renderEditMode();
}

async function init(): Promise<void> {
  const tab = await getActiveTab();
  activeTabId = tab?.id;
  await refreshState();
}

cleanBtn.addEventListener("click", async () => {
  cleanBtn.disabled = true;
  await sendToContent({ type: "CLEAN_PAGE" });
  cleanBtn.disabled = false;
  await refreshState();
});

editBtn.addEventListener("click", async () => {
  editMode = !editMode;
  await sendToContent({
    type: editMode ? "ENTER_EDIT_MODE" : "EXIT_EDIT_MODE",
  });
  renderEditMode();
  // Popup closes on outside click in Chrome; state re-syncs next open.
  await refreshState();
});

restoreBtn.addEventListener("click", async () => {
  restoreBtn.disabled = true;
  await sendToContent({ type: "RESTORE_PAGE" });
  restoreBtn.disabled = false;
  if (activeTabId) {
    chrome.tabs.reload(activeTabId);
  }
  window.close();
});

void init();
