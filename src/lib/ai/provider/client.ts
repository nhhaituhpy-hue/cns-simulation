import { approvedAiBaseUrl, type AiProviderConfig } from "./config";
import type { AiMessage } from "../scenario-generation/prompt";
import { AiScenarioError } from "../scenario-generation/types";

const MAX_RESPONSE_BYTES = 128 * 1024;
export async function requestScenarioJson(config: AiProviderConfig, messages: AiMessage[], signal?: AbortSignal): Promise<unknown> {
  if (signal?.aborted) throw new AiScenarioError("CANCELLED", "AI generation was cancelled.");
  if (approvedAiBaseUrl(config.baseUrl) !== config.baseUrl || config.timeoutMs < 1000 || config.timeoutMs > 120_000 || config.maxTokens > 2400) {
    throw new AiScenarioError("PROVIDER_CONFIGURATION", "AI provider configuration is invalid.");
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  let rejectAbort: (error: Error) => void = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(new AiScenarioError(timedOut ? "PROVIDER_TIMEOUT" : "CANCELLED", timedOut ? "AI provider timed out." : "AI generation was cancelled."));
  controller.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, config.timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await Promise.race([fetch(`${config.baseUrl}/chat/completions`, { method: "POST", redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` }, signal: controller.signal,
      body: JSON.stringify({ model: config.model, messages, response_format: { type: "json_object" }, reasoning_effort: "low", stream: false, max_tokens: config.maxTokens }) }), interrupted]);
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      if (response.status === 401 || response.status === 403) throw new AiScenarioError("PROVIDER_AUTH", "AI provider rejected authentication.");
      if (response.status === 429) throw new AiScenarioError("PROVIDER_RATE_LIMIT", "AI provider rate limit reached. Try again later.");
      if (response.status >= 500) throw new AiScenarioError("PROVIDER_UNAVAILABLE", "AI provider is temporarily unavailable.");
      throw new AiScenarioError("PROVIDER_REQUEST", "AI provider could not accept this request.");
    }
    if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) throw new AiScenarioError("PROVIDER_RESPONSE_TOO_LARGE", "AI provider response exceeded the size limit.");
    if (!response.body) throw new AiScenarioError("PROVIDER_INVALID_RESPONSE", "AI provider returned an empty response.");
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), interrupted]);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new AiScenarioError("PROVIDER_RESPONSE_TOO_LARGE", "AI provider response exceeded the size limit.");
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const choice = body?.choices?.[0];
    if (choice?.finish_reason === "length") throw new AiScenarioError("PROVIDER_TRUNCATED", "AI provider output was truncated. Try a shorter request.");
    if (choice?.finish_reason !== "stop" || choice?.message?.tool_calls || typeof choice?.message?.content !== "string") {
      throw new AiScenarioError("PROVIDER_INVALID_RESPONSE", "AI provider did not return a complete JSON selection.");
    }
    return JSON.parse(choice.message.content);
  } catch (error) {
    if (error instanceof AiScenarioError) throw error;
    if (controller.signal.aborted) throw new AiScenarioError(timedOut ? "PROVIDER_TIMEOUT" : "CANCELLED", timedOut ? "AI provider timed out." : "AI generation was cancelled.");
    if (error instanceof SyntaxError) throw new AiScenarioError("PROVIDER_INVALID_RESPONSE", "AI provider returned invalid JSON.");
    throw new AiScenarioError("PROVIDER_UNAVAILABLE", "AI provider is temporarily unavailable.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    controller.signal.removeEventListener("abort", onAbort);
    void reader?.cancel().catch(() => {});
    controller.abort();
  }
}
