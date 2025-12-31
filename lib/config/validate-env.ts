/**
 * Environment variable validation
 * Validates required environment variables on application startup
 * Provides type-safe access to environment variables
 */

import { logger } from '@/lib/logger'

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  LOG_LEVEL: 'info',
  NODE_ENV: 'development',
} as const

/**
 * Validate all required environment variables are present and valid
 * Throws an error if validation fails
 */
export function validateEnvironment(): void {
  const errors: string[] = []

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName]
    
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${varName}`)
      continue
    }

    // Validate specific formats
    if (varName === 'NEXT_PUBLIC_SUPABASE_URL') {
      try {
        const url = new URL(value)
        if (!url.hostname.includes('supabase')) {
          errors.push(`${varName} does not appear to be a valid Supabase URL`)
        }
      } catch {
        errors.push(`${varName} is not a valid URL: ${value}`)
      }
    }

    // Validate JWT format for keys
    if (varName.includes('KEY') && !value.startsWith('eyJ')) {
      errors.push(`${varName} does not appear to be a valid JWT`)
    }
  }

  // Validate optional variables if present
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SITE_URL)
    } catch {
      errors.push(`NEXT_PUBLIC_SITE_URL is not a valid URL: ${process.env.NEXT_PUBLIC_SITE_URL}`)
    }
  }

  // Log warnings for missing optional variables
  for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[varName]) {
      logger.warn({
        msg: `Optional environment variable ${varName} not set, using default`,
        variable: varName,
        default: defaultValue,
      })
    }
  }

  // If there are any errors, log them all and throw
  if (errors.length > 0) {
    logger.error({
      msg: 'Environment validation failed',
      errors,
      errorCount: errors.length,
    })
    
    throw new Error(
      `Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    )
  }

  logger.info({
    msg: 'Environment validation passed',
    env: process.env.NODE_ENV,
    requiredVarsCount: REQUIRED_ENV_VARS.length,
  })
}

/**
 * Get environment variable with type safety
 * Throws error if variable is required but not set
 */
export function getEnv(key: string, required: true): string
export function getEnv(key: string, required: false): string | undefined
export function getEnv(key: string, required: boolean = true): string | undefined {
  const value = process.env[key]
  
  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  
  return value
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}

/**
 * Get the current site URL (with fallback)
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

/**
 * Validate environment on module load in production
 * In development, we'll be more lenient
 */
if (isProduction()) {
  try {
    validateEnvironment()
  } catch (error) {
    // Log to stderr since logger might not be initialized yet
    console.error('FATAL: Environment validation failed')
    console.error(error)
    process.exit(1)
  }
}
