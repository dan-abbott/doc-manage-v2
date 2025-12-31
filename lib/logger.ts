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

// Create base Pino logger with environment-specific transport
const pinoLogger = isProduction
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
 * Wrapper logger that accepts both (message, object) and (object, message) syntax
 * This provides a more intuitive API
 */
export const logger = {
  info: (msgOrObj: string | object, objOrMsg?: object | string) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.info(objOrMsg as object || {}, msgOrObj)
    } else {
      pinoLogger.info(msgOrObj, objOrMsg as string || '')
    }
  },
  
  warn: (msgOrObj: string | object, objOrMsg?: object | string) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.warn(objOrMsg as object || {}, msgOrObj)
    } else {
      pinoLogger.warn(msgOrObj, objOrMsg as string || '')
    }
  },
  
  error: (msgOrObj: string | object, objOrMsg?: object | string) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.error(objOrMsg as object || {}, msgOrObj)
    } else {
      pinoLogger.error(msgOrObj, objOrMsg as string || '')
    }
  },
  
  debug: (msgOrObj: string | object, objOrMsg?: object | string) => {
    if (typeof msgOrObj === 'string') {
      pinoLogger.debug(objOrMsg as object || {}, msgOrObj)
    } else {
      pinoLogger.debug(msgOrObj, objOrMsg as string || '')
    }
  },
  
  child: (bindings: pino.Bindings) => pinoLogger.child(bindings),
}

/**
 * Create a child logger with additional context
 * Useful for adding request-specific context
 */
export function createContextLogger(context: Record<string, any>) {
  return pinoLogger.child(context)
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
