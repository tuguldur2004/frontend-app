import { REST_URL } from "./config.js";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function createProfile(payload, token) {
  const res = await fetch(`${REST_URL}/users`, {
    method: "POST",
    headers: authHeaders(token),
    credentials: "omit",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getProfileById(id, token) {
  const res = await fetch(`${REST_URL}/users/${id}`, {
    headers: authHeaders(token),
    credentials: "omit",
  });
  return { status: res.status, body: await res.json() };
}

export async function getProfileByUsername(username, token) {
  const res = await fetch(
    `${REST_URL}/users/name/${encodeURIComponent(username)}`,
    {
      headers: authHeaders(token),
      credentials: "omit",
    },
  );
  return { status: res.status, body: await res.json() };
}

export async function updateProfile(id, payload, token) {
  const res = await fetch(`${REST_URL}/users/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    credentials: "omit",
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

export async function deleteProfile(id, token) {
  const res = await fetch(`${REST_URL}/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
    credentials: "omit",
  });
  return { status: res.status, body: await res.json() };
}
