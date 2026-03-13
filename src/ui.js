export function showMessage(el, text, ok = true) {
  el.style.display = "block";
  el.className = `message ${ok ? "success" : "error"}`;
  el.textContent = text;
}

export function hideMessage(el) {
  el.style.display = "none";
}
