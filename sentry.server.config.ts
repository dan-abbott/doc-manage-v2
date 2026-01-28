// Check if Sentry is installed before importing
try {
  const Sentry = require("@sentry/nextjs");

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production (0.1 = 10%)
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Filter out noise
    ignoreErrors: [
      // Supabase session errors (common, not critical)
      'session_not_found',
      'AuthSessionMissingError',
    ],

    // Add context to all events
    beforeSend(event: any, hint: any) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry event (dev):', event);
        return null;
      }

      // Add custom context
      if (event.request) {
        event.tags = {
          ...event.tags,
          url: event.request.url,
        };
      }

      return event;
    },
  });
} catch (e) {
  // Sentry not installed, skip initialization
  console.warn('Sentry not installed - error monitoring disabled');
}

// Export to make this a proper module
export {};

// Export empty object to make this a valid module
export {}
