/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,  // Add this temporarily
  productionBrowserSourceMaps: true, // Needed for Sentry source maps
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Enable instrumentation for Sentry
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

// Check if we should use Sentry config wrapper
// Only wrap with Sentry if the package is actually installed
let finalConfig = nextConfig;

try {
  // Try to load Sentry - this will fail if package not installed
  const { withSentryConfig } = require("@sentry/nextjs");
  
  // Sentry configuration options
  const sentryWebpackPluginOptions = {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }

  const sentryOptions = {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
  
  // Wrap config with Sentry if package exists
  finalConfig = withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions);
  
} catch (e) {
  // Sentry not installed - use basic config
  console.log('Note: Sentry package not found, continuing without Sentry integration');
}

module.exports = finalConfig;
