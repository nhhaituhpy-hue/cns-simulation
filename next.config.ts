import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  // Server Function arguments can contain login passwords; keep them out of dev logs.
  logging: { serverFunctions: false },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
