import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }
  return { errorMessage: String(error) };
}

export function createLogger(logPath) {
  function write(level, event, details = {}) {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(
      logPath,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        event,
        ...details,
      })}\n`,
      "utf8",
    );
  }

  return {
    info(event, details) {
      write("info", event, details);
    },
    error(event, error, details = {}) {
      write("error", event, {
        ...details,
        ...normalizeError(error),
      });
    },
  };
}
