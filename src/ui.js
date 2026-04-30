import { logInfo, logWarn } from "./logger.js";

export function showMessage(el, text, ok = true) {
  el.style.display = "block";
  el.className = `message ${ok ? "success" : "error"}`;
  el.textContent = text;

  if (ok) {
    logInfo("UI", "Message shown", { text });
  } else {
    logWarn("UI", "Error message shown", { text });
  }
}

export function hideMessage(el) {
  el.style.display = "none";
}
