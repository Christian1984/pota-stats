import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  transpilePackages: ["@pota-stats/db"],
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../../"),
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@img/**",
      "node_modules/sharp/**",
      "node_modules/typescript/**",
      "node_modules/caniuse-lite/**",
    ],
  },
};

export default config;
