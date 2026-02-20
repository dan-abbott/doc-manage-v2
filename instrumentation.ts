/**
 * Next.js Instrumentation Hook
 * instrumentation.ts  (must live at the project root, not inside app/)
 *
 * Runs once when the Next.js server starts, before any requests are handled.
 * This is the correct place to validate environment variables and do any
 * other startup checks.
 *
 * Enabled via: experimental.instrumentationHook = true in next.config.js
 * (already set in your config)
 */

export async function register() {
  // Only run on the server (not in the browser bundle or edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnvironment } = await import('@/lib/config/validate-env')
    validateEnvironment()
  }
}
