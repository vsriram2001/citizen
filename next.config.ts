import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets a phone on the same Wi-Fi load the dev server by IP
  // (http://192.168.x.x:3000). Without it Next refuses the page's scripts to
  // other hosts, so the page renders but no button works. No effect in
  // production builds.
  allowedDevOrigins: ["192.168.*.*"],
  images: {
    // Next 16 whitelists allowed `quality` values; 75 is the default and the
    // hero photo requests 90 to counter its low source resolution.
    qualities: [75, 90],
  },
};

export default nextConfig;
