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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "**/*.cjs",
      "supabase/**",
      "public/**",
    ],
  },
  {
    // Base rules
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "react-hooks/exhaustive-deps": "warn",
      
      // File extension enforcement
      "react/jsx-filename-extension": ["error", { "extensions": [".tsx"] }],
      
      // React component rules
      "react/function-component-definition": [
        "warn",
        {
          "namedComponents": "function-declaration",
          "unnamedComponents": "arrow-function",
        },
      ],
      
      // Hooks rules
      "react-hooks/rules-of-hooks": "error",
      
      // Import organization
      "import/order": [
        "warn",
        {
          "groups": [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "object",
            "type",
          ],
          "pathGroups": [
            {
              "pattern": "react",
              "group": "builtin",
              "position": "before",
            },
            {
              "pattern": "next/**",
              "group": "builtin",
              "position": "before",
            },
            {
              "pattern": "@/**",
              "group": "internal",
              "position": "after",
            },
          ],
          "pathGroupsExcludedImportTypes": ["react", "next"],
          "newlines-between": "always",
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true,
          },
        },
      ],
      
      // TypeScript specific rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      
      // Next.js specific rules
      "next/no-img-element": "error",
      "next/no-unwanted-polyfillio": "error",
      "next/no-sync-scripts": "error",
    },
  },
];

export default eslintConfig;
