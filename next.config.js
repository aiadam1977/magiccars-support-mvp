/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Upload size limit handled in individual route handlers
  // NOTE: For production, use a proper storage provider (e.g. S3)
}

module.exports = nextConfig
