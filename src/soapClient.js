import { SOAP_NS, SOAP_URL } from "./config.js";

console.info(
  `[SOAP] Client initialized with SOAP_URL=${SOAP_URL}, SOAP_NS=${SOAP_NS}`,
);

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

async function postSoap(xml, action = "") {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.info(`[SOAP-${requestId}] Initiating request`, {
    url: SOAP_URL,
    action: action || "(empty)",
    soapNs: SOAP_NS,
  });

  console.debug(
    `[SOAP-${requestId}] XML Payload:`,
    xml.slice(0, 500) + (xml.length > 500 ? "..." : ""),
  );

  try {
    const headers = {
      "Content-Type": "text/xml;charset=UTF-8",
    };

    // Only set SOAPAction if provided
    if (action) {
      headers["SOAPAction"] = action;
      console.debug(
        `[SOAP-${requestId}] SOAPAction header set to: "${action}"`,
      );
    }

    console.info(`[SOAP-${requestId}] Request headers:`, headers);

    const res = await fetch(SOAP_URL, {
      method: "POST",
      headers,
      body: xml,
    });

    const text = await res.text();
    console.info(`[SOAP-${requestId}] Response received`, {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get("content-type"),
      contentLength: text.length,
    });

    if (!res.ok) {
      console.error(`[SOAP-${requestId}] Request failed (${res.status}):`, {
        status: res.status,
        statusText: res.statusText,
        responsePreview: text.slice(0, 300),
      });
      throw new Error(`SOAP request failed (${res.status}): ${text}`);
    }

    console.debug(`[SOAP-${requestId}] Parsing response XML`);
    return new DOMParser().parseFromString(text, "text/xml");
  } catch (error) {
    console.error(`[SOAP-${requestId}] Exception occurred:`, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

function getText(doc, tag) {
  const byNs = doc.getElementsByTagNameNS("*", tag);
  if (byNs?.length) return byNs[0].textContent ?? "";
  const plain = doc.getElementsByTagName(tag);
  return plain?.length ? (plain[0].textContent ?? "") : "";
}

export async function registerUser({ username, password, email }) {
  console.info(`[SOAP-REGISTER] Registering user: ${username}`);
  const xml = envelope(`
<ser:RegisterUserRequest>
  <ser:username>${escapeXml(username)}</ser:username>
  <ser:password>${escapeXml(password)}</ser:password>
  <ser:email>${escapeXml(email)}</ser:email>
</ser:RegisterUserRequest>`);

  try {
    const doc = await postSoap(xml, `${SOAP_NS}RegisterUserRequest`);
    const result = {
      success: getText(doc, "success") === "true",
      message: getText(doc, "message"),
      userId: Number(getText(doc, "userId") || 0),
    };
    console.info(`[SOAP-REGISTER] Result:`, result);
    return result;
  } catch (error) {
    console.error(`[SOAP-REGISTER] Error:`, error.message);
    throw error;
  }
}

export async function loginUser({ username, password }) {
  console.info(`[SOAP-LOGIN] Attempting login for user: ${username}`);
  const xml = envelope(`
<ser:LoginUserRequest>
  <ser:username>${escapeXml(username)}</ser:username>
  <ser:password>${escapeXml(password)}</ser:password>
</ser:LoginUserRequest>`);

  console.debug(`[SOAP-LOGIN] Full XML being sent:`, xml);

  try {
    const action = `${SOAP_NS}LoginUserRequest`;
    console.info(`[SOAP-LOGIN] SOAPAction will be: ${action}`);

    const doc = await postSoap(xml, action);
    const result = {
      success: getText(doc, "success") === "true",
      message: getText(doc, "message"),
      token: getText(doc, "token"),
    };
    console.info(`[SOAP-LOGIN] Login result:`, {
      success: result.success,
      message: result.message,
    });
    return result;
  } catch (error) {
    console.error(`[SOAP-LOGIN] Login error:`, error.message);
    throw error;
  }
}

export async function validateToken(token) {
  console.info(`[SOAP-VALIDATE] Validating token`);
  const xml = envelope(`
<ser:ValidateTokenRequest>
  <ser:token>${escapeXml(token)}</ser:token>
</ser:ValidateTokenRequest>`);

  try {
    const doc = await postSoap(xml, `${SOAP_NS}ValidateTokenRequest`);
    const result = {
      valid: getText(doc, "valid") === "true",
      userId: Number(getText(doc, "userId") || 0),
      username: getText(doc, "username"),
    };
    console.info(`[SOAP-VALIDATE] Validation result:`, {
      valid: result.valid,
      username: result.username,
    });
    return result;
  } catch (error) {
    console.error(`[SOAP-VALIDATE] Validation error:`, error.message);
    throw error;
  }
}
