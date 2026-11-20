import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The ts-patterns rules are enforced by an editor hook (typescript-patterns-enforcer), not by ESLint.
// This empty plugin only lets `/* eslint-disable ts-patterns/<rule> -- reason */` comments name them,
// so data tables (facet values, mock prices) can opt out of no-magic-numbers without ESLint erroring.
const tsPatternsDirectives = {
  rules: { "no-magic-numbers": { create: () => ({}) } },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { plugins: { "ts-patterns": tsPatternsDirectives } },
  {
    // the stub rule never reports, so ESLint would call every ts-patterns directive "unused"
    files: ["src/lib/catalog/**/*.ts"],
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
