import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/nav/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=21600, s-maxage=60, stale-while-revalidate=60" }
        ]
      }
    ];
  }
};

export default nextConfig;