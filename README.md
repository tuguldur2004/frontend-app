# frontend-app

Frontend register/login/profile.

## Important

`http://localhost:8080`

## Pages

- `/`
- `/register`
- `/login`
- `/profile`

## Profile avatar upload

- Profile page supports image upload through File Manager API.
- Flow: Frontend -> API Gateway `/api/files/upload` -> File Manager Service -> DigitalOcean Spaces.
- Returned URL is saved into REST profile `avatar` field.
- The gateway must have `FILE_MANAGER_BASE_URL` set to the file-manager service; otherwise uploads fall back to a dead localhost upstream in production.

## Deployment notes

- The application is served by the API gateway in `api-gateway/server.js` which serves static files, proxies `/api/*` to the REST backend, and forwards `/api/files/*` to the file-manager service.
- Runtime client config is exposed at `/env.js` (served by the gateway). The browser JS reads `window.__ENV` for `PUBLIC_GATEWAY_URL`, `PUBLIC_REST_URL`, and `PUBLIC_SOAP_URL`, and can fall back to same-origin `/api` and `/api/soap` during local gateway serving.

Quick Docker build (from repository root) for the gateway + frontend:

```bash
docker build -t myorg/soa-frontend:latest -f frontend-app/api-gateway/Dockerfile frontend-app
docker run -p 8080:8080 -e GATEWAY_PORT=8080 myorg/soa-frontend:latest
```

Set environment variables (examples): `REST_BASE_URL`, `SOAP_URL`, `FILE_MANAGER_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `PUBLIC_REST_URL`, `PUBLIC_SOAP_URL`, `PUBLIC_FILE_MANAGER_URL`, `PUBLIC_GATEWAY_URL`.

For your deployed gateway, set `PUBLIC_GATEWAY_URL` to the current gateway domain, or leave it unset and use same-origin `/api` routing behind the App Platform routes.
