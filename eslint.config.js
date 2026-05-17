import js from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid/configs/typescript.js";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  solid,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  },
];
