import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // @react-pdf/renderer has node-style deps that bundlers shouldn't try to
  // process — keep it external so server PDF rendering works cleanly.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
