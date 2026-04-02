import { loginUser } from "./soapClient.js";
import { showMessage, hideMessage } from "./ui.js";

const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage(msg);

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await loginUser({ username, password });
    if (!res.success || !res.token) {
      showMessage(msg, `Login failed: ${res.message}`, false);
      return;
    }

    localStorage.setItem("authToken", res.token);
    localStorage.setItem("username", username);
    localStorage.removeItem("userId");
    showMessage(msg, "Login successful. Redirecting to profile...", true);

    setTimeout(() => {
      window.location.href = "/profile.html";
    }, 500);
  } catch (err) {
    showMessage(msg, err.message || "Login error", false);
  }
});
