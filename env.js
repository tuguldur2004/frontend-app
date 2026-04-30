// Runtime configuration for standalone frontend deployments (e.g. App Platform static site).
// Set these values to your gateway public URL so browser calls are sent to the API gateway.
window.__ENV = {
  // Prefer HTTPS to avoid mixed-content when frontend is served over HTTPS.
  // Ensure the gateway supports HTTPS; otherwise use a secure proxy or configure the gateway with TLS.
  PUBLIC_GATEWAY_URL: "https://167.71.194.223",
  PUBLIC_REST_URL: "https://167.71.194.223/api",
  PUBLIC_SOAP_URL: "https://167.71.194.223/api/soap",
  PUBLIC_FILE_MANAGER_URL: "https://167.71.194.223/api/files",
};
