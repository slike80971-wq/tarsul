import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // output: "standalone",  // ← عطّل هذا لـ Vercel | فعّله لـ Docker,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "21.0.17.147",
    ".space-z.ai",
  ],
};

export default nextConfig;
