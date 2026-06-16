import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Unbehandelte Promises explizit verbieten
      "@typescript-eslint/no-floating-promises": "error",
      // Keine any-Casts ohne expliziten Kommentar
      "@typescript-eslint/no-explicit-any": "warn",
      // Konsistente Type-Assertions
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as" }],
      // catch-Blöcke mit unknown
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
      // Kein ungenutzter Import
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Array-Callback-Return
      "array-callback-return": "error",
      // Keine doppelten Imports
      "no-duplicate-imports": "error",
      // Prefer const
      "prefer-const": "error",
    },
  },
];

export default eslintConfig;
