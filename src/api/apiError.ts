// Stable, locale-agnostic error codes thrown by the API layer.
// Human-readable text lives in the `errors` i18n namespace and is resolved
// at render time via resolveError() so messages follow the user's locale.
export type ApiErrorCode = "sessionExpired" | "network" | "server" | "notFound" | "generic";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  /** Message provided by the server (localized server-side from Step 7 onward). */
  readonly serverMessage?: string;
  /** Stable, machine-readable error key from the server body ({ code }); mapped to the `errors` namespace at render time. */
  readonly errorKey?: string;

  constructor(code: ApiErrorCode, opts: { status?: number; serverMessage?: string; errorKey?: string } = {}) {
    super(opts.serverMessage ?? opts.errorKey ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = opts.status;
    this.serverMessage = opts.serverMessage;
    this.errorKey = opts.errorKey;
  }
}

/** Session-expired: the caller has already cleared auth + redirected. */
export const sessionExpiredError = (): ApiError => new ApiError("sessionExpired");

/**
 * Build an ApiError from a failed Response, extracting a server-provided
 * message when present. Uses res.clone() so it is safe on a body the caller
 * has not yet read; do NOT use it after the body has been consumed.
 */
export async function httpError(res: Response): Promise<ApiError> {
  let serverMessage: string | undefined;
  let errorKey: string | undefined;
  try {
    const body = await res.clone().json();
    if (typeof body?.code === "string" && body.code.trim()) errorKey = body.code;
    const msg = body?.message ?? body?.error ?? body?.title;
    if (typeof msg === "string" && msg.trim()) serverMessage = msg;
  } catch {
    // Body was not JSON — leave serverMessage/errorKey undefined.
  }

  const code: ApiErrorCode =
    res.status === 404 ? "notFound" : res.status >= 500 ? "server" : "generic";
  return new ApiError(code, { status: res.status, serverMessage, errorKey });
}
