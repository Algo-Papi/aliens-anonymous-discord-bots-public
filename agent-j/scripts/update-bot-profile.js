import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { loadRuntimeConfig } from "../src/config.js";

const MIME_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

async function dataUri(filePath) {
  const absolutePath = resolve(filePath);
  const mimeType = MIME_TYPES.get(extname(absolutePath).toLowerCase());
  if (!mimeType) {
    throw new Error(`Unsupported profile image type: ${extname(absolutePath)}`);
  }
  const contents = await readFile(absolutePath);
  return `data:${mimeType};base64,${contents.toString("base64")}`;
}

async function updateProfile() {
  const { token, clientId } = loadRuntimeConfig();
  const avatarPath = process.env.AGENT_J_AVATAR_PATH?.trim();
  const bannerPath = process.env.AGENT_J_BANNER_PATH?.trim();
  if (!avatarPath && !bannerPath) {
    throw new Error(
      "Set AGENT_J_AVATAR_PATH and/or AGENT_J_BANNER_PATH before running this script.",
    );
  }

  const body = {};
  if (avatarPath) {
    body.avatar = await dataUri(avatarPath);
  }
  if (bannerPath) {
    body.banner = await dataUri(bannerPath);
  }

  const response = await fetch("https://discord.com/api/v10/users/@me", {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `${response.status}: ${result.message ?? "Discord profile update failed"}`,
    );
  }
  if (result.id !== clientId) {
    throw new Error("Discord updated an unexpected bot identity.");
  }

  console.log(
    `Updated Agent J profile (${avatarPath ? "avatar" : ""}${
      avatarPath && bannerPath ? " and " : ""
    }${bannerPath ? "banner" : ""}).`,
  );
}

updateProfile().catch((error) => {
  console.error("Agent J profile update failed:", error.message);
  process.exitCode = 1;
});
