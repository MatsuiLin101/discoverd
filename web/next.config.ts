import type { NextConfig } from "next";
import type { RemotePattern } from "next/dist/shared/lib/image-config";

// Derive the file host from the configured public base URL so next/image trusts it.
// Local driver serves files via relative `/uploads/...` paths (no remote pattern needed).
const storageBase = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL;
const storagePattern: RemotePattern[] = (() => {
  if (!storageBase) return [];
  try {
    const { protocol, hostname } = new URL(storageBase);
    return [{ protocol: protocol.replace(":", "") as "http" | "https", hostname }];
  } catch {
    return [];
  }
})();

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      ...storagePattern,
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
