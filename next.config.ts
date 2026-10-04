import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Cached server shell + streamed dynamic data; see docs/01-app/getting-started/08-caching.
  cacheComponents: true,

  // The map is the product; there is no separate landing page. Redirecting
  // here (not in a page) avoids rendering and prerendering an empty route.
  async redirects() {
    return [{ source: "/", destination: "/map", permanent: false }]
  },
}

export default nextConfig
