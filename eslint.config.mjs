import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@phosphor-icons/react",
              message:
                "Import từng icon từ @phosphor-icons/react/dist/csr/<IconName> để tránh làm phình cache Turbopack.",
            },
            {
              name: "@phosphor-icons/react/ssr",
              message:
                "Import từng icon từ @phosphor-icons/react/dist/ssr/<IconName> để tránh làm phình cache Turbopack.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
