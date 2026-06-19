/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true, // Cloudflare Pages doesn't support Next.js Image Optimization
  },
}

export default nextConfig
