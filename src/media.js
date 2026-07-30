import https from "node:https";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 Chrome/138 Safari/537.36";

const TRUSTED_MEDIA_HOSTS = Object.freeze([
  "cdn.discordapp.com",
  "media.discordapp.net",
  "nitter.net",
  "static.klipy.com",
  "media.tenor.com",
  "c.tenor.com",
  "media.giphy.com",
  "i.imgur.com",
]);

function isTrustedMediaHost(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    TRUSTED_MEDIA_HOSTS.includes(normalized) ||
    normalized.endsWith(".discordapp.net")
  );
}

export function isTrustedMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && isTrustedMediaHost(url.hostname);
  } catch {
    return false;
  }
}

function requestBuffer(url, maxBytes, redirectsRemaining) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "*/*",
          "User-Agent": USER_AGENT,
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (
          status >= 300 &&
          status < 400 &&
          response.headers.location &&
          redirectsRemaining > 0
        ) {
          response.resume();
          const redirectUrl = new URL(response.headers.location, url).href;
          if (!isTrustedMediaUrl(redirectUrl)) {
            reject(new Error("Media redirect target is not trusted."));
            return;
          }
          requestBuffer(
            redirectUrl,
            maxBytes,
            redirectsRemaining - 1,
          ).then(resolve, reject);
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(new Error(`Media request returned HTTP ${status}.`));
          return;
        }

        const declaredLength = Number.parseInt(
          response.headers["content-length"] ?? "",
          10,
        );
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > maxBytes
        ) {
          response.resume();
          reject(new Error("Media exceeds the archive size limit."));
          return;
        }

        const chunks = [];
        let received = 0;
        response.on("data", (chunk) => {
          received += chunk.length;
          if (received > maxBytes) {
            request.destroy(
              new Error("Media exceeds the archive size limit."),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: String(
              response.headers["content-type"] ?? "",
            )
              .split(";")[0]
              .trim()
              .toLowerCase(),
          });
        });
      },
    );
    request.setTimeout(20_000, () => {
      request.destroy(new Error("Media request timed out."));
    });
    request.on("error", reject);
  });
}

export async function downloadTrustedMedia(url, maxBytes = 8 * 1024 * 1024) {
  if (!isTrustedMediaUrl(url)) {
    throw new Error("Media URL is not on the trusted-host allowlist.");
  }
  return requestBuffer(url, maxBytes, 3);
}

export function extensionForMedia(contentType, url = "") {
  const type = String(contentType).toLowerCase();
  const byType = {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  if (byType[type]) {
    return byType[type];
  }

  try {
    const match = new URL(url).pathname.match(
      /\.([a-z0-9]{2,5})$/i,
    );
    return match?.[1]?.toLowerCase() ?? "bin";
  } catch {
    return "bin";
  }
}
