import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Produces a self-contained .next/standalone build (server + only the node_modules it
  // actually traced as used) instead of requiring the full node_modules tree at runtime --
  // the difference between a several-hundred-MB Docker image and a genuinely small one. See
  // Dockerfile, which copies exactly that output.
  output: 'standalone',
};

export default nextConfig;
