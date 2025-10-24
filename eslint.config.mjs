import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("eslint:recommended"),
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    ignores: [
      "node_modules/**",
      ".vinxi/**",
      ".output/**",
      "dist/**",
      "build/**",
      "app/routeTree.gen.ts",
      "convex/_generated/**",
    ],
  },
];

export default eslintConfig;
