// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NODE_ENV === 'production' ? '/tharoon-pos' : '',
};

export default nextConfig;