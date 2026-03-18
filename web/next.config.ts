import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },
  experimental: {
    // Reduce build-time parallelism to avoid OOM on smaller machines/Windows.
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 25,
    staticGenerationRetryCount: 1,
  },
};

export default nextConfig;
