export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_OBJECT");
  }
  return value as Record<string, unknown>;
}
export function text(value: unknown, max: number, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new HttpError(400, `INVALID_${name}`);
  }
  return value;
}
export async function body(req: Request, max = 32768) {
  if (!(req.headers.get("content-type") || "").startsWith("application/json")) {
    throw new HttpError(415, "JSON_REQUIRED");
  }
  if (Number(req.headers.get("content-length")) > max) {
    throw new HttpError(413, "BODY_TOO_LARGE");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "BODY_REQUIRED");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      const value = chunk.value;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new HttpError(413, "BODY_TOO_LARGE");
      }
      chunks.push(value);
      chunk = await reader.read();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return object(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "INVALID_JSON");
  } finally {
    reader.releaseLock();
  }
}
export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(503, `MISSING_${name}`);
  return value;
}
export async function fetchJSON(
  url: string,
  init: RequestInit,
  timeout = 15000,
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      throw new HttpError(
        response.status === 404 ? 422 : 502,
        "UPSTREAM_FAILURE",
      );
    }
    return await body(
      new Request("https://upstream.internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: response.body,
      }),
      1048576,
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, "UPSTREAM_UNAVAILABLE");
  }
}
