import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: { "/*": ["./node_modules/@img/**/*"] },
  outputFileTracingExcludes: { "*": ["./var/**/*", "./work/**/*", "./.git/**/*"] },
};

export default nextConfig;
