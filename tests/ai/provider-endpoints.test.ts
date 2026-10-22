// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAiProviderConfig } from "@/lib/ai/provider/config";
import { requestScenarioJson } from "@/lib/ai/provider/client";
const previous = "https://cliproxy-vn.hainh.tech/v1";
const current = "https://cliproxy.cnsvn.com/v1";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("explicitly approved provider endpoints", () => {
  it.each([current, `${current}/`, previous, `${previous}/`])("uses configured %s without silently reverting", async baseUrl => {
    const config = loadAiProviderConfig({ CNS_AI_BASE_URL: baseUrl, CNS_AI_API_KEY: "fixture-only", CNS_AI_MODEL: "gpt-5.6-luna" });
    expect(config.baseUrl).toBe(baseUrl.replace(/\/$/, ""));
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(`${config.baseUrl}/chat/completions`);
      expect(init.redirect).toBe("error");
      expect(JSON.parse(String(init.body))).toMatchObject({ model: "gpt-5.6-luna", stream: false, response_format: { type: "json_object" } });
      return new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }] }));
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(requestScenarioJson(config, [{ role: "user", content: "Fixture" }])).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps the existing default when no endpoint is configured", () => {
    expect(loadAiProviderConfig({ CNS_AI_API_KEY: "fixture-only" }).baseUrl).toBe(previous);
  });
  it.each([
    "http://cliproxy.cnsvn.com/v1", "https://cliproxy.cnsvn.com:444/v1", "https://name:pass@cliproxy.cnsvn.com/v1",
    "https://cliproxy.cnsvn.com/v1?token=bad", "https://cliproxy.cnsvn.com/v1#fragment", "https://cliproxy.cnsvn.com/v1/../admin",
    "https://cliproxy.cnsvn.com/v1/%2e%2e/admin", "https://cliproxy.cnsvn.com/v1//", "https://cliproxy.cnsvn.com/v1/chat/completions",
    "https://cliproxy.cnsvn.com.attacker.invalid/v1", "https://localhost/v1", "https://127.0.0.1/v1", "https://evil.invalid/v1",
  ])("rejects unapproved URL %s before any outbound request", async baseUrl => {
    expect(() => loadAiProviderConfig({ CNS_AI_BASE_URL: baseUrl, CNS_AI_API_KEY: "fixture-only" })).toThrow();
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(requestScenarioJson({ baseUrl, apiKey: "fixture-only", model: "gpt-5.6-luna", timeoutMs: 1000, maxTokens: 64 }, [])).rejects.toMatchObject({ code: "PROVIDER_CONFIGURATION" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
