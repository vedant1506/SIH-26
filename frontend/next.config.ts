import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8000/api/v1/:path*",
      },
    ];
  },
  async redirects() {

    return [
      {
        source: "/milestones",
        destination: "/projects",
        permanent: false,
      },
      {
        source: "/field-evidence",
        destination: "/actions",
        permanent: false,
      },
      {
        source: "/reports",
        destination: "/documents",
        permanent: false,
      },
      {
        source: "/data-quality",
        destination: "/documents",
        permanent: false,
      },
      {
        source: "/audit",
        destination: "/access-control",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
