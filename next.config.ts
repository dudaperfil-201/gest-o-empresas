import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload de vários boletos (PDFs) de uma vez pode passar do padrão de 1MB.
    serverActions: { bodySizeLimit: '25mb' },
  },
};

export default nextConfig;
