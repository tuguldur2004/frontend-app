// Use runtime-injected values from /env.js when available (window.__ENV),
// otherwise fall back to relative paths which work when the gateway proxies.
// All frontend requests must go through the API Gateway.
// Ignore any environment-provided absolute URLs for REST/SOAP endpoints.
// Always use gateway-relative paths.
// Use the direct WSDL endpoint for SOAP calls
export const SOAP_URL = "gateway/soap";
export const REST_URL = "/api";
const env = typeof window !== "undefined" && window.__ENV ? window.__ENV : {};
export const SOAP_NS = env.SOAP_NS || "http://userauth.soap.service/";
export const GATEWAY_URL = "/gateway";
