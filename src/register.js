import { registerUser, loginUser } from "./soapClient.js";
import { createProfile } from "./api.js";
import { showMessage, hideMessage } from "./ui.js";

const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");

function tokenUserId(token) {
  try {
    const payload = JSON.parse(atob((token || "").split(".")[1] || ""));
    return Number(payload.uid || 0);
  } catch {
    return 0;
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage(msg);

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const location = document.getElementById("location").value.trim();
  const website = document.getElementById("website").value.trim();

  try {
    const registerResult = await registerUser({
      username,
      password,
      email,
    });

    if (!registerResult.success) {
      showMessage(
        msg,
        `SOAP RegisterUser failed: ${registerResult.message}`,
        false,
      );
      return;
    }

    const loginResult = await loginUser({ username, password });

    if (!loginResult.success) {
      showMessage(
        msg,
        `Login after register failed: ${loginResult.message}`,
        false,
      );
      return;
    }

    const token = loginResult.token;
    if (!token) {
      showMessage(msg, "No token returned from login", false);
      return;
    }

    const authUserId = tokenUserId(token);
    if (authUserId <= 0) {
      showMessage(msg, "Invalid token: no userId found", false);
      return;
    }

    localStorage.setItem("authToken", token);
    localStorage.setItem("username", username);

    const profileResult = await createProfile(
      {
        authUserId,
        username,
        email,
        name: name || undefined,
        phone: phone || undefined,
        location: location || undefined,
        website: website || undefined,
      },
      token,
    );

    if (!profileResult.success) {
      showMessage(
        msg,
        `Profile creation failed: ${profileResult.message}. But account registered. Go to Profile page to complete profile.`,
        false,
      );
      form.reset();
      setTimeout(() => {
        window.location.href = "/profile.html";
      }, 2000);
      return;
    }

    showMessage(
      msg,
      "Registration and profile creation successful. Redirecting...",
      true,
    );
    form.reset();
    setTimeout(() => {
      window.location.href = "/profile.html";
    }, 1500);
  } catch (err) {
    showMessage(msg, err.message || "Register error", false);
  }
});
