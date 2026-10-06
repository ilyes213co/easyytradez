/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_PLATFORM_NAME: process.env.NEXT_PUBLIC_PLATFORM_NAME,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async redirects() {
    return [
      {
        source: "/dashboard/orders",
        destination: "/dashboard/boutique/orders",
        permanent: false,
      },
      {
        source: "/dashboard/products",
        destination: "/dashboard/boutique/products",
        permanent: false,
      },
      {
        source: "/dashboard/delivery",
        destination: "/dashboard/boutique/delivery",
        permanent: false,
      },
      {
        source: "/dashboard/create-store",
        destination: "/dashboard/boutique/create",
        permanent: false,
      },
      {
        source: "/dashboard/store",
        destination: "/dashboard/boutique",
        permanent: false,
      },
      {
        source: "/dashboard/stores",
        destination: "/dashboard/boutique",
        permanent: false,
      },
      {
        source: "/dashboard/store/:id",
        destination: "/dashboard/boutique/:id",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/stores",
        destination: "/api/stores",
      },
      {
        source: "/stores/:path*",
        destination: "/api/stores/:path*",
      },
      {
        source: "/products",
        destination: "/api/products",
      },
      {
        source: "/products/:path*",
        destination: "/api/products/:path*",
      },
      {
        source: "/upload/:path*",
        destination: "/api/upload/:path*",
      },
      {
        source: "/deploy/:path*",
        destination: "/api/deploy/:path*",
      },
      {
        source: "/analytics/:path*",
        destination: "/api/analytics/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
