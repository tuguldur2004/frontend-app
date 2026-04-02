// Use runtime-injected values from /env.js when available (window.__ENV).
// Prefer explicit public URLs so the browser can reach the API gateway even
// when the frontend is deployed on a different origin.
const env = typeof window !== "undefined" && window.__ENV ? window.__ENV : {};
const isLocalhost =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);

const defaultGatewayOrigin = isLocalhost
  ? ""
  : "https://api-gateway-gwzlj.ondigitalocean.app";

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
  return path;
}

export const SOAP_URL = pickUrl(
  env.PUBLIC_SOAP_URL,
  env.SOAP_URL,
  buildGatewayUrl("/gateway/soap"),
);
export const REST_URL = pickUrl(
  env.PUBLIC_REST_URL,
  env.REST_URL,
  buildGatewayUrl("/api"),
);
export const SOAP_NS = env.SOAP_NS || "http://userauth.soap.service/";
export const GATEWAY_URL = pickUrl(
  env.PUBLIC_GATEWAY_URL,
  defaultGatewayOrigin || "/gateway",
);
