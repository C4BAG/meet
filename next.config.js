// Sub-path the deployment is mounted under (e.g. an IIS sub-application at
// "/XPhoneConnect/demo-meeting"). Empty for a root deploy. Set at build time:
//   PowerShell: $env:NEXT_PUBLIC_BASE_PATH = '/XPhoneConnect/demo-meeting'; pnpm build
//   bash:       NEXT_PUBLIC_BASE_PATH=/XPhoneConnect/demo-meeting pnpm build
// Static export bakes this into every emitted asset URL, so a build is tied
// to one sub-path. Re-build to move the deployment.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

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
  basePath,
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
