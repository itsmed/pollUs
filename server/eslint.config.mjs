import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import path from "path";
import { fileURLToPath } from "url";
import n from "eslint-plugin-n";
import security from "eslint-plugin-security";
import unicorn from "eslint-plugin-unicorn";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config([
  js.configs.recommended,
  tseslint.configs.recommended,
  n.configs["flat/recommended"],
  security.configs.recommended,
  unicorn.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        tsconfigRootDir: dirname,
      },
    },
  },
  {
    files: ["tests/**"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
]);
