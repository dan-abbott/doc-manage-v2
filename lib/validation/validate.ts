/**
 * Validation utility functions
 * Provides helpers for validating FormData, JSON, and other inputs
 */

import { z } from 'zod'
import { logger } from '@/lib/logger'

/**
 * Standard validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errors?: Record<string, string[]> }

/**
 * Format Zod error into user-friendly message
 */
export function formatZodError(error: z.ZodError): {
  message: string
  errors: Record<string, string[]>
} {
  const errors: Record<string, string[]> = {}
  
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) {
      errors[path] = []
    }
    errors[path].push(issue.message)
  }

  // Create a single error message from the first error
  const firstError = error.issues[0]
  const message = firstError
    ? `${firstError.path.join('.')}: ${firstError.message}`
    : 'Validation failed'

  return { message, errors }
}

/**
 * Validate FormData against a Zod schema
 * Converts FormData to object and validates
 */
export function validateFormData<T>(
  formData: FormData,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    // Convert FormData to plain object
    const data: Record<string, any> = {}
    
    formData.forEach((value, key) => {
      // Skip file entries (they need special handling)
      if (key.startsWith('file_')) {
        return
      }

      // Handle boolean conversion
      if (value === 'true') {
        data[key] = true
      } else if (value === 'false') {
        data[key] = false
      } else if (value === 'null' || value === '') {
        data[key] = null
      } else {
        data[key] = value
      }
    })

    // Validate against schema
    const validated = schema.parse(data)
    
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { message, errors } = formatZodError(error)
      
      logger.warn({
        msg: 'FormData validation failed',
        validationErrors: errors,
      })
      
      return { success: false, error: message, errors }
    }

    // Unexpected error
    logger.error({
      msg: 'Unexpected error during FormData validation',
      error: error instanceof Error ? error.message : String(error),
    })
    
    return {
      success: false,
      error: 'An unexpected validation error occurred',
    }
  }
}

/**
 * Validate JSON object against a Zod schema
 */
export function validateJSON<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { message, errors } = formatZodError(error)
      
      logger.warn({
        msg: 'JSON validation failed',
        validationErrors: errors,
      })
      
      return { success: false, error: message, errors }
    }

    logger.error({
      msg: 'Unexpected error during JSON validation',
      error: error instanceof Error ? error.message : String(error),
    })
    
    return {
      success: false,
      error: 'An unexpected validation error occurred',
    }
  }
}

/**
 * Validate partial data (for updates where not all fields are required)
 */
export function validatePartial<T extends z.ZodRawShape>(
  data: unknown,
  schema: z.ZodObject<T>
): ValidationResult<Partial<z.infer<z.ZodObject<T>>>> {
  return validateJSON(data, schema.partial())
}

/**
 * Sanitize and validate a string input
 */
export function validateString(
  value: unknown,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    trim?: boolean
  } = {}
): ValidationResult<string | null> {
  const {
    required = false,
    minLength,
    maxLength,
    pattern,
    trim = true,
  } = options

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    if (required) {
      return { success: false, error: 'This field is required' }
    }
    return { success: true, data: null }
  }

  // Convert to string
  let str = String(value)

  // Trim if requested
  if (trim) {
    str = str.trim()
  }

  // Check if empty after trimming
  if (str === '' && required) {
    return { success: false, error: 'This field is required' }
  }

  // Length validation
  if (minLength !== undefined && str.length < minLength) {
    return {
      success: false,
      error: `Must be at least ${minLength} characters`,
    }
  }

  if (maxLength !== undefined && str.length > maxLength) {
    return {
      success: false,
      error: `Must be less than ${maxLength} characters`,
    }
  }

  // Pattern validation
  if (pattern && !pattern.test(str)) {
    return { success: false, error: 'Invalid format' }
  }

  return { success: true, data: str }
}

/**
 * Validate a UUID
 */
export function validateUUID(value: unknown): ValidationResult<string> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (typeof value !== 'string') {
    return { success: false, error: 'Must be a string' }
  }

  if (!uuidPattern.test(value)) {
    return { success: false, error: 'Invalid UUID format' }
  }

  return { success: true, data: value }
}

/**
 * Validate an email address
 */
export function validateEmail(value: unknown): ValidationResult<string> {
  const emailSchema = z.string().email()
  return validateJSON(value, emailSchema)
}

/**
 * Validate a file upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
  } = {}
): ValidationResult<File> {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'text/plain',
      'text/csv',
    ],
  } = options

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024)
    return {
      success: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: 'File type not allowed',
    }
  }

  // Check file name
  if (file.name.length > 255) {
    return {
      success: false,
      error: 'File name too long (max 255 characters)',
    }
  }

  return { success: true, data: file }
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  options: {
    maxSize?: number
    allowedTypes?: string[]
    maxFiles?: number
  } = {}
): ValidationResult<File[]> {
  const { maxFiles = 20 } = options

  if (files.length > maxFiles) {
    return {
      success: false,
      error: `Cannot upload more than ${maxFiles} files`,
    }
  }

  const validatedFiles: File[] = []
  const errors: string[] = []

  for (const file of files) {
    const result = validateFile(file, options)
    if (result.success) {
      validatedFiles.push(result.data)
    } else {
      errors.push(`${file.name}: ${result.error}`)
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.join('; '),
    }
  }

  return { success: true, data: validatedFiles }
}

/**
 * Type guard to check if validation was successful
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is { success: true; data: T } {
  return result.success === true
}

/**
 * Type guard to check if validation failed
 */
export function isValidationError<T>(
  result: ValidationResult<T>
): result is { success: false; error: string; errors?: Record<string, string[]> } {
  return result.success === false
}
