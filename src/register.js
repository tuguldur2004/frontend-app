import { registerUser, loginUser } from "./soapClient.js";
import { createProfile } from "./api.js";
import { showMessage, hideMessage } from "./ui.js";
import { initFrontendLogging, logError, logInfo, logWarn } from "./logger.js";

initFrontendLogging("REGISTER");

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

  logInfo("REGISTER", "Submit started", {
    username,
    hasEmail: Boolean(email),
    hasName: Boolean(name),
    hasPhone: Boolean(phone),
    hasLocation: Boolean(location),
    hasWebsite: Boolean(website),
  });

  try {
    logInfo("REGISTER", "Calling SOAP RegisterUser", { username });
    const registerResult = await registerUser({
      username,
      password,
      email,
    });

    if (!registerResult.success) {
      logWarn("REGISTER", "SOAP RegisterUser failed", {
        username,
        message: registerResult.message,
      });
      showMessage(
        msg,
        `SOAP RegisterUser failed: ${registerResult.message}`,
        false,
      );
      return;
    }

    logInfo("REGISTER", "RegisterUser succeeded, calling LoginUser", {
      username,
      userId: registerResult.userId,
    });
    const loginResult = await loginUser({ username, password });

    if (!loginResult.success) {
      logWarn("REGISTER", "Login after register failed", {
        username,
        message: loginResult.message,
      });
      showMessage(
        msg,
        `Login after register failed: ${loginResult.message}`,
        false,
      );
      return;
    }

    const token = loginResult.token;
    if (!token) {
      logWarn("REGISTER", "Missing token after login", { username });
      showMessage(msg, "No token returned from login", false);
      return;
    }

    const authUserId = tokenUserId(token);
    if (authUserId <= 0) {
      logWarn("REGISTER", "Invalid token payload", { username, authUserId });
      showMessage(msg, "Invalid token: no userId found", false);
      return;
    }

    localStorage.setItem("authToken", token);
    localStorage.setItem("username", username);

    logInfo("REGISTER", "Calling createProfile", {
      username,
      authUserId,
    });
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
      logWarn("REGISTER", "Profile creation failed after account creation", {
        username,
        authUserId,
        message: profileResult.message,
      });
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

    logInfo("REGISTER", "Register flow completed successfully", {
      username,
      authUserId,
    });

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
    logError("REGISTER", "Unhandled register flow error", err, { username });
    showMessage(msg, err.message || "Register error", false);
  }
});
