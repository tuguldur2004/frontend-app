// Runtime configuration for standalone frontend deployments (e.g. App Platform static site).
// The gateway is mounted at /api in the deployment, so the browser talks
// to the gateway through same-origin /api/* paths.
window.__ENV = {
  PUBLIC_GATEWAY_URL: "/",
};
