import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "supabasekong-gcowgws0cookk0cscg0ccss0.swipego.app",
      },
    ],
  },
};

export default nextConfig;
