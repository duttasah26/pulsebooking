/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second copy of the app (tests, previews) build into its own folder instead of sharing .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
