import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // Commented out for API routes support (x402, health). Re-enable when building static-only export.
  images: { unoptimized: true },

  // Transpile packages that ship raw TypeScript
  transpilePackages: [
    "passkey-kit",
    "passkey-factory-sdk",
    "passkey-kit-sdk",
  ],
};

export default nextConfig;
