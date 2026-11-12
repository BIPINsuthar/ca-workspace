import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["bcryptjs"],
  experimental: {
    // Keep visited pages in the browser for 30 s so switching back to a tab is instant.
    // Any save (server action) clears this cache, so your own changes always show immediately.
    staleTimes: { dynamic: 30, static: 300 },
    // Smaller client bundles: only import the icons/chart parts actually used.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
