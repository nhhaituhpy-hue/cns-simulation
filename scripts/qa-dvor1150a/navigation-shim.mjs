// Explicit route-only shim. This bundle is not Next.js and proves no auth.
export const fixtureRouteEvents = [];
export function useSearchParams() { return new URLSearchParams(); }
export function usePathname() { return "/simulator/dvor-1150a"; }
export function useRouter() {
  return Object.fromEntries(["push", "replace", "back", "forward", "refresh", "prefetch"].map(key => [key, (...args) => fixtureRouteEvents.push({ key, args })]));
}
export function redirect() { throw new Error("Unexpected route redirect in isolated DVOR QA"); }
export function notFound() { throw new Error("Unexpected notFound in isolated DVOR QA"); }
