const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Same-origin check for state-changing browser requests. Production only trusts
 * CNS_PUBLIC_ORIGIN (or the request URL when unset). `next dev` additionally
 * accepts the dev server's own loopback origin, so a production
 * CNS_PUBLIC_ORIGIN in .env.local does not block local authoring.
 */
export function isTrustedRequestOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestOrigin = new URL(request.url).origin;
  if (origin === (process.env.CNS_PUBLIC_ORIGIN || requestOrigin)) return true;
  return process.env.NODE_ENV === "development" && origin === requestOrigin && LOOPBACK_HOSTS.has(new URL(requestOrigin).hostname);
}
