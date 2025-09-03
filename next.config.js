/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent double mounting
  output: 'standalone', // Required for Docker deployments
  typescript: {
    // During production builds, Next.js will fail the build if there are type errors
    ignoreBuildErrors: false,
    // This ensures tsc runs in strict mode
    tsconfigPath: './tsconfig.json'
  },
  // Ensure public files are served correctly in standalone mode
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/**/*']
    }
  }
}

module.exports = nextConfig