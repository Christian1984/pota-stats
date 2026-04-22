import tsPlugin from "@typescript-eslint/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  ...tsPlugin.configs["flat/recommended"],
  {
    ...nextPlugin.configs["core-web-vitals"],
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
  },
  {
    files: ["*.config.{js,cjs}", "jest.setup.*", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];
