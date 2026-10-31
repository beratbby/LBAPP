import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Jede Seite ist eingeloggt und dynamisch, darum klassisches Rendering ohne Cache Components.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["pg"],
  experimental: {
    serverActions: {
      // Beweisfotos werden im Browser verkleinert, das hier ist nur Puffer.
      bodySizeLimit: "6mb",
    },
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
