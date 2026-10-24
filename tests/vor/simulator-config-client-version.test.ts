import { afterEach, expect, it, vi } from "vitest";
import { applySimulatorConfig, initializeSimulatorConfig, loadSimulatorConfig } from "@/lib/simulator-config/client";

afterEach(() => vi.unstubAllGlobals());

it.each(["GET", "POST", "PUT"])("new 1150A client opts in on %s without changing the write payload", async (method) => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ revision: 2 }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  const config = { kept: "unchanged" };
  if (method === "GET") await loadSimulatorConfig("dvor-1150a");
  if (method === "POST") await initializeSimulatorConfig("dvor-1150a");
  if (method === "PUT") await applySimulatorConfig({ simulatorId: "dvor-1150a", config, expectedRevision: 1 });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe("/api/simulator-config/dvor-1150a");
  expect(new Headers(options.headers).get("X-CNS-Simulator-Config-DTO")).toBe("dvor-1150a-extensions-v1");
  if (method !== "GET") expect(new Headers(options.headers).get("Content-Type")).toBe("application/json");
  if (method === "GET") expect(options.cache).toBe("no-store");
  if (method === "POST") expect(JSON.parse(options.body)).toEqual({});
  if (method === "PUT") expect(JSON.parse(options.body)).toEqual({ action: "apply", config, expectedRevision: 1 });
});

it.each(["GET", "POST", "PUT"])("does not negotiate a 1150A representation for other simulators (%s)", async (method) => {
  const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  if (method === "GET") await loadSimulatorConfig("dvor-1150");
  if (method === "POST") await initializeSimulatorConfig("dvor-1150");
  if (method === "PUT") await applySimulatorConfig({ simulatorId: "dvor-1150", config: {}, expectedRevision: 1 });
  expect(new Headers(fetch.mock.calls[0][1].headers).has("X-CNS-Simulator-Config-DTO")).toBe(false);
});
