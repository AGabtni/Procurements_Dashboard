import i18n from "../i18n";
import { ApiError } from "../api/apiError";

type Translate = (key: string) => string;

/**
 * Resolve any thrown value into a user-facing, localized string.
 *
 * Precedence:
 *  1. A server-provided message (localized server-side from Step 7 onward).
 *  2. Friendly localized copy for session/network/not-found codes.
 *  3. The caller's contextual fallback key (e.g. "detail.loadFailed"), when given.
 *  4. A generic localized message.
 *
 * `t` may be bound to any namespace — pass namespace-prefixed keys ("errors:...")
 * for shared strings and plain keys for the caller's own namespace.
 */
export function resolveError(err: unknown, t: Translate, fallbackKey?: string): string {
  if (err instanceof ApiError) {
    // A recognized server error code maps to localized copy and wins over the
    // server's (English) message; unknown codes fall through to the message.
    if (err.errorKey && i18n.exists(`errors:${err.errorKey}`)) {
      return t(`errors:${err.errorKey}`);
    }
    if (err.serverMessage) return err.serverMessage;
    if (err.code === "sessionExpired") return t("errors:sessionExpired");
    if (err.code === "network") return t("errors:network");
    if (err.code === "notFound") return t("errors:notFound");
    // server / generic: prefer the caller's contextual message when available.
    if (fallbackKey) return t(fallbackKey);
    return t("errors:server");
  }
  // fetch() rejects with a TypeError on network failure (no Response).
  if (err instanceof TypeError) return t("errors:network");
  if (fallbackKey) return t(fallbackKey);
  return t("errors:generic");
}
