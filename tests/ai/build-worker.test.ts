import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI worker deployment artifact", () => {
  it("keeps the web runner as the default final stage and exposes no worker HTTP ingress", () => {
    const dockerfile = readFileSync(resolve("Dockerfile"), "utf8");
    expect(dockerfile.trim().endsWith("FROM runner AS web")).toBe(true);
    const worker = dockerfile.split("FROM base AS ai-worker")[1].split("FROM runner AS web")[0];
    expect(worker).toContain('CMD ["node", "dist-ai-worker/entry.mjs"]');
    expect(worker).toContain("USER nextjs");
    expect(worker).not.toContain("EXPOSE");
  });
  it("builds the actual supervised entry and copies parser dependencies explicitly", () => {
    const build = readFileSync(resolve("scripts/build-ai-worker.mjs"), "utf8");
    expect(build).toContain('entryPoints: ["src/ai-worker/entry.ts"]');
    expect(build).toContain('packages: "external"');
    expect(build).toContain('entryPoints: ["src/ai-worker/document-child.ts"]');
    const dockerfile = readFileSync(resolve("Dockerfile"), "utf8");
    expect(dockerfile).toContain("npm prune --omit=dev --ignore-scripts");
    const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    expect(packageJson.dependencies.unpdf).toBeTruthy();
    expect(packageJson.dependencies.mammoth).toBeTruthy();
  });
});
