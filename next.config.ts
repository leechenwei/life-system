import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray ~/package-lock.json otherwise confuses Turbopack.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
