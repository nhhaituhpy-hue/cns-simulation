import { AiScenarioError } from "../scenario-generation/types";
export const APPROVED_AI_BASE_URL = "https://cliproxy-vn.hainh.tech/v1";
const APPROVED_AI_BASE_URLS = [APPROVED_AI_BASE_URL, "https://cliproxy.cnsvn.com/v1"] as const;
export function approvedAiBaseUrl(value: string): string | null {
  return APPROVED_AI_BASE_URLS.find(base => value === base || value === `${base}/`) ?? null;
}
export interface AiProviderConfig { baseUrl: string; apiKey: string; model: string; timeoutMs: number; maxTokens: number }
export function loadAiProviderConfig(env: Record<string, string | undefined> = process.env): AiProviderConfig {
  const baseUrl = approvedAiBaseUrl(env.CNS_AI_BASE_URL ?? APPROVED_AI_BASE_URL);
  // Exact allowlist intentionally also rejects credentials, queries, ports, redirects and encoded paths.
  if (!baseUrl) {
    throw new AiScenarioError("PROVIDER_CONFIGURATION", "AI provider must use the approved HTTPS endpoint.");
  }
  const apiKey = env.CNS_AI_API_KEY;
  if (!apiKey?.trim() || apiKey.length > 4096 || /[\r\n]/.test(apiKey)) {
    throw new AiScenarioError("PROVIDER_NOT_CONFIGURED", "AI provider credentials are not configured.");
  }
  const model = env.CNS_AI_MODEL || "gpt-5.6-luna";
  if (!/^[a-zA-Z0-9._/-]{1,128}$/.test(model)) throw new AiScenarioError("PROVIDER_CONFIGURATION", "AI model configuration is invalid.");
  const timeoutMs = Number(env.CNS_AI_TIMEOUT_MS ?? 60_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) {
    throw new AiScenarioError("PROVIDER_CONFIGURATION", "AI timeout must be between 1000 and 120000 milliseconds.");
  }
  return { baseUrl, apiKey, model, timeoutMs, maxTokens: 2400 };
}
