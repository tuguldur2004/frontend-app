# frontend-app

Frontend register/login/profile.

## Important

`http://localhost:8080`

## Pages

- `/`
- `/register`
- `/login`
- `/profile`

## Deployment notes

- The application is served by the API gateway in `api-gateway/server.js` which serves static files and proxies `/api/*` to the REST backend.
- Runtime client config is exposed at `/env.js` (served by the gateway). The browser JS reads `window.__ENV` for `REST_URL` and `SOAP_URL`.

Quick Docker build (from repository root) for the gateway + frontend:

```bash
docker build -t myorg/soa-frontend:latest -f frontend-app/api-gateway/Dockerfile frontend-app
docker run -p 8080:8080 -e GATEWAY_PORT=8080 myorg/soa-frontend:latest
```

Set environment variables (examples): `REST_BASE_URL`, `SOAP_URL`, `CORS_ALLOWED_ORIGINS`, `PUBLIC_REST_URL`, `PUBLIC_SOAP_URL`.
