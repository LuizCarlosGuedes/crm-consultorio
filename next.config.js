/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@supabase/supabase-js'],
  images: {
    remotePatterns: [],
  },
  experimental: {
    isrMemoryCacheSize: 0,
  },
  generateBuildId: async () => {
    return Date.now().toString();
  },
};

module.exports = nextConfig;
