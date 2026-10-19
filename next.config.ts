import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API's URLs end in "/". Keep them intact when the browser calls /api/backend/...
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
