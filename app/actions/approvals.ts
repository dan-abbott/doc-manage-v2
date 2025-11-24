'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// Types
// ==========================================

export type ApproverStatus = 'Pending' | 'Approved' | 'Rejected'

export interface Approver {
  id: string
  document_id: string
  user_id: string
  user_email: string
  status: ApproverStatus
  comments: string | null
  action_date: string | null
  created_at: string
}

// ==========================================
// Action: Add Approver to Document
// ==========================================

export async function addApprover(documentId: string, userId: string, userEmail: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check document ownership and status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, created_by, status')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Only document creator can add approvers' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Can only add approvers to Draft documents' }
    }

    // Check if approver already exists
    const { data: existing } = await supabase
      .from('approvers')
      .select('id')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return { success: false, error: 'This user is already an approver' }
    }

    // Add approver
    const { error: insertError } = await supabase
      .from('approvers')
      .insert({
        document_id: documentId,
        user_id: userId,
        user_email: userEmail,
        status: 'Pending'
      })

    if (insertError) {
      console.error('Add approver error:', insertError)
      return { success: false, error: 'Failed to add approver' }
    }

    // Create audit log
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'approver_added',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { 
          approver_email: userEmail 
        }
      })

    revalidatePath(`/documents/${documentId}`)
    
    return { success: true }
  } catch (error: any) {
    console.error('Add approver error:', error)
    return { success: false, error: error.message || 'Failed to add approver' }
  }
}

// ==========================================
// Action: Remove Approver from Document
// ==========================================

export async function removeApprover(documentId: string, approverId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check document ownership and status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, created_by, status')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Only document creator can remove approvers' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Can only remove approvers from Draft documents' }
    }

    // Get approver details before deleting (for audit log)
    const { data: approver } = await supabase
      .from('approvers')
      .select('user_email')
      .eq('id', approverId)
      .single()

    // Remove approver
    const { error: deleteError } = await supabase
      .from('approvers')
      .delete()
      .eq('id', approverId)

    if (deleteError) {
      console.error('Remove approver error:', deleteError)
      return { success: false, error: 'Failed to remove approver' }
    }

    // Create audit log
    if (approver) {
      await supabase
        .from('audit_log')
        .insert({
          document_id: documentId,
          action: 'approver_removed',
          performed_by: user.id,
          performed_by_email: user.email,
          details: { 
            approver_email: approver.user_email 
          }
        })
    }

    revalidatePath(`/documents/${documentId}`)
    
    return { success: true }
  } catch (error: any) {
    console.error('Remove approver error:', error)
    return { success: false, error: error.message || 'Failed to remove approver' }
  }
}

// ==========================================
// Action: Submit Document for Approval
// ==========================================

export async function submitForApproval(documentId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document with approvers count
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, approvers:approvers(count)')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Only Draft documents can be submitted' }
    }

    // Check if there are approvers
    const approverCount = document.approvers?.[0]?.count || 0
    
    if (approverCount === 0) {
      return { 
        success: false, 
        error: 'Cannot submit without approvers. Add at least one approver or use Release instead.' 
      }
    }

    // Update document status
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'In Approval' })
      .eq('id', documentId)

    if (updateError) {
      console.error('Submit for approval error:', updateError)
      return { success: false, error: 'Failed to submit document' }
    }

    // Create audit log
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'submitted_for_approval',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { 
          document_number: `${document.document_number}${document.version}`,
          approver_count: approverCount
        }
      })

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error: any) {
    console.error('Submit for approval error:', error)
    return { success: false, error: error.message || 'Failed to submit document' }
  }
}

// ==========================================
// Action: Approve Document
// ==========================================

