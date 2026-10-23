import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.svg": {
        loaders: [{ loader: "@svgr/webpack", options: { dimensions: false } }],
        as: "*.js",
      },
    },
  },
  experimental: {
    agentUpgrade: "security",
  },
}

export default nextConfig
