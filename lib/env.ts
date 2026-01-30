/**
 * Environment Variable Validation
 * 
 * This module validates that all required environment variables are present
 * and properly configured. It should be called at application startup to
 * fail fast if the configuration is invalid.
 */

interface EnvVar {
  key: string
  required: boolean
  description: string
  validation?: (value: string) => boolean
  errorMessage?: string
}

// Define all environment variables used in the application
const ENV_VARS: EnvVar[] = [
  // Supabase - Required
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validation: (value) => value.startsWith('https://') && value.includes('.supabase.co'),
    errorMessage: 'Must be a valid Supabase URL (https://[project-id].supabase.co)'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key',
    validation: (value) => value.startsWith('eyJ') && value.length > 100,
    errorMessage: 'Must be a valid JWT token from Supabase'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (admin access)',
    validation: (value) => value.startsWith('eyJ') && value.length > 100,
    errorMessage: 'Must be a valid JWT token from Supabase'
  },

  // Site Configuration - Required
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    required: true,
    description: 'Base URL of the application',
    validation: (value) => value.startsWith('http://') || value.startsWith('https://'),
    errorMessage: 'Must be a valid URL starting with http:// or https://'
  },

  // Sentry - Optional
  {
    key: 'NEXT_PUBLIC_SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error monitoring',
    validation: (value) => value.startsWith('https://') && value.includes('@') && value.includes('.ingest.'),
    errorMessage: 'Must be a valid Sentry DSN URL'
  },

  // Resend - Optional
  {
    key: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for sending emails',
    validation: (value) => value.startsWith('re_'),
    errorMessage: 'Must start with "re_"'
  },
  {
    key: 'FEEDBACK_EMAIL',
    required: false,
    description: 'Email address to receive feedback submissions',
    validation: (value) => value.includes('@') && value.includes('.'),
    errorMessage: 'Must be a valid email address'
  },

  // VirusTotal - Optional
  {
    key: 'VIRUSTOTAL_API_KEY',
    required: false,
    description: 'VirusTotal API key for file scanning',
    validation: (value) => value.length === 64,
    errorMessage: 'Must be a 64-character API key'
  },
]

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  missing: string[]
  configured: string[]
}

/**
 * Validate all environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const missing: string[] = []
  const configured: string[] = []

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.key]

    // Check if variable is set
    if (!value || value.trim() === '') {
      if (envVar.required) {
        errors.push(`❌ ${envVar.key} is required but not set`)
        errors.push(`   → ${envVar.description}`)
        missing.push(envVar.key)
      } else {
        warnings.push(`⚠️  ${envVar.key} is not set (optional)`)
        warnings.push(`   → ${envVar.description}`)
        missing.push(envVar.key)
      }
      continue
    }

    // Validate format if validation function provided
    if (envVar.validation && !envVar.validation(value)) {
      errors.push(`❌ ${envVar.key} has invalid format`)
      errors.push(`   → ${envVar.errorMessage || 'Invalid value'}`)
      errors.push(`   → Current value: ${value.substring(0, 20)}...`)
    } else {
      configured.push(envVar.key)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing,
    configured,
  }
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  console.log('\n' + '='.repeat(80))
  console.log('🔍 ENVIRONMENT VARIABLE VALIDATION')
  console.log('='.repeat(80))

  if (result.valid) {
    console.log('✅ All required environment variables are properly configured!')
  } else {
    console.log('❌ Environment validation FAILED')
  }

  console.log('\n📊 Summary:')
  console.log(`   Configured: ${result.configured.length}`)
  console.log(`   Missing: ${result.missing.length}`)
  console.log(`   Errors: ${result.errors.length}`)
  console.log(`   Warnings: ${result.warnings.length}`)

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:')
    result.errors.forEach(error => console.log(`   ${error}`))
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:')
    result.warnings.forEach(warning => console.log(`   ${warning}`))
  }

  if (result.configured.length > 0) {
    console.log('\n✅ CONFIGURED:')
    result.configured.forEach(key => console.log(`   ✓ ${key}`))
  }

  console.log('\n' + '='.repeat(80))
  console.log('')
}

/**
 * Validate environment and throw error if invalid
 * Use this at application startup
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv()
  printValidationResults(result)

  if (!result.valid) {
    throw new Error(
      `Environment validation failed. Please check the errors above and update your environment variables.`
    )
  }
}

/**
 * Get a typed and validated environment variable
 */
export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key]
  
  if (!value && !fallback) {
    throw new Error(`Environment variable ${key} is not set and no fallback provided`)
  }
  
  return value || fallback || ''
}

/**
 * Check if optional features are enabled
 */
export const features = {
  sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  resend: !!process.env.RESEND_API_KEY,
  virusTotal: !!process.env.VIRUSTOTAL_API_KEY,
} as const

/**
 * Export validated config object
 */
export const config = {
  supabase: {
    url: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  },
  site: {
    url: getEnvVar('NEXT_PUBLIC_SITE_URL'),
  },
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: features.sentry,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    feedbackEmail: process.env.FEEDBACK_EMAIL,
    enabled: features.resend,
  },
  virusTotal: {
    apiKey: process.env.VIRUSTOTAL_API_KEY,
    enabled: features.virusTotal,
  },
} as const
