import {
  deleteProfile,
  getProfileByUsername,
  updateProfile,
  uploadProfileImage,
} from "./api.js";
import { showMessage, hideMessage } from "./ui.js";

console.info("[PROFILE] loaded profile.js debug build 2026-04-03T18:10Z");

const msg = document.getElementById("msg");
const form = document.getElementById("profileForm");
const logoutBtn = document.getElementById("logoutBtn");
const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const avatarFileInput = document.getElementById("avatarFile");
const uploadAvatarBtn = document.getElementById("uploadAvatarBtn");

let currentProfileId = null;
let isEditMode = false;

const editableFieldIds = [
  "email",
  "name",
  "bio",
  "phone",
  "location",
  "website",
];

function setEditableFieldsReadOnly(readOnly) {
  editableFieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.readOnly = readOnly;
  });
}

function setViewMode() {
  isEditMode = false;
  setEditableFieldsReadOnly(true);
  saveBtn.style.display = "none";
  editBtn.style.display = "inline-block";
  deleteBtn.style.display = "inline-block";
}

function setEditMode() {
  if (!currentProfileId) return;
  isEditMode = true;
  setEditableFieldsReadOnly(false);
  saveBtn.style.display = "inline-block";
  saveBtn.textContent = "Save Changes";
  editBtn.style.display = "none";
  deleteBtn.style.display = "inline-block";
}

function tokenUserId(token) {
  try {
    const payload = JSON.parse(atob((token || "").split(".")[1] || ""));
    return Number(payload.uid || 0);
  } catch {
    return 0;
  }
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("username");
  window.location.href = "/login.html";
});

editBtn.addEventListener("click", () => {
  setEditMode();
  showMessage(msg, "Edit mode enabled.", true);
});

deleteBtn.addEventListener("click", async () => {
  hideMessage(msg);

  const token = localStorage.getItem("authToken");
  if (!token || !currentProfileId) {
    showMessage(msg, "No existing profile to delete.", false);
    return;
  }

  const ok = window.confirm("Are you sure you want to delete your profile?");
  if (!ok) return;

  try {
    const res = await deleteProfile(currentProfileId, token);
    if (res.status >= 200 && res.status < 300 && res.body.success) {
      showMessage(
        msg,
        "Profile deleted. Please register again to create a new profile.",
        true,
      );
      setTimeout(() => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("username");
        window.location.href = "/register.html";
      }, 2000);
      return;
    }

    showMessage(msg, res.body?.message || "Delete failed", false);
  } catch (err) {
    showMessage(msg, err.message || "Delete error", false);
  }
});

uploadAvatarBtn.addEventListener("click", async () => {
  hideMessage(msg);

  const token = localStorage.getItem("authToken");
  if (!token || !currentProfileId) {
    showMessage(msg, "Please login and load profile first.", false);
    return;
  }

  const file = avatarFileInput?.files?.[0];
  if (!file) {
    showMessage(msg, "Please choose an image file first.", false);
    return;
  }

  try {
    const uploaded = await uploadProfileImage(file, token);
    if (
      !(uploaded.status >= 200 && uploaded.status < 300) ||
      !uploaded.body?.success
    ) {
      showMessage(msg, uploaded.body?.message || "Avatar upload failed", false);
      return;
    }

    const avatarUrl = uploaded.body?.data?.url;
    if (!avatarUrl) {
      showMessage(msg, "Upload succeeded but URL is missing.", false);
      return;
    }

    const saved = await updateProfile(
      currentProfileId,
      { avatar: avatarUrl },
      token,
    );

    if (!(saved.status >= 200 && saved.status < 300) || !saved.body?.success) {
      showMessage(
        msg,
        saved.body?.message || "Failed to save avatar URL",
        false,
      );
      return;
    }

    document.getElementById("avatar").value = avatarUrl;
    avatarFileInput.value = "";
    showMessage(msg, "Avatar uploaded and saved to profile.", true);
  } catch (err) {
    showMessage(msg, err.message || "Avatar upload error", false);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessage(msg);

  const token = localStorage.getItem("authToken");
  if (!token) {
    showMessage(msg, "Please login again.", false);
    return;
  }

  if (!currentProfileId || !isEditMode) {
    showMessage(msg, "Click Edit Profile first.", false);
    return;
  }

  const payload = {
    email: document.getElementById("email").value.trim(),
    name: document.getElementById("name").value.trim(),
    bio: document.getElementById("bio").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    avatar: document.getElementById("avatar").value.trim(),
    location: document.getElementById("location").value.trim(),
    website: document.getElementById("website").value.trim(),
  };

  try {
    const res = await updateProfile(currentProfileId, payload, token);
    if (res.status >= 200 && res.status < 300 && res.body.success) {
      showMessage(msg, "Profile updated successfully.", true);
      await loadProfile();
      return;
    }
    showMessage(msg, res.body?.message || "Update failed", false);
  } catch (err) {
    showMessage(msg, err.message || "Update error", false);
  }
});

async function loadProfile() {
  console.info("[PROFILE] loadProfile() start");
  hideMessage(msg);
  const token = localStorage.getItem("authToken");
  console.info("[PROFILE] auth token present:", Boolean(token));
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const authUserId = tokenUserId(token);
  document.getElementById("id").value =
    authUserId > 0 ? String(authUserId) : "";

  const username = (localStorage.getItem("username") || "").trim();
  console.info("[PROFILE] username from localStorage:", username);
  let profileResp = null;
  if (username) {
    profileResp = await getProfileByUsername(username, token);
    console.info("[PROFILE] getProfileByUsername response:", profileResp);
  }

  if (!profileResp) {
    showMessage(
      msg,
      "Unable to resolve profile identity. Please login again.",
      false,
    );
    return;
  }

  if (profileResp.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userId");
    showMessage(msg, "Unauthorized. Please login again.", false);
    setTimeout(() => (window.location.href = "/login.html"), 900);
    return;
  }

  if (profileResp.status === 404) {
    localStorage.removeItem("userId");
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    showMessage(msg, "Profile not found. Please register first.", false);
    setTimeout(() => {
      window.location.href = "/register.html";
    }, 2000);
    return;
  }

  if (
    !(profileResp.status >= 200 && profileResp.status < 300) ||
    !profileResp.body.success
  ) {
    showMessage(msg, profileResp.body?.message || "Profile load failed", false);
    return;
  }

  const p = profileResp.body.data;

  if (username && p?.username && p.username !== username) {
    localStorage.removeItem("userId");
    showMessage(msg, "Profile identity mismatch. Please login again.", false);
    setTimeout(() => {
      window.location.href = "/login.html";
    }, 900);
    return;
  }

  currentProfileId = p.id;
  localStorage.setItem("userId", String(p.id));

  document.getElementById("id").value =
    p.authUserId ?? (authUserId > 0 ? String(authUserId) : "");
  document.getElementById("username").value = p.username ?? "";
  document.getElementById("email").value = p.email ?? "";
  document.getElementById("name").value = p.name ?? "";
  document.getElementById("bio").value = p.bio ?? "";
  document.getElementById("phone").value = p.phone ?? "";
  document.getElementById("avatar").value = p.avatar ?? "";
  document.getElementById("location").value = p.location ?? "";
  document.getElementById("website").value = p.website ?? "";

  setViewMode();
  showMessage(msg, "Profile loaded.", true);
}

loadProfile().catch((e) => {
  console.error("[PROFILE] loadProfile failed", {
    message: e?.message,
    name: e?.name,
    stack: e?.stack,
  });
  showMessage(msg, e.message || "Load error", false);
});
