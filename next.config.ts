import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.divine-pride.net",
        pathname: "/images/items/item/**",
      },
      {
        protocol: "https",
        hostname: "static.divine-pride.net",
        pathname: "/images/skilltree/jobs/**",
      },
    ],
  },
};

export default nextConfig;
