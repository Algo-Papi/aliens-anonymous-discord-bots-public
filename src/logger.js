import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LOG_PATH = fileURLToPath(
  new URL("../logs/citation-bureau.log", import.meta.url),
);

function write(level, message, details = {}) {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...details,
  });
  appendFileSync(LOG_PATH, `${line}\n`, "utf8");
}

export function logInfo(message, details) {
  write("info", message, details);
}

export function logError(message, error, details = {}) {
  write("error", message, {
    ...details,
    error: error instanceof Error ? error.stack : String(error),
  });
}
