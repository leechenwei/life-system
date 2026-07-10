import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray ~/package-lock.json otherwise confuses Turbopack.
  turbopack: { root: path.resolve(".") },
  experimental: {
    // Default is 1MB, which rejects phone-camera uploads. Vercel's hard cap is
    // 4.5MB; images are client-compressed well below that before upload.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
