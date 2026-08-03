import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 whitelists allowed `quality` values; 75 is the default and the
    // hero photo requests 90 to counter its low source resolution.
    qualities: [75, 90],
  },
};

export default nextConfig;
