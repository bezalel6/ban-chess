/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent double mounting
  typescript: {
    // During production builds, Next.js will fail the build if there are type errors
    ignoreBuildErrors: false,
    // This ensures tsc runs in strict mode
    tsconfigPath: './tsconfig.json'
  }
}

module.exports = nextConfig