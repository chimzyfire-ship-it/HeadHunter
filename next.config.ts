import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This line is MANDATORY for pdf-parse to work
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;