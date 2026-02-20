/**
 * Environment variable validation
 * lib/config/validate-env.ts
 *
 * Called once at startup (via instrumentation.ts) to fail fast if the
 * deployment is missing critical configuration. Better to crash loudly
 * at boot than to fail silently at runtime mid-request.
 */

import { logger } from '@/lib/logger'

// ─── Required ────────────────────────────────────────────────────────────────

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
] as const

// ─── Optional (with sensible defaults) ───────────────────────────────────────

const OPTIONAL_ENV_VARS: Record<string, string> = {
  LOG_LEVEL: 'info',
  NODE_ENV: 'development',
  // Email — required for approval notifications, warn if missing
  RESEND_API_KEY: '(not set — email notifications will be disabled)',
  // Stripe — required for billing, warn if missing
  STRIPE_SECRET_KEY: '(not set — billing features will be disabled)',
  STRIPE_WEBHOOK_SECRET: '(not set — Stripe webhooks will be unverified)',
  // VirusTotal — optional file scanning
  VIRUSTOTAL_API_KEY: '(not set — file scanning will be disabled)',
  // Inngest — background jobs
  INNGEST_EVENT_KEY: '(not set — background jobs will be disabled)',
  // Sentry — error tracking
  NEXT_PUBLIC_SENTRY_DSN: '(not set — error tracking will be disabled)',
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateEnvironment(): void {
  const errors: string[] = []

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName]

    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${varName}`)
      continue
    }

    // Supabase URL must be a valid URL pointing at supabase.co
    if (varName === 'NEXT_PUBLIC_SUPABASE_URL') {
      try {
        const url = new URL(value)
        if (!url.hostname.includes('supabase')) {
          errors.push(`${varName} does not appear to be a valid Supabase URL (got: ${url.hostname})`)
        }
      } catch {
        errors.push(`${varName} is not a valid URL: ${value}`)
      }
    }

    // Site URL must be a valid URL
    if (varName === 'NEXT_PUBLIC_SITE_URL') {
      try {
        new URL(value)
      } catch {
        errors.push(`${varName} is not a valid URL: ${value}`)
      }
    }

    // Supabase keys are JWTs — must start with eyJ
    if (varName.includes('KEY') && !value.startsWith('eyJ')) {
      errors.push(`${varName} does not appear to be a valid JWT (should start with 'eyJ')`)
    }
  }

  // Warn about missing optional variables
  for (const [varName, description] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[varName]) {
      logger.warn({
        msg: `Optional environment variable not set`,
        variable: varName,
        impact: description,
      })
    }
  }

  // Fail hard if any required vars are missing or malformed
  if (errors.length > 0) {
    logger.error({
      msg: 'Environment validation failed — application cannot start',
      errors,
      errorCount: errors.length,
    })

    throw new Error(
      `Environment validation failed:\n${errors.map(e => `  ✗ ${e}`).join('\n')}`
    )
  }

  logger.info({
    msg: 'Environment validation passed',
    env: process.env.NODE_ENV,
    requiredVars: REQUIRED_ENV_VARS.length,
  })
}

// ─── Type-safe env access ─────────────────────────────────────────────────────

export function getEnv(key: string, required: true): string
export function getEnv(key: string, required: false): string | undefined
export function getEnv(key: string, required = true): string | undefined {
  const value = process.env[key]
  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}
