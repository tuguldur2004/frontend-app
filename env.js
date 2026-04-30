// Runtime configuration for standalone frontend deployments (e.g. App Platform static site).
// Set these values to your gateway public URL so browser calls are sent to the API gateway.
window.__ENV = {
  PUBLIC_GATEWAY_URL: "https://api.yourdomain.com",
  PUBLIC_REST_URL: "https://api.yourdomain.com/api",
  PUBLIC_SOAP_URL: "https://api.yourdomain.com/api/soap",
  PUBLIC_FILE_MANAGER_URL: "https://api.yourdomain.com/api/files",
};
