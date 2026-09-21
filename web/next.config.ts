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
    // Each distinct width a browser requests is one Cloudflare transformation
    // counted against the monthly free allowance, so keep the candidate set
    // small. These few widths still cover phones → desktops, and AVIF makes the
    // "slightly larger than strictly needed" penalty negligible. (Next defaults
    // to 8 device + 7 image widths.) imageSizes must stay below the smallest
    // deviceSize (640).
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [128, 256],
    // Next 16 defaults `qualities` to [75] and coerces any other `quality` prop
    // to the nearest allowed value. Allow 60 so the large hero photos can be
    // served more compressed (shorter LCP on mobile) while everything else stays
    // at the default 75.
    qualities: [60, 75],
  },
};

export default nextConfig;
