import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "dist/**",
    "node_modules/**",
    "node_modules-legacy/**",
    "_prototype_ref/**",
    "*.jsx",
    "data.js",
    "scripts/**"
  ])
]);
