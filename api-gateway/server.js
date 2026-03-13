const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.GATEWAY_PORT || 8080;
const REST_BASE = process.env.REST_BASE_URL || "http://localhost:3000";
const SOAP_URL = process.env.SOAP_URL || "http://localhost:3001/ws";
const FRONTEND_DIR = path.resolve(__dirname, "..", "frontend-app");

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
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

app.get("/gateway/health", (_req, res) => {
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
