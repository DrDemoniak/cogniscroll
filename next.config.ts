import type { NextConfig } from "next";

/**
 * next.config.ts
 * Configuration Next.js pour CogniScroll.
 */
const nextConfig: NextConfig = {
  // Images Google pour les avatars OAuth
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
