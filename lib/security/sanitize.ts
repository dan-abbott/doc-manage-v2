/**
 * Input sanitization utilities
 * Provides functions to sanitize user input before processing
 */

import { logger } from '@/lib/logger'

/**
 * Sanitize a string by trimming and removing dangerous characters
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null
  }

  // Convert to string if not already
  let sanitized = String(input)

  // Trim whitespace
  sanitized = sanitized.trim()

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Remove control characters (except newline and tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  return sanitized === '' ? null : sanitized
}

/**
 * Sanitize HTML by stripping all tags
 * Use this when you need plain text from potentially HTML-containing input
 */
export function sanitizeHTML(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null
  }

  // Convert to string
  let sanitized = String(input)

  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '')

  // Decode common HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Apply string sanitization
  return sanitizeString(sanitized)
}

/**
 * Sanitize a filename for safe storage
 * Removes path traversal attempts and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) {
    return 'unnamed_file'
  }

  // Remove any path components (path traversal attack prevention)
  let sanitized = filename.replace(/^.*[\\\/]/, '')

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Replace dangerous characters with underscores
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_')

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'))
    const name = sanitized.substring(0, 255 - ext.length)
    sanitized = name + ext
  }

  // If filename is empty after sanitization, use default
  if (!sanitized) {
    sanitized = 'unnamed_file'
  }

  return sanitized
}

/**
 * Sanitize a document number for safe usage
 */
export function sanitizeDocumentNumber(
  documentNumber: string | null | undefined
): string | null {
  if (!documentNumber) {
    return null
  }

  // Document numbers should only contain uppercase letters, numbers, and hyphens
  let sanitized = String(documentNumber).trim().toUpperCase()
  
  // Remove any characters that aren't alphanumeric or hyphen
  sanitized = sanitized.replace(/[^A-Z0-9-]/g, '')

  return sanitized === '' ? null : sanitized
}

/**
 * Sanitize a project code (P-#####)
 */
export function sanitizeProjectCode(
  projectCode: string | null | undefined
): string | null {
  if (!projectCode) {
    return null
  }

  let sanitized = String(projectCode).trim().toUpperCase()
  
  // Remove any characters that aren't alphanumeric or hyphen
  sanitized = sanitized.replace(/[^A-Z0-9-]/g, '')

  // Validate format
  if (!/^P-\d{5}$/.test(sanitized)) {
    logger.warn({
      msg: 'Invalid project code format after sanitization',
      original: projectCode,
      sanitized,
    })
    return null
  }

  return sanitized
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null
  }

  // Trim and lowercase
  let sanitized = String(email).trim().toLowerCase()

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Basic email validation (more thorough validation should be done with Zod)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
    logger.warn({
      msg: 'Invalid email format after sanitization',
      original: email,
    })
    return null
  }

  return sanitized
}

/**
 * Sanitize a UUID
 */
export function sanitizeUUID(uuid: string | null | undefined): string | null {
  if (!uuid) {
    return null
  }

  let sanitized = String(uuid).trim().toLowerCase()

  // Remove any non-hex characters except hyphens
  sanitized = sanitized.replace(/[^0-9a-f-]/g, '')

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sanitized)) {
    logger.warn({
      msg: 'Invalid UUID format after sanitization',
      original: uuid,
    })
    return null
  }

  return sanitized
}

/**
 * Sanitize a numeric input
 */
export function sanitizeNumber(
  input: string | number | null | undefined,
  options: {
    min?: number
    max?: number
    integer?: boolean
  } = {}
): number | null {
  if (input === null || input === undefined || input === '') {
    return null
  }

  // Convert to number
  let num = typeof input === 'number' ? input : parseFloat(String(input))

  // Check if valid number
  if (isNaN(num) || !isFinite(num)) {
    return null
  }

  // Round to integer if requested
  if (options.integer) {
    num = Math.round(num)
  }

  // Apply min/max constraints
  if (options.min !== undefined && num < options.min) {
    return options.min
  }

  if (options.max !== undefined && num > options.max) {
    return options.max
  }

  return num
}

/**
 * Sanitize a boolean input
 */
export function sanitizeBoolean(
  input: string | boolean | null | undefined
): boolean {
  if (typeof input === 'boolean') {
    return input
  }

  if (input === null || input === undefined || input === '') {
    return false
  }

  const str = String(input).toLowerCase().trim()
  return str === 'true' || str === '1' || str === 'yes' || str === 'on'
}

/**
 * Sanitize an object by applying sanitization to all string values
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    sanitizeStrings?: boolean
    sanitizeHTML?: boolean
  } = {}
): T {
  const { sanitizeStrings = true, sanitizeHTML: shouldSanitizeHTML = false } = options

  const sanitized: Record<string, any> = { ...obj }

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      if (shouldSanitizeHTML) {
        sanitized[key] = sanitizeHTML(value)
      } else if (sanitizeStrings) {
        sanitized[key] = sanitizeString(value)
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value, options)
    }
  }

  return sanitized as T
}

/**
 * Remove potentially dangerous SQL characters
 * Note: This is NOT a substitute for parameterized queries!
 * Use this only for logging/display purposes
 */
export function sanitizeForLog(input: string | null | undefined): string | null {
  if (!input) {
    return null
  }

  let sanitized = sanitizeString(input)
  
  if (!sanitized) {
    return null
  }

  // Remove or escape potentially problematic characters for logs
  sanitized = sanitized
    .replace(/[\r\n]/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  return sanitized
}

/**
 * Type guard to check if a value is a non-empty string after sanitization
 */
export function isNonEmptyString(value: unknown): value is string {
  const sanitized = sanitizeString(value as string)
  return sanitized !== null && sanitized.length > 0
}
