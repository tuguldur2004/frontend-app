// Use runtime-injected values from /env.js when available (window.__ENV).
// Prefer explicit public URLs so the browser can reach the API gateway even
// when the frontend is deployed on a different origin.
const env = typeof window !== "undefined" && window.__ENV ? window.__ENV : {};
console.info("[CONFIG] Environment variables loaded:", {
  PUBLIC_GATEWAY_URL: env.PUBLIC_GATEWAY_URL,
  PUBLIC_SOAP_URL: env.PUBLIC_SOAP_URL,
  SOAP_URL: env.SOAP_URL,
});

const defaultGatewayOrigin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "";

console.info("[CONFIG] Default gateway origin:", defaultGatewayOrigin);

const publicGatewayUrl = env.PUBLIC_GATEWAY_URL || defaultGatewayOrigin;

function pickUrl(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function buildGatewayUrl(path) {
  if (publicGatewayUrl && /^https?:\/\//i.test(publicGatewayUrl)) {
    return new URL(path, publicGatewayUrl).toString();
  }
  if (publicGatewayUrl && publicGatewayUrl !== "/") {
    const basePath = publicGatewayUrl.replace(/\/+$/, "");
    const suffix = String(path || "").replace(/^\/+/, "");
    return `${basePath}/${suffix}`;
  }
  return path;
}

export const SOAP_URL = pickUrl(
  env.PUBLIC_SOAP_URL,
  env.SOAP_URL,
  buildGatewayUrl("/api/soap"),
);
export const REST_URL = pickUrl(
  env.PUBLIC_REST_URL,
  env.REST_URL,
  buildGatewayUrl("/api"),
);
export const FILE_MANAGER_URL = pickUrl(
  env.PUBLIC_FILE_MANAGER_URL,
  env.FILE_MANAGER_URL,
  buildGatewayUrl("/api/files"),
);
export const SOAP_NS = env.SOAP_NS || "http://userauth.soap.service/";
export const GATEWAY_URL = pickUrl(
  env.PUBLIC_GATEWAY_URL,
  defaultGatewayOrigin || "/gateway",
);

console.info("[CONFIG] Resolved URLs:", {
  SOAP_URL,
  REST_URL,
  FILE_MANAGER_URL,
  SOAP_NS,
  GATEWAY_URL,
});
