/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the app deploys as plain HTML+JS with no Node runtime.
  // Token signing is delegated to the WebClientApi (called from the lobby
  // in the browser) so we no longer need any server-side handlers.
  output: 'export',
  // Emit each route as `<route>/index.html` instead of `<route>.html`, so any
  // static host (IIS, Nginx, plain file server) serves /lobby/, /custom/, etc.
  // without needing extension rewrites.
  trailingSlash: true,
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  images: {
    formats: ['image/webp'],
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Important: return the modified config
    config.module.rules.push({
      test: /\.mjs$/,
      enforce: 'pre',
      use: ['source-map-loader'],
    });

    return config;
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
