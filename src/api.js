import { FILE_MANAGER_URL, REST_URL } from "./config.js";

const DEBUG_BUILD = "frontend-api-debug-2026-04-03T18:10Z";
console.info(`[API] loaded ${DEBUG_BUILD}; REST_URL=${REST_URL}`);

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    const compact = (text || "").replace(/\s+/g, " ").trim().slice(0, 240);
    return {
      success: false,
      message: `Upstream returned non-JSON (HTTP ${res.status}). ${compact}`,
    };
  }
}

async function loggedFetch(url, init) {
  console.info("[API] request", {
    url,
    method: init.method || "GET",
    credentials: init.credentials,
    hasAuth: Boolean(init.headers?.Authorization),
  });

  try {
    const res = await fetch(url, init);
    console.info("[API] response", {
      url,
      status: res.status,
      ok: res.ok,
      acao: res.headers.get("access-control-allow-origin"),
      acc: res.headers.get("access-control-allow-credentials"),
    });
    return res;
  } catch (e) {
    console.error("[API] fetch error", {
      url,
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
    });
    throw e;
  }
}

export async function createProfile(payload, token) {
  const res = await loggedFetch(`${REST_URL}/users`, {
    method: "POST",
    headers: authHeaders(token),
    credentials: "omit",
    body: JSON.stringify(payload),
  });
  return parseJsonSafe(res);
}

export async function getProfileById(id, token) {
  const res = await loggedFetch(`${REST_URL}/users/${id}`, {
    headers: authHeaders(token),
    credentials: "omit",
  });
  return { status: res.status, body: await parseJsonSafe(res) };
}

export async function getProfileByUsername(username, token) {
  const res = await loggedFetch(
    `${REST_URL}/users/name/${encodeURIComponent(username)}`,
    {
      headers: authHeaders(token),
      credentials: "omit",
    },
  );
  return { status: res.status, body: await parseJsonSafe(res) };
}

export async function updateProfile(id, payload, token) {
  const res = await loggedFetch(`${REST_URL}/users/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    credentials: "omit",
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await parseJsonSafe(res) };
}

export async function deleteProfile(id, token) {
  const res = await loggedFetch(`${REST_URL}/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
    credentials: "omit",
  });
  return { status: res.status, body: await parseJsonSafe(res) };
}

export async function uploadProfileImage(file, token) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await loggedFetch(`${FILE_MANAGER_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "omit",
    body: formData,
  });
  return { status: res.status, body: await parseJsonSafe(res) };
}
