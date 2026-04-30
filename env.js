// Runtime configuration for standalone frontend deployments (e.g. App Platform static site).
// Use same-origin gateway paths so the browser stays on the page origin while the
// gateway can continue talking to the SOAP service over HTTP internally.
window.__ENV = {
  PUBLIC_GATEWAY_URL: "/",
  PUBLIC_REST_URL: "/api",
  PUBLIC_SOAP_URL: "/api/soap",
  PUBLIC_FILE_MANAGER_URL: "/api/files",
};
