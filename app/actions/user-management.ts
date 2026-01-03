// app/actions/user-management.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger, logServerAction, logError } from '@/lib/logger'
import { uuidSchema } from '@/lib/validation/schemas'

// User role type
// Type exports for components
export type UserRole = 'Admin' | 'Normal' | 'Read Only' | 'Deactivated'

// Validation schema for user updates
const userUpdateSchema = z.object({
  role: z.enum(['Admin', 'Normal', 'Read Only', 'Deactivated']),
  reason: z.string().optional()
})

/**
 * Get all users (admin only, filtered by tenant)
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

    // Check admin status and get tenant_id
    const { data: userData, error: adminCheckError } = await supabase
      .from('users')
      .select('is_admin, role, tenant_id, is_master_admin')
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

    logger.debug('Fetching users for tenant', { 
      userId, 
      userEmail, 
      tenantId: userData.tenant_id,
      isMasterAdmin: userData.is_master_admin 
    })

    // Build query - master admin sees all users, regular admin sees only their tenant
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        is_admin,
        role,
        is_active,
        created_at,
        updated_at,
        tenant_id
      `)

    // Regular admins only see users in their tenant
    // Master admin sees all users
    if (!userData.is_master_admin) {
      query = query.eq('tenant_id', userData.tenant_id)
    }

    const { data: users, error: fetchError } = await query.order('created_at', { ascending: false })

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
    logger.info('User list fetched successfully', { 
      userId, 
      userCount: usersWithStats.length,
      tenantId: userData.tenant_id,
      isMasterAdmin: userData.is_master_admin,
      duration 
    })

    return {
      success: true,
      data: usersWithStats
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Failed to fetch users', {
      error: error.message,
      stack: error.stack,
      duration
    })

    return {
      success: false,
      error: error.message || 'Failed to fetch users',
      data: []
    }
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  reason?: string
) {
  const startTime = Date.now()
  const supabase = await createClient()

  try {
    // Validate UUID
    const { success: uuidValid } = uuidSchema.safeParse(targetUserId)
    if (!uuidValid) {
      return { success: false, error: 'Invalid user ID' }
    }

    // Validate inputs
    const { success, data, error: validationError } = userUpdateSchema.safeParse({ role: newRole, reason })
    if (!success) {
      return { success: false, error: validationError.errors[0].message }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'You must be logged in' }
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
      logger.warn('Non-admin attempted to change user role', { userId, userEmail })
      return { success: false, error: 'Only administrators can change user roles' }
    }

    // Get target user details
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('email, full_name, role')
      .eq('id', targetUserId)
      .single()

    if (targetError || !targetUser) {
      return { success: false, error: 'User not found' }
    }

    logger.info('Updating user role', {
      adminId: userId,
      adminEmail: userEmail,
      targetUserId,
      targetEmail: targetUser.email,
      oldRole: targetUser.role,
      newRole: data.role,
      reason: data.reason
    })

    // Update role
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: data.role,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId)

    if (updateError) {
      logger.error('Failed to update user role', {
        adminId: userId,
        targetUserId,
        error: updateError
      })
      throw updateError
    }

    // Log the role change in audit log (future enhancement)
    // For now, just server logs

    const duration = Date.now() - startTime
    logger.info('User role updated successfully', {
      adminId: userId,
      targetUserId,
      targetEmail: targetUser.email,
      newRole: data.role,
      duration
    })

    revalidatePath('/admin/users')

    return {
      success: true,
      message: `Updated ${targetUser.full_name || targetUser.email}'s role to ${data.role}`
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Failed to update user role', {
      error: error.message,
      stack: error.stack,
      duration
    })

    return {
      success: false,
      error: error.message || 'Failed to update user role'
    }
  }
}
