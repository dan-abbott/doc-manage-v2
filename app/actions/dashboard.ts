'use server'

import { createClient } from '@/lib/supabase/server'

// ==========================================
// Dashboard Statistics
// ==========================================

export async function getDashboardStats() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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

    return {
      success: true,
      data: {
        totalDocuments: totalCount || 0,
        pendingApprovals: pendingCount || 0,
        myDocuments: myDocsCount || 0,
        releasedDocuments: releasedCount || 0,
      }
    }
  } catch (error: any) {
    console.error('Get dashboard stats error:', error)
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
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

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
      console.error('Get recent activity error:', error)
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

    return { success: true, data: formattedActivities }
  } catch (error: any) {
    console.error('Get recent activity error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to fetch recent activity', 
      data: [] 
    }
  }
}
