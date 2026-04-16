import { FILE_MANAGER_URL, REST_URL } from "./config.js";

const DEBUG_BUILD = "frontend-api-debug-2026-04-03T18:10Z";
console.info(`[API] loaded ${DEBUG_BUILD}; REST_URL=${REST_URL}`);

// Maximum file size: 10MB (must match spring.servlet.multipart.max-file-size)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateFileSize(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    const fileMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size ${fileMB}MB exceeds maximum ${maxMB}MB`,
    };
  }
  return { valid: true };
}

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
  const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has("x-request-id")) {
    headers.set("x-request-id", rid);
  }

  const finalInit = {
    ...init,
    headers,
  };

  console.info("[API] request", {
    url,
    method: finalInit.method || "GET",
    credentials: finalInit.credentials,
    requestId: rid,
    hasAuth: headers.has("Authorization"),
  });

  try {
    const res = await fetch(url, finalInit);
    console.info("[API] response", {
      url,
      status: res.status,
      ok: res.ok,
      requestId: res.headers.get("x-request-id") || rid,
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
  // Validate file size before attempting upload
  const validation = validateFileSize(file);
  if (!validation.valid) {
    console.error("[API] upload validation failed", {
      fileName: file.name,
      fileSize: file.size,
      error: validation.error,
    });
    return {
      status: 400,
      body: {
        success: false,
        message: validation.error,
      },
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.info("[API] upload attempt", {
        attempt,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      });

      const res = await loggedFetch(`${FILE_MANAGER_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
        body: formData,
      });

      if (res.ok || attempt === maxRetries) {
        // Return on success or last attempt
        return { status: res.status, body: await parseJsonSafe(res) };
      }

      // Non-OK response on non-final attempt: log and retry
      if (res.status >= 500 || res.status === 408 || res.status === 504) {
        const errorBody = await parseJsonSafe(res);
        lastError = errorBody;
        console.warn("[API] upload server error, will retry", {
          attempt,
          status: res.status,
          message: errorBody?.message,
        });
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      // Client error (4xx except 408) or other: return immediately
      return { status: res.status, body: await parseJsonSafe(res) };
    } catch (error) {
      lastError = error;
      console.warn("[API] upload fetch error, will retry", {
        attempt,
        message: error?.message,
      });
      if (attempt === maxRetries) {
        console.error("[API] upload failed after", { maxRetries, lastError });
        throw error;
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  // Should not reach here, but in case return last error
  return {
    status: 504,
    body: {
      success: false,
      message: lastError?.message || "Upload failed after retries",
    },
  };
}

export async function deleteUploadedFile(fileUrl, token) {
  const res = await loggedFetch(
    `${FILE_MANAGER_URL}?fileUrl=${encodeURIComponent(fileUrl)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "omit",
    },
  );
  return { status: res.status, body: await parseJsonSafe(res) };
}
