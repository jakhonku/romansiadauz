import type { NextConfig } from 'next';

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co').host;
  } catch {
    return 'placeholder.supabase.co';
  }
})();

const isDev = process.env.NODE_ENV === 'development';

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on script-src is a deliberate, documented compromise. Next.js can
 * emit a nonce instead, but only when every page opts out of static generation — which
 * would throw away the ISR strategy this site depends on. The residual risk is
 * mitigated by the fact that the only user-authored HTML on the site (rich-text article
 * bodies) is sanitised with DOMPurify both on write and on render.
 *
 * `'unsafe-eval'` is development-only; React Refresh needs it and it never ships.
 */
const contentSecurityPolicy = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://mc.yandex.ru`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' blob: data: https://${supabaseHost} https://i.ytimg.com https://img.youtube.com https://mc.yandex.ru`,
  `media-src 'self' https://${supabaseHost}`,
  `font-src 'self' data:`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://www.google-analytics.com https://mc.yandex.ru`,
  // YouTube for the video gallery, Google Maps for the contact page.
  `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://yandex.ru`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    // Deny the ambient capabilities this site never uses.
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
    // Matches the layout breakpoints actually used by the gallery and card grids.
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 200, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    // Import only the icons actually used instead of the whole lucide barrel file.
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns'],
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // The admin panel must never be cached by a shared proxy.
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
