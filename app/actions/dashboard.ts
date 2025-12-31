'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { logError, logServerAction } from '@/lib/utils/logging-helpers'

// ==========================================
// Dashboard Statistics
// ==========================================

export async function getDashboardStats() {
  const startTime = Date.now()
  let userId: string | undefined
  
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.warn('Dashboard stats accessed without authentication')
      return { 
        success: false, 
        error: 'Not authenticated',
        data: {
          totalDocuments: 0,
          pendingApprovals: 0,
          myDocuments: 0,
          releasedDocuments: 0,
        }
      }
    }

    userId = user.id
    logger.debug('Fetching dashboard statistics', { userId, action: 'getDashboardStats' })

    // Get total documents count
    const { count: totalCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })

    // Get pending approvals count (where user is approver and status is Pending)
    const { count: pendingCount } = await supabase
      .from('approvers')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', user.email)
      .eq('status', 'Pending')

    // Get my documents count (created by me)
    const { count: myDocsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)

    // Get released documents count (exclude Obsolete)
    const { count: releasedCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Released')

    const stats = {
      totalDocuments: totalCount || 0,
      pendingApprovals: pendingCount || 0,
      myDocuments: myDocsCount || 0,
      releasedDocuments: releasedCount || 0,
    }

    logServerAction('getDashboardStats', {
      userId,
      success: true,
      duration: Date.now() - startTime,
      stats
    })

    return {
      success: true,
      data: stats
    }
  } catch (error: any) {
    logError(error, {
      action: 'getDashboardStats',
      userId,
      duration: Date.now() - startTime
    })
    
    return {
      success: false,
      error: error.message || 'Failed to fetch dashboard statistics',
      data: {
        totalDocuments: 0,
        pendingApprovals: 0,
        myDocuments: 0,
        releasedDocuments: 0,
      }
    }
  }
}

// ==========================================
// Recent Activity
// ==========================================

export interface ActivityItem {
  id: string
  document_id: string
  document_number: string
  document_title: string
  action: string
  performed_by_email: string
  created_at: string
}

export async function getRecentActivity(limit: number = 10) {
  const startTime = Date.now()
  let userId: string | undefined
  
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.warn('Recent activity accessed without authentication')
      return { success: false, error: 'Not authenticated', data: [] }
    }

    userId = user.id
    logger.debug('Fetching recent activity', { userId, limit, action: 'getRecentActivity' })

    // Get recent audit log entries with document details
    const { data: activities, error } = await supabase
      .from('audit_log')
      .select(`
        id,
        document_id,
        action,
        performed_by_email,
        created_at,
        document:documents(document_number, version, title)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logError(error, {
        action: 'getRecentActivity',
        userId,
        limit,
        duration: Date.now() - startTime
      })
      return { success: false, error: 'Failed to fetch recent activity', data: [] }
    }

    // Format the data
    const formattedActivities: ActivityItem[] = (activities || []).map((a: any) => ({
      id: a.id,
      document_id: a.document_id,
      document_number: a.document?.document_number 
        ? `${a.document.document_number}${a.document.version}` 
        : 'Unknown',
      document_title: a.document?.title || 'Unknown Document',
      action: a.action,
      performed_by_email: a.performed_by_email || 'Unknown',
      created_at: a.created_at,
    }))

    logServerAction('getRecentActivity', {
      userId,
      success: true,
      duration: Date.now() - startTime,
      activityCount: formattedActivities.length,
      limit
    })

    return { success: true, data: formattedActivities }
  } catch (error: any) {
    logError(error, {
      action: 'getRecentActivity',
      userId,
      limit,
      duration: Date.now() - startTime
    })
    
    return { 
      success: false, 
      error: error.message || 'Failed to fetch recent activity', 
      data: [] 
    }
  }
}
