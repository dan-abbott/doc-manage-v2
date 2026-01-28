// Check if Sentry is installed before importing
try {
  const Sentry = require("@sentry/nextjs");

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust this value in production
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
} catch (e) {
  // Sentry not installed, skip initialization
  console.warn('Sentry not installed - error monitoring disabled');
}

// Export to make this a proper module
export {};
