/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Allow multiple dev servers on different ports by isolating cache/build dirs per port via env overrides
  experimental: {
    manualClientBasePath: true,
  },
  webpack: (config) => {
    // No-op; placeholder if we later need to vary output by port
    return config;
  },
};

export default nextConfig;
