/**
 * Centralized logging configuration using Pino
 * 
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('User signed in', { userId: user.id })
 *   logger.error('Database error', { error, context: 'createDocument' })
 * 
 * Features:
 * - Structured JSON logging in production
 * - Pretty printing in development
 * - Automatic timestamp and level
 * - Request correlation IDs (when available)
 */

import pino from 'pino'

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production'

// Base configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  
  // Add common fields to all logs
  base: {
    env: process.env.NODE_ENV || 'development',
    app: 'document-control-system',
  },

  // Timestamp in ISO format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Don't log these fields (they're sensitive)
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'secret',
      'token',
    ],
    remove: true,
  },
}

// Create logger with environment-specific transport
export const logger = isProduction
  ? pino(baseConfig)
  : pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    })

/**
 * Create a child logger with additional context
 * Useful for adding request-specific context
 */
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context)
}

/**
 * Log levels:
 * - error: Errors that need immediate attention
 * - warn: Warning conditions (e.g., deprecated API usage)
 * - info: General informational messages
 * - debug: Detailed debug information (development only)
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// Export for type safety
export type Logger = typeof logger
