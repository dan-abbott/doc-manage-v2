/**
 * Logging helper functions for common logging patterns
 * Provides consistent logging across the application
 */

import { logger } from '@/lib/logger'

/**
 * Log an error with full context
 */
export function logError(
  error: Error | unknown,
  context: {
    action?: string
    userId?: string
    documentId?: string
    [key: string]: any
  } = {}
) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  logger.error({
    msg: errorMessage,
    error: {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
    },
    ...context,
  })
}

/**
 * Log a server action call with timing
 */
export function logServerAction(
  action: string,
  params: {
    userId?: string
    duration?: number
    success: boolean
    [key: string]: any
  }
) {
  const level = params.success ? 'info' : 'warn'
  
  logger[level]({
    msg: `Server action: ${action}`,
    action,
    ...params,
  })
}

/**
 * Log database operations
 */
export function logDatabaseQuery(
  operation: string,
  details: {
    table?: string
    duration?: number
    rowCount?: number
    error?: Error
    [key: string]: any
  }
) {
  const level = details.error ? 'error' : 'debug'
  
  logger[level]({
    msg: `Database ${operation}`,
    operation,
    ...details,
    ...(details.error && {
      error: {
        message: details.error.message,
        stack: details.error.stack,
      },
    }),
  })
}

/**
 * Log authentication events
 */
export function logAuth(
  event: 'sign_in' | 'sign_out' | 'auth_error' | 'session_refresh',
  details: {
    userId?: string
    email?: string
    provider?: string
    error?: Error
    [key: string]: any
  }
) {
  const level = event === 'auth_error' ? 'error' : 'info'
  
  logger[level]({
    msg: `Auth event: ${event}`,
    event,
    ...details,
    ...(details.error && {
      error: {
        message: details.error.message,
      },
    }),
  })
}

/**
 * Log file operations
 */
export function logFileOperation(
  operation: 'upload' | 'download' | 'delete',
  details: {
    fileName?: string
    fileSize?: number
    documentId?: string
    userId?: string
    success: boolean
    error?: Error
    duration?: number
    [key: string]: any
  }
) {
  const level = details.success ? 'info' : 'error'
  
  logger[level]({
    msg: `File ${operation}: ${details.fileName || 'unknown'}`,
    operation,
    ...details,
    ...(details.error && {
      error: {
        message: details.error.message,
        stack: details.error.stack,
      },
    }),
  })
}

/**
 * Log approval workflow events
 */
export function logApproval(
  action: 'submitted' | 'approved' | 'rejected' | 'released',
  details: {
    documentId: string
    documentNumber?: string
    approverId?: string
    userId?: string
    comments?: string
    [key: string]: any
  }
) {
  logger.info({
    msg: `Approval ${action}: ${details.documentNumber || details.documentId}`,
    action,
    category: 'approval',
    ...details,
  })
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  details: {
    duration: number
    threshold?: number
    [key: string]: any
  }
) {
  const isSlow = details.threshold && details.duration > details.threshold
  const level = isSlow ? 'warn' : 'debug'
  
  logger[level]({
    msg: `Performance: ${operation} took ${details.duration}ms${isSlow ? ' (SLOW)' : ''}`,
    operation,
    category: 'performance',
    ...details,
  })
}

/**
 * Utility to measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  operation: string,
  threshold?: number
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    logPerformance(operation, { duration, threshold, success: true })
    return result
  } catch (error) {
    const duration = Date.now() - start
    logPerformance(operation, { duration, threshold, success: false })
    throw error
  }
}

/**
 * Create a request-scoped logger
 * Useful for adding correlation IDs and user context to all logs in a request
 */
export function createRequestLogger(context: {
  requestId?: string
  userId?: string
  path?: string
  [key: string]: any
}) {
  return logger.child(context)
}
