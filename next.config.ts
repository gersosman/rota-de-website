import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server listens on 0.0.0.0. Browsers open it as 127.0.0.1, and
  // Next blocks that host from the HMR socket unless it is listed here.
  // Without the socket, development hydration never finishes.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingIncludes: {
    "*": ["./migrations/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
