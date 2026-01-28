import * as Sentry from '@sentry/nextjs'

/**
 * Capture and log errors from Server Actions
 * Use this wrapper around your server action logic
 */
export async function captureServerActionError<T>(
  actionName: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    // Log to console for immediate visibility
    console.error(`[Server Action Error] ${actionName}:`, error)
    
    // Send to Sentry with context
    Sentry.captureException(error, {
      tags: {
        action: actionName,
        type: 'server_action',
      },
      extra: {
        actionName,
        timestamp: new Date().toISOString(),
      },
    })
    
    // Re-throw so caller can handle
    throw error
  }
}

/**
 * Capture RLS policy violations specifically
 */
export function captureRLSError(
  error: any,
  context: {
    table: string
    operation: string
    userId?: string
  }
) {
  Sentry.captureException(error, {
    tags: {
      type: 'rls_violation',
      table: context.table,
      operation: context.operation,
    },
    extra: context,
    level: 'warning', // RLS errors are expected sometimes
  })
}

/**
 * Capture authentication errors
 */
export function captureAuthError(
  error: any,
  context: {
    action: string
    email?: string
  }
) {
  Sentry.captureException(error, {
    tags: {
      type: 'auth_error',
      action: context.action,
    },
    extra: context,
    level: 'error',
  })
}

/**
 * Add user context to Sentry events
 */
export function setUserContext(user: {
  id: string
  email: string
  tenantId?: string
  isAdmin?: boolean
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    tenant_id: user.tenantId,
    is_admin: user.isAdmin,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  })
}
