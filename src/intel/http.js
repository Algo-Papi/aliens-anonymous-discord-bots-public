const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export class IntelHttpError extends Error {
  constructor(message, { code, status = null, url, cause } = {}) {
    super(message, { cause });
    this.name = "IntelHttpError";
    this.code = code ?? "FETCH_FAILED";
    this.status = status;
    this.url = url ?? null;
  }
}

export function conditionalHeaders(validators = {}) {
  const headers = {};
  if (validators.etag) {
    headers["If-None-Match"] = String(validators.etag);
  }
  if (validators.lastModified) {
    headers["If-Modified-Since"] = String(validators.lastModified);
  }
  return headers;
}

export function responseValidators(headers, previous = {}) {
  return Object.freeze({
    etag: headers.get("etag") ?? previous.etag ?? null,
    lastModified:
      headers.get("last-modified") ?? previous.lastModified ?? null,
  });
}

async function readBoundedText(response, { maximumBytes, url }) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new IntelHttpError(
      `Official feed exceeded its ${maximumBytes}-byte limit.`,
      { code: "BODY_TOO_LARGE", status: response.status, url },
    );
  }

  if (!response.body?.getReader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maximumBytes) {
      throw new IntelHttpError(
        `Official feed exceeded its ${maximumBytes}-byte limit.`,
        { code: "BODY_TOO_LARGE", status: response.status, url },
      );
    }
    return new TextDecoder().decode(buffer);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      received += value.byteLength;
      if (received > maximumBytes) {
        await reader.cancel();
        throw new IntelHttpError(
          `Official feed exceeded its ${maximumBytes}-byte limit.`,
          { code: "BODY_TOO_LARGE", status: response.status, url },
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export async function requestText(
  url,
  {
    fetchImpl = globalThis.fetch,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maximumBytes = DEFAULT_MAX_BYTES,
    headers: suppliedHeaders = {},
    validators = {},
    onValidators,
  } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A Fetch-compatible implementation is required.");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs must be a positive number.");
  }
  if (!Number.isFinite(maximumBytes) || maximumBytes <= 0) {
    throw new TypeError("maximumBytes must be a positive number.");
  }

  const headers = new Headers(suppliedHeaders);
  for (const [name, value] of Object.entries(
    conditionalHeaders(validators),
  )) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  const controller = new AbortController();
  const timeoutReason = new IntelHttpError(
    `Official feed request timed out after ${timeoutMs}ms.`,
    { code: "TIMEOUT", url },
  );
  const timeout = setTimeout(() => controller.abort(timeoutReason), timeoutMs);
  timeout.unref?.();

  const abortFromCaller = () => {
    controller.abort(
      new IntelHttpError("Official feed request was aborted.", {
        code: "ABORTED",
        url,
        cause: signal?.reason,
      }),
    );
  };
  if (signal?.aborted) {
    abortFromCaller();
  } else {
    signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "follow",
      credentials: "omit",
    });
    const nextValidators = responseValidators(
      response.headers,
      validators,
    );

    if (response.status === 304) {
      await onValidators?.(nextValidators, {
        status: response.status,
        notModified: true,
        url,
      });
      return Object.freeze({
        status: response.status,
        notModified: true,
        text: null,
        validators: nextValidators,
      });
    }
    if (!response.ok) {
      response.body?.cancel?.().catch?.(() => {});
      throw new IntelHttpError(
        `Official feed returned HTTP ${response.status}.`,
        {
          code: "HTTP_STATUS",
          status: response.status,
          url,
        },
      );
    }

    const text = await readBoundedText(response, {
      maximumBytes,
      url,
    });
    await onValidators?.(nextValidators, {
      status: response.status,
      notModified: false,
      url,
    });
    return Object.freeze({
      status: response.status,
      notModified: false,
      text,
      validators: nextValidators,
    });
  } catch (error) {
    if (error instanceof IntelHttpError) {
      throw error;
    }
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof IntelHttpError) {
        throw reason;
      }
    }
    throw new IntelHttpError("Official feed request failed.", {
      code: "FETCH_FAILED",
      url,
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function requestJson(url, options = {}) {
  const result = await requestText(url, options);
  if (result.notModified) {
    return Object.freeze({ ...result, data: null });
  }

  try {
    return Object.freeze({
      ...result,
      data: JSON.parse(result.text),
    });
  } catch (error) {
    throw new IntelHttpError("Official feed returned invalid JSON.", {
      code: "INVALID_JSON",
      status: result.status,
      url,
      cause: error,
    });
  }
}
