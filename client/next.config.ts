import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.congress.gov',
        port: '',
        pathname: '/img/member/**',
      },
    ],
  },
}

export default nextConfig;
