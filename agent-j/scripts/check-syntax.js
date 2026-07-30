import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "scripts", "test"];

function javascriptFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? javascriptFiles(path)
      : path.endsWith(".js")
        ? [path]
        : [];
  });
}

for (const file of roots.flatMap(javascriptFiles)) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Agent J syntax check passed.");
