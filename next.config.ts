import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Native libvips files are loaded by Sharp's binary, outside the JS trace.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@img/sharp-*/**/*"],
  },
  images: {
    localPatterns: [
      { pathname: "**", search: "" },
      { pathname: "/_next/static/media/*", search: "?imageRuntime=1" },
      { pathname: "/images/simulator-icons/*", search: "?imageRuntime=1" },
    ],
  },
  poweredByHeader: false,
  devIndicators: false,
  // Server Function arguments can contain login passwords; keep them out of dev logs.
  logging: { serverFunctions: false },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
