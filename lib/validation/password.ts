/**
 * Password validation schemas
 * lib/validation/password.ts
 */

import { z } from 'zod'

/**
 * Strong password requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (!@#$%^&*)')

/**
 * Email/password signup schema
 */
export const emailPasswordSignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

/**
 * Check password strength and return feedback
 */
export function getPasswordStrength(password: string): {
  score: number // 0-4
  feedback: string[]
  isValid: boolean
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else feedback.push('At least 8 characters')

  if (/[A-Z]/.test(password)) score++
  else feedback.push('One uppercase letter')

  if (/[a-z]/.test(password)) score++
  else feedback.push('One lowercase letter')

  if (/[0-9]/.test(password)) score++
  else feedback.push('One number')

  if (/[^A-Za-z0-9]/.test(password)) score++
  else feedback.push('One special character (!@#$%^&*)')

  return {
    score,
    feedback,
    isValid: score === 5
  }
}
