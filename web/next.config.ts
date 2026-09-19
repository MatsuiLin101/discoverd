import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  images: {
    // All next/image requests are served through Cloudflare Image
    // Transformations at the edge (see src/lib/cf-image-loader.ts). The custom
    // loader bypasses the built-in optimizer entirely, so `remotePatterns` is no
    // longer consulted — the loader itself decides which hosts to transform.
    loader: "custom",
    loaderFile: "./src/lib/cf-image-loader.ts",
  },
};

export default nextConfig;
