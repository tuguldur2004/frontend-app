import { SOAP_NS, SOAP_URL } from "./config.js";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function envelope(innerXml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${SOAP_NS}">
  <soapenv:Header/>
  <soapenv:Body>
    ${innerXml}
  </soapenv:Body>
</soapenv:Envelope>`;
}

async function postSoap(xml) {
  const res = await fetch(SOAP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      SOAPAction: "",
    },
    body: xml,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SOAP request failed (${res.status}): ${text}`);
  }
  return new DOMParser().parseFromString(text, "text/xml");
}

function getText(doc, tag) {
  const byNs = doc.getElementsByTagNameNS("*", tag);
  if (byNs?.length) return byNs[0].textContent ?? "";
  const plain = doc.getElementsByTagName(tag);
  return plain?.length ? (plain[0].textContent ?? "") : "";
}

export async function registerUser({ username, password, email }) {
  const xml = envelope(`
<ser:RegisterUserRequest>
  <ser:username>${escapeXml(username)}</ser:username>
  <ser:password>${escapeXml(password)}</ser:password>
  <ser:email>${escapeXml(email)}</ser:email>
</ser:RegisterUserRequest>`);

  const doc = await postSoap(xml);
  return {
    success: getText(doc, "success") === "true",
    message: getText(doc, "message"),
    userId: Number(getText(doc, "userId") || 0),
  };
}

export async function loginUser({ username, password }) {
  const xml = envelope(`
<ser:LoginUserRequest>
  <ser:username>${escapeXml(username)}</ser:username>
  <ser:password>${escapeXml(password)}</ser:password>
</ser:LoginUserRequest>`);

  const doc = await postSoap(xml);
  return {
    success: getText(doc, "success") === "true",
    message: getText(doc, "message"),
    token: getText(doc, "token"),
  };
}

export async function validateToken(token) {
  const xml = envelope(`
<ser:ValidateTokenRequest>
  <ser:token>${escapeXml(token)}</ser:token>
</ser:ValidateTokenRequest>`);

  const doc = await postSoap(xml);
  return {
    valid: getText(doc, "valid") === "true",
    userId: Number(getText(doc, "userId") || 0),
    username: getText(doc, "username"),
  };
}
