// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { init, captureRequestError, captureRouterTransitionStart, withSentryConfig } = vi.hoisted(() => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
  withSentryConfig: vi.fn((config, options) => ({ config, options })),
}));

vi.mock("@sentry/nextjs", () => ({ init, captureRequestError, captureRouterTransitionStart }));
vi.mock("@sentry/nextjs/config", () => ({ withSentryConfig }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const key of ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"]) {
    vi.stubEnv(key, "");
  }
});

afterEach(() => vi.unstubAllEnvs());

describe.each(["nodejs", "edge"])("%s reporting", (runtime) => {
  it("does not initialize without a DSN", async () => {
    vi.stubEnv("NEXT_RUNTIME", runtime);
    const { register, onRequestError } = await import("../src/instrumentation");
    await register();
    expect(init).not.toHaveBeenCalled();
    expect(onRequestError).toBe(captureRequestError);
  });

  it.each([false, true])("initializes with the public fallback or private override (%s)", async (privateDsn) => {
    vi.stubEnv("NEXT_RUNTIME", runtime);
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.com/1");
    if (privateDsn) vi.stubEnv("SENTRY_DSN", "https://private@example.com/2");
    const { register } = await import("../src/instrumentation");
    await register();
    expect(init).toHaveBeenCalledExactlyOnceWith({
      dsn: privateDsn ? "https://private@example.com/2" : "https://public@example.com/1",
      tracesSampleRate: 0.1,
      dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
    });
  });
});

it("never initializes the browser with the private server DSN", async () => {
  vi.stubEnv("SENTRY_DSN", "https://private@example.com/2");
  const { onRouterTransitionStart } = await import("../src/instrumentation-client");
  expect(init).not.toHaveBeenCalled();
  expect(onRouterTransitionStart).toBe(captureRouterTransitionStart);
});

it("initializes the browser with the public DSN", async () => {
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.com/1");
  await import("../src/instrumentation-client");
  expect(init).toHaveBeenCalledExactlyOnceWith({
    dsn: "https://public@example.com/1", tracesSampleRate: 0.1,
    dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
  });
});

it.each([[], ["SENTRY_AUTH_TOKEN"], ["SENTRY_ORG", "SENTRY_PROJECT"], ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"]])(
  "requires every upload credential: %j",
  async (...keys: string[]) => {
    for (const key of keys) vi.stubEnv(key, "test-value");
    await import("../next.config");
    expect(withSentryConfig).toHaveBeenCalledWith(
      expect.objectContaining({ output: "standalone" }),
      expect.objectContaining({ telemetry: false, sourcemaps: { disable: keys.length !== 3 } }),
    );
  },
);
