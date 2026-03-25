import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    middlewareClientMaxBodySize: 30 * 1024 * 1024,
  } as any,
};

export default nextConfig;
