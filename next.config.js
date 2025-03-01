/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removing the 'output: export' line to support dynamic routes
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  swcMinify: false, // Disable minification to help identify syntax errors
};

module.exports = nextConfig;