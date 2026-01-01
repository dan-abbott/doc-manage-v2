// app/actions/user-management.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger, logServerAction, logError } from '@/lib/logger'
import { uuidSchema } from '@/lib/validation/schemas'

// User role type
export type UserRole = 'admin' | 'normal' | 'read_only' | 'deactivated'

// Validation schema for user updates
const userUpdateSchema = z.object({
  role: z.enum(['admin', 'normal', 'read_only', 'deactivated']),
  reason: z.string().optional()
})

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized user list access attempt')
      return { 
        success: false, 
        error: 'You must be logged in',
        data: []
      }
    }

    const userId = user.id
    const userEmail = user.email

    // Check admin status
    const { data: userData, error: adminCheckError } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', userId)
      .single()

    if (adminCheckError || !userData?.is_admin) {
      logger.warn('Non-admin attempted to access user list', { 
        userId, 
        userEmail,
        isAdmin: userData?.is_admin 
      })
      return { 
        success: false, 
        error: 'Only administrators can view user list',
        data: []
      }
    }

    logger.debug('Fetching all users', { userId, userEmail })

    // Fetch all users with their stats
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        is_admin,
        role,
        is_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      logger.error('Failed to fetch users', {
        userId,
        error: fetchError
      })
      throw fetchError
    }

    // Get document counts for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (u) => {
        const { count: docCount } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', u.id)

        const { count: approvalCount } = await supabase
          .from('approvers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', u.id)

        return {
          ...u,
          document_count: docCount || 0,
          approval_count: approvalCount || 0
        }
      })
    )

    const duration = Date.now() - startTime
    
    logger.info('User list fetched', {
      userId,
      userEmail,
      userCount: usersWithStats.length,
      duration
    })

    return { 
      success: true, 
      data: usersWithStats 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'getAllUsers',
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch users',
      data: []
    }
  }
}

/**
 * Update user role and status (admin only)
 */
export async function updateUserRole(
  targetUserId: string, 
  newRole: UserRole,
  reason?: string
) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate inputs
    const idValidation = uuidSchema.safeParse(targetUserId)
    if (!idValidation.success) {
      logger.warn('Invalid user ID for role update', { providedId: targetUserId })
      return { success: false, error: 'Invalid user ID' }
    }

    const roleValidation = userUpdateSchema.safeParse({ role: newRole, reason })
    if (!roleValidation.success) {
      logger.warn('Invalid role data', { 
        newRole, 
        errors: roleValidation.error.issues 
      })
      return { 
        success: false, 
        error: roleValidation.error.issues.map(i => i.message).join(', ')
      }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized role update attempt')
      return { 
        success: false, 
        error: 'You must be logged in' 
      }
    }

    const adminUserId = user.id
    const adminEmail = user.email

    // Check admin status
    const { data: adminData, error: adminCheckError } = await supabase
      .from('users')
      .select('is_admin, role')
      .eq('id', adminUserId)
      .single()

    if (adminCheckError || !adminData?.is_admin) {
      logger.warn('Non-admin attempted role update', { 
        adminUserId, 
        adminEmail,
        targetUserId,
        isAdmin: adminData?.is_admin 
      })
      return { 
        success: false, 
        error: 'Only administrators can update user roles' 
      }
    }

    // Get target user current state
    const { data: targetUser, error: targetFetchError } = await supabase
      .from('users')
      .select('id, email, full_name, is_admin, role, is_active')
      .eq('id', targetUserId)
      .single()

    if (targetFetchError || !targetUser) {
      logger.error('Target user not found', {
        adminUserId,
        targetUserId,
        error: targetFetchError
      })
      return { 
        success: false, 
        error: 'User not found' 
      }
    }

    // Prevent self-demotion from admin
    if (targetUserId === adminUserId && newRole !== 'admin') {
      logger.warn('Admin attempted self-demotion', {
        adminUserId,
        adminEmail,
        attemptedRole: newRole
      })
      return {
        success: false,
        error: 'You cannot remove your own admin privileges'
      }
    }

    // Determine new status based on role
    const isAdmin = newRole === 'admin'
    const isActive = newRole !== 'deactivated'

    logger.info('Updating user role', {
      adminUserId,
      adminEmail,
      targetUserId,
      targetEmail: targetUser.email,
      oldRole: targetUser.role || (targetUser.is_admin ? 'admin' : 'normal'),
      newRole,
      oldActive: targetUser.is_active,
      newActive: isActive,
      reason
    })

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        is_admin: isAdmin,
        role: newRole,
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)
      .select()
      .single()

    if (updateError) {
      logger.error('Failed to update user role', {
        adminUserId,
        targetUserId,
        newRole,
        error: updateError
      })
      throw updateError
    }

    // Create audit log
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        document_id: null, // User management, not document-specific
        action: 'user_role_changed',
        performed_by: adminUserId,
        performed_by_email: adminEmail || '',
        details: {
          target_user_id: targetUserId,
          target_user_email: targetUser.email,
          old_role: targetUser.role || (targetUser.is_admin ? 'admin' : 'normal'),
          new_role: newRole,
          old_active: targetUser.is_active,
          new_active: isActive,
          reason: reason || 'No reason provided',
          changed_at: new Date().toISOString()
        }
      })

    if (auditError) {
      logger.error('Failed to create audit log for role change', {
        adminUserId,
        targetUserId,
        error: auditError
      })
      // Don't fail the operation
    }

    const duration = Date.now() - startTime
    
    logger.info('User role updated successfully', {
      adminUserId,
      adminEmail,
      targetUserId,
      targetEmail: targetUser.email,
      newRole,
      newActive: isActive,
      duration
    })

    logServerAction('updateUserRole', {
      adminUserId,
      adminEmail,
      targetUserId,
      targetEmail: targetUser.email,
      newRole,
      duration,
      success: true
    })

    revalidatePath('/admin/users')
    
    return { 
      success: true, 
      data: updatedUser 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'updateUserRole',
      targetUserId,
      newRole,
      adminUserId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update user role' 
    }
  }
}

/**
 * Deactivate a user (quick action)
 */
export async function deactivateUser(targetUserId: string, reason?: string) {
  return updateUserRole(targetUserId, 'deactivated', reason)
}

/**
 * Reactivate a user (restore to normal)
 */
export async function reactivateUser(targetUserId: string, reason?: string) {
  return updateUserRole(targetUserId, 'normal', reason)
}

/**
 * Make user admin
 */
export async function makeUserAdmin(targetUserId: string, reason?: string) {
  return updateUserRole(targetUserId, 'admin', reason)
}

/**
 * Remove admin privileges (demote to normal)
 */
export async function removeAdminPrivileges(targetUserId: string, reason?: string) {
  return updateUserRole(targetUserId, 'normal', reason)
}
