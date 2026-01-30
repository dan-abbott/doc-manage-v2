#!/usr/bin/env node

/**
 * Environment Validation Script
 * 
 * Run this before starting the development server or deploying to production
 * to ensure all required environment variables are properly configured.
 * 
 * Usage:
 *   node scripts/validate-env.js
 *   npm run validate-env
 * 
 * Note: This script does NOT load .env files - it only validates what's already
 * in process.env. Next.js automatically loads .env files during build.
 */

const ENV_VARS = [
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

function validateEnv() {
  const errors = []
  const warnings = []
  const missing = []
  const configured = []

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

function printResults(result) {
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
  
  if (!result.valid) {
    console.log('\n💡 Next steps:')
    console.log('   For local development:')
    console.log('      1. Create a .env.local file if it doesn\'t exist')
    console.log('      2. Copy .env.example and fill in the missing values')
    console.log('')
    console.log('   For Vercel deployment:')
    console.log('      1. Go to your project settings')
    console.log('      2. Navigate to Environment Variables')
    console.log('      3. Add the missing variables listed above')
    console.log('')
    console.log('   Get credentials from:')
    console.log('      - Supabase: https://supabase.com/dashboard')
    console.log('      - Sentry: https://sentry.io/')
    console.log('      - Resend: https://resend.com/')
    console.log('      - VirusTotal: https://www.virustotal.com/')
    console.log('')
  }
}

// Run validation
const result = validateEnv()
printResults(result)

// Exit with error code if validation failed
if (!result.valid) {
  process.exit(1)
}
