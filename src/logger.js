const LOGGER_BUILD = "frontend-logger-2026-05-01";
const MAX_BUFFERED_LOGS = 300;

function getSessionId() {
  try {
    const existing = sessionStorage.getItem("frontendSessionId");
    if (existing) return existing;
    const generated = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("frontendSessionId", generated);
    return generated;
  } catch {
    return "session-unavailable";
  }
}

function normalizeError(err) {
  if (!err) return null;
  if (typeof err === "string") return { message: err };
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
}

function pushBufferedLog(entry) {
  if (typeof window === "undefined") return;
  if (!window.__frontendLogs) {
    window.__frontendLogs = [];
  }
  window.__frontendLogs.push(entry);
  if (window.__frontendLogs.length > MAX_BUFFERED_LOGS) {
    window.__frontendLogs.shift();
  }
}

function write(level, scope, message, details) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    sessionId: getSessionId(),
    page: typeof window !== "undefined" ? window.location?.pathname : "",
    details: details ?? null,
  };

  pushBufferedLog(entry);

  const method = console[level] ? level : "log";
  console[method](`[${scope}] ${message}`, entry);
}

export function logInfo(scope, message, details) {
  write("info", scope, message, details);
}

export function logWarn(scope, message, details) {
  write("warn", scope, message, details);
}

export function logError(scope, message, error, details) {
  write("error", scope, message, {
    ...details,
    error: normalizeError(error),
  });
}

export function getFrontendLogs() {
  if (typeof window === "undefined" || !window.__frontendLogs) return [];
  return [...window.__frontendLogs];
}

export function initFrontendLogging(scope = "APP") {
  if (typeof window === "undefined") return;

  if (!window.__frontendLoggingInitialized) {
    window.__frontendLoggingInitialized = true;

    window.addEventListener("error", (event) => {
      logError("GLOBAL", "Unhandled window error", event.error, {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      logError("GLOBAL", "Unhandled promise rejection", reason, {
        reasonType: typeof reason,
      });
    });

    window.dumpFrontendLogs = () => {
      const logs = getFrontendLogs();
      console.info("[GLOBAL] dumpFrontendLogs", {
        count: logs.length,
        build: LOGGER_BUILD,
      });
      return logs;
    };
  }

  logInfo(scope, "Frontend logging initialized", { build: LOGGER_BUILD });
}
