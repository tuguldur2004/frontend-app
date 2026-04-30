import { loginUser } from "./soapClient.js";
import { showMessage, hideMessage } from "./ui.js";

const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

console.info("[LOGIN] Page loaded, form handler initialized");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage(msg);

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  console.info("[LOGIN] Form submitted", { username });

  try {
    console.info("[LOGIN] Calling loginUser function");
    const res = await loginUser({ username, password });
    console.info("[LOGIN] Response received:", {
      success: res.success,
      message: res.message,
    });

    if (!res.success || !res.token) {
      console.warn("[LOGIN] Login unsuccessful:", res.message);
      showMessage(msg, `Login failed: ${res.message}`, false);
      return;
    }

    console.info("[LOGIN] Login successful, storing token");
    localStorage.setItem("authToken", res.token);
    localStorage.setItem("username", username);
    localStorage.removeItem("userId");
    showMessage(msg, "Login successful. Redirecting to profile...", true);

    setTimeout(() => {
      console.info("[LOGIN] Redirecting to profile");
      window.location.href = "/profile.html";
    }, 500);
  } catch (err) {
    console.error("[LOGIN] Exception caught:", {
      message: err.message,
      stack: err.stack,
    });
    showMessage(msg, err.message || "Login error", false);
  }
});
