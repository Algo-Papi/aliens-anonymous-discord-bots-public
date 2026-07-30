import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const trackedFiles = execFileSync(
  "git",
  ["ls-files", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const forbiddenPaths = [
  /(^|\/)\.env$/iu,
  /(^|\/)(?:data|logs?|node_modules)\//iu,
  /\.(?:db|sqlite|sqlite3|log|pem|key|p12|pfx)$/iu,
  /^PROJECT_HANDOFF\.md$/iu,
  /^assets\/.*\.(?:gif|jpe?g|png|webp)$/iu,
];

const forbiddenText = [
  {
    label: "personal Windows user path",
    pattern: /[A-Za-z]:\\Users\\[^\\\r\n]+\\/giu,
  },
  {
    label: "OpenAI API key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/gu,
  },
  {
    label: "GitHub token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/gu,
  },
  {
    label: "Discord MFA token",
    pattern: /\bmfa\.[A-Za-z0-9_-]{40,}\b/gu,
  },
  {
    label: "Discord webhook credential",
    pattern:
      /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/gu,
  },
  {
    label: "private key",
    pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/gu,
  },
];

const snowflakePattern = /(?<!\d)\d{17,20}(?!\d)/gu;
const snowflakeAllowed = (path) =>
  path.startsWith("test/") ||
  path.startsWith("agent-j/test/") ||
  path === "CONTRIBUTING.md";

const failures = [];
for (const path of trackedFiles) {
  if (forbiddenPaths.some((pattern) => pattern.test(path))) {
    failures.push(`${path}: forbidden public-repository path`);
    continue;
  }

  const extension = extname(path).toLowerCase();
  if (
    ![
      "",
      ".cjs",
      ".css",
      ".env",
      ".example",
      ".html",
      ".js",
      ".json",
      ".md",
      ".mjs",
      ".ps1",
      ".txt",
      ".yml",
      ".yaml",
    ].includes(extension)
  ) {
    continue;
  }

  const contents = readFileSync(path, "utf8");
  for (const { label, pattern } of forbiddenText) {
    pattern.lastIndex = 0;
    if (pattern.test(contents)) {
      failures.push(`${path}: ${label}`);
    }
  }

  snowflakePattern.lastIndex = 0;
  if (!snowflakeAllowed(path) && snowflakePattern.test(contents)) {
    failures.push(`${path}: Discord-like numeric ID outside a test fixture`);
  }
}

if (failures.length > 0) {
  console.error("Public-safety check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Public-safety check passed for ${trackedFiles.length} tracked files.`,
  );
}
