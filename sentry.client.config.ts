import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Capture replay sessions for error investigation
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
  replaysSessionSampleRate: 0.1, // Capture 10% of normal sessions

  // Integrate with Session Replay
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // Mask all text for privacy
      blockAllMedia: true, // Block all media for privacy
    }),
  ],

  // Filter out noise
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    // Network errors
    'NetworkError',
    'Network request failed',
    // Supabase session errors (common, not critical)
    'session_not_found',
  ],

  // Add custom tags
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry event (dev):', event);
      return null;
    }
    return event;
  },
});
