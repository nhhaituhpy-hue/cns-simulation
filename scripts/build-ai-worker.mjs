import { build } from "esbuild";
await build({
  entryPoints: ["src/ai-worker/entry.ts"],
  outfile: "dist-ai-worker/entry.mjs",
  bundle: true, platform: "node", target: "node24", format: "esm",
  packages: "external", tsconfig: "tsconfig.json", sourcemap: false,
  logLevel: "info",
});

await build({
  entryPoints: ["src/ai-worker/document-child.ts"],
  outfile: "dist-ai-worker/document-child.mjs",
  bundle: true, platform: "node", target: "node24", format: "esm",
  packages: "external", tsconfig: "tsconfig.json", sourcemap: false,
  logLevel: "info",
});
