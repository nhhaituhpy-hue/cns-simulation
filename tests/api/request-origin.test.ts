// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { isTrustedRequestOrigin } from "@/lib/request-origin";

const req = (url: string, headers: Record<string, string>) => new Request(url, { method: "POST", headers });
afterEach(() => { vi.unstubAllEnvs(); });

describe("isTrustedRequestOrigin", () => {
  it("in production trusts only CNS_PUBLIC_ORIGIN, even for a loopback request", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CNS_PUBLIC_ORIGIN", "https://labs.cnsvn.com");
    expect(isTrustedRequestOrigin(req("https://labs.cnsvn.com/api", { origin: "https://labs.cnsvn.com" }))).toBe(true);
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", { origin: "http://localhost:3000" }))).toBe(false);
    expect(isTrustedRequestOrigin(req("http://127.0.0.1:3000/api", { origin: "http://127.0.0.1:3000" }))).toBe(false);
    expect(isTrustedRequestOrigin(req("https://labs.cnsvn.com/api", { origin: "https://evil.example" }))).toBe(false);
    expect(isTrustedRequestOrigin(req("https://labs.cnsvn.com/api", {}))).toBe(false);
    expect(isTrustedRequestOrigin(req("https://labs.cnsvn.com/api", { origin: "https://labs.cnsvn.com", "sec-fetch-site": "cross-site" }))).toBe(false);
  });

  it("in production without CNS_PUBLIC_ORIGIN falls back to the request origin", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CNS_PUBLIC_ORIGIN", "");
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", { origin: "http://localhost:3000" }))).toBe(true);
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", { origin: "http://localhost:4000" }))).toBe(false);
  });

  it("in development also trusts the dev server's own loopback origin", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("CNS_PUBLIC_ORIGIN", "https://labs.cnsvn.com");
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", { origin: "http://localhost:3000" }))).toBe(true);
    expect(isTrustedRequestOrigin(req("http://127.0.0.1:3000/api", { origin: "http://127.0.0.1:3000" }))).toBe(true);
    expect(isTrustedRequestOrigin(req("http://[::1]:3000/api", { origin: "http://[::1]:3000" }))).toBe(true);
    expect(isTrustedRequestOrigin(req("https://labs.cnsvn.com/api", { origin: "https://labs.cnsvn.com" }))).toBe(true);
  });

  it("in development still rejects foreign, non-loopback and cross-site origins", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("CNS_PUBLIC_ORIGIN", "https://labs.cnsvn.com");
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", { origin: "http://localhost:5173" }))).toBe(false);
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", { origin: "https://evil.example" }))).toBe(false);
    expect(isTrustedRequestOrigin(req("http://192.168.1.5:3000/api", { origin: "http://192.168.1.5:3000" }))).toBe(false);
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", {}))).toBe(false);
    expect(isTrustedRequestOrigin(req("http://localhost:3000/api", { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" }))).toBe(false);
  });
});