export async function approveDocument(documentId: string, comments?: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.status !== 'In Approval') {
      return { success: false, error: 'Document is not in approval status' }
    }

    // Check if user is an approver
    const { data: approver, error: approverError } = await supabase
      .from('approvers')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .single()

    if (approverError || !approver) {
      return { success: false, error: 'You are not assigned as an approver for this document' }
    }

    if (approver.status !== 'Pending') {
      return { success: false, error: 'You have already responded to this approval request' }
    }

    // Update approver status
    const { error: updateError } = await supabase
      .from('approvers')
      .update({
        status: 'Approved',
        comments: comments || null,
        action_date: new Date().toISOString()
      })
      .eq('id', approver.id)

    if (updateError) {
      console.error('Approve document error:', updateError)
      return { success: false, error: 'Failed to approve document' }
    }

    // Create audit log
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'approved',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { 
          document_number: `${document.document_number}${document.version}`,
          comments: comments || null
        }
      })

    // Check if all approvers have approved
    const { data: allApproved } = await supabase
      .rpc('check_all_approvers_approved', { doc_id: documentId })

    if (allApproved === true) {
      // All approved - release the document
      await supabase
        .from('documents')
        .update({
          status: 'Released',
          released_at: new Date().toISOString(),
          released_by: user.id
        })
        .eq('id', documentId)

      // Handle obsolescence: make immediate predecessor obsolete
      const { getImmediatePredecessor } = await import('./versions')
      const predecessorResult = await getImmediatePredecessor(
        document.document_number,
        document.version
      )

      if (predecessorResult.success && predecessorResult.data) {
        const predecessor = predecessorResult.data
        
        // Only obsolete if predecessor is Released
        if (predecessor.status === 'Released') {
          await supabase
            .from('documents')
            .update({ status: 'Obsolete' })
            .eq('id', predecessor.id)

          // Log obsolescence
          await supabase
            .from('audit_log')
            .insert({
              document_id: predecessor.id,
              action: 'document_obsoleted',
              performed_by: user.id,
              performed_by_email: user.email,
              details: {
                document_number: `${predecessor.document_number}${predecessor.version}`,
                obsoleted_by_version: document.version,
              },
            })
        }
      }

      // Create release audit log
      await supabase
        .from('audit_log')
        .insert({
          document_id: documentId,
          action: 'released',
          performed_by: user.id,
          performed_by_email: user.email,
          details: { 
            document_number: `${document.document_number}${document.version}`,
            release_method: 'approved'
          }
        })
    }

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')
    revalidatePath('/dashboard')
    revalidatePath('/approvals')
    
    return { 
      success: true, 
      allApproved: allApproved === true 
    }
  } catch (error: any) {
    console.error('Approve document error:', error)
    return { success: false, error: error.message || 'Failed to approve document' }
  }
}

// ==========================================
// Action: Reject Document
// ==========================================

export async function rejectDocument(documentId: string, rejectionReason: string) {
  try {
    const supabase = await createClient()

    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return { success: false, error: 'Rejection reason is required' }
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.status !== 'In Approval') {
      return { success: false, error: 'Document is not in approval status' }
    }

    // Check if user is an approver
    const { data: approver, error: approverError } = await supabase
      .from('approvers')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .single()

    if (approverError || !approver) {
      return { success: false, error: 'You are not assigned as an approver for this document' }
    }

    if (approver.status !== 'Pending') {
      return { success: false, error: 'You have already responded to this approval request' }
    }

    // Update approver status
    const { error: updateApproverError } = await supabase
      .from('approvers')
      .update({
        status: 'Rejected',
        comments: rejectionReason,
        action_date: new Date().toISOString()
      })
      .eq('id', approver.id)

    if (updateApproverError) {
      console.error('Reject document error:', updateApproverError)
      return { success: false, error: 'Failed to reject document' }
    }

    // Return document to Draft status
    const { error: updateDocError } = await supabase
      .from('documents')
      .update({ status: 'Draft' })
      .eq('id', documentId)

    if (updateDocError) {
      console.error('Update document status error:', updateDocError)
      return { success: false, error: 'Failed to update document status' }
    }

    // Reset all other approvers to Pending (for resubmission)
    await supabase
      .from('approvers')
      .update({
        status: 'Pending',
        comments: null,
        action_date: null
      })
      .eq('document_id', documentId)
      .neq('id', approver.id)

    // Create audit log
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'rejected',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { 
          document_number: `${document.document_number}${document.version}`,
          rejection_reason: rejectionReason
        }
      })

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')
    revalidatePath('/dashboard')
    revalidatePath('/approvals')
    
    return { success: true }
  } catch (error: any) {
    console.error('Reject document error:', error)
    return { success: false, error: error.message || 'Failed to reject document' }
  }
}

// ==========================================
// Action: Get My Approvals
// ==========================================

export async function getMyApprovals() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    // Get all approvals for current user
    const { data: approvals, error } = await supabase
      .from('approvers')
      .select(`
        *,
        document:documents (
          id,
          document_number,
          version,
          title,
          status,
          is_production,
          created_at,
          creator:users!documents_created_by_fkey (
            email,
            full_name
          )
        )
      `)
      .eq('user_email', user.email)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get approvals error:', error)
      return { success: false, error: 'Failed to fetch approvals', data: [] }
    }

    return { success: true, data: approvals || [] }
  } catch (error: any) {
    console.error('Get approvals error:', error)
    return { success: false, error: error.message || 'Failed to fetch approvals', data: [] }
  }
}
