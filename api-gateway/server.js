const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.GATEWAY_PORT || 8080;
const REST_BASE = process.env.REST_BASE_URL || "http://localhost:8080";
const SOAP_URL = process.env.SOAP_URL || "http://localhost:3001/ws";
const FRONTEND_DIR = path.resolve(__dirname, "..");
const CORS_ALLOWED = process.env.CORS_ALLOWED_ORIGINS || "*";
const PUBLIC_REST_URL = process.env.PUBLIC_REST_URL || "/api";
const PUBLIC_SOAP_URL = process.env.PUBLIC_SOAP_URL || "/gateway/soap";

app.use((req, res, next) => {
  // Respect configured allowed origins in production; default to permissive for dev
  res.header("Access-Control-Allow-Origin", CORS_ALLOWED);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// Runtime env injection for client-side JS modules. The frontend can read window.__ENV.
app.get("/env.js", (_req, res) => {
  const env = {
    REST_URL: process.env.PUBLIC_REST_URL || PUBLIC_REST_URL,
    SOAP_URL: process.env.PUBLIC_SOAP_URL || PUBLIC_SOAP_URL,
    GATEWAY_URL: process.env.GATEWAY_URL || "/gateway",
  };
  res.type("application/javascript");
  res.send(`window.__ENV = ${JSON.stringify(env)};`);
});

app.use(express.static(FRONTEND_DIR));

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getXmlTag(xml, tag) {
  const m = xml.match(
    new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "i"),
  );
  return m ? m[1] : "";
}

async function soapValidateToken(token) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://userauth.soap.service/">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:ValidateTokenRequest>
      <ser:token>${escapeXml(token)}</ser:token>
    </ser:ValidateTokenRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(SOAP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: '""',
    },
    body: envelope,
  });

  const xml = await res.text();
  if (!res.ok) return { valid: false, reason: `SOAP HTTP ${res.status}` };

  const valid = getXmlTag(xml, "valid") === "true";
  const username = getXmlTag(xml, "username");
  const role = getXmlTag(xml, "role");

  return { valid, username, role };
}

async function proxyToRest(req, res, rewrittenPath) {
  const targetUrl = `${REST_BASE}${rewrittenPath}`;
  const headers = { ...req.headers };
  delete headers.host;

  const init = {
    method: req.method,
    headers,
  };

  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.body &&
    Object.keys(req.body).length > 0
  ) {
    init.body = JSON.stringify(req.body);
  }

  const upstream = await fetch(targetUrl, init);
  const text = await upstream.text();

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "transfer-encoding") {
      res.setHeader(key, value);
    }
  });
  res.send(text);
}

// SOAP proxy endpoints so the browser does not call the SOAP service directly.
app.get("/gateway/soap*", async (req, res) => {
  try {
    const suffix = req.originalUrl.replace(/^\/gateway\/soap/, "");
    const target = SOAP_URL + suffix;

    const upstream = await fetch(target, {
      method: "GET",
      headers: { ...req.headers },
    });
    const text = await upstream.text();

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") res.setHeader(key, value);
    });
    res.send(text);
  } catch (e) {
    res.status(502).send("SOAP proxy error");
  }
});

app.post("/gateway/soap*", express.text({ type: "*/*" }), async (req, res) => {
  try {
    const suffix = req.originalUrl.replace(/^\/gateway\/soap/, "");
    const target = SOAP_URL + suffix;

    const headers = { ...req.headers };
    delete headers.host;
    const upstream = await fetch(target, {
      method: "POST",
      headers,
      body: req.body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") res.setHeader(key, value);
    });
    res.send(text);
  } catch (e) {
    res.status(502).send("SOAP proxy error");
  }
});

app.get("/gateway/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway", port: PORT });
});

// Generic health endpoint for platform health checks
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway", port: PORT });
});

app.get("/api/health", async (req, res) => {
  await proxyToRest(req, res, "/health");
});

app.use("/api/users", async (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Missing Bearer token", data: null });
  }

  try {
    const token = auth.substring(7).trim();
    const validation = await soapValidateToken(token);
    if (!validation.valid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token", data: null });
    }

    req.headers["x-auth-username"] = validation.username || "";
    req.headers["x-auth-role"] = validation.role || "";
    next();
  } catch (e) {
    return res.status(503).json({
      success: false,
      message: "Auth service unavailable",
      data: null,
    });
  }
});

app.all("/api/users*", async (req, res) => {
  const rewritten = req.originalUrl.replace(/^\/api/, "");
  await proxyToRest(req, res, rewritten);
});

app.get("/register", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "register.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "login.html"));
});

app.get("/profile", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "profile.html"));
});

app.get("/register.html", (_req, res) => res.redirect(301, "/register"));
app.get("/login.html", (_req, res) => res.redirect(301, "/login"));
app.get("/profile.html", (_req, res) => res.redirect(301, "/profile"));

app.get("/", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
  console.log(`Routes: /api/* -> ${REST_BASE}`);
  console.log(`Frontend: http://localhost:${PORT}/`);
});
