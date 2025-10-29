'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Change the owner of a document
 * Admin only action
 */
export async function changeDocumentOwner(
  documentId: string,
  newOwnerEmail: string
) {
  try {
    const supabase = await createClient()

    // Get current user and verify admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return { success: false, error: 'Admin access required' }
    }

    // Look up new owner by email
    const { data: newOwner, error: ownerError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', newOwnerEmail.toLowerCase().trim())
      .single()

    if (ownerError || !newOwner) {
      return { success: false, error: 'User not found with that email' }
    }

    // Update document owner
    const { error: updateError } = await supabase
      .from('documents')
      .update({ created_by: newOwner.id })
      .eq('id', documentId)

    if (updateError) {
      console.error('Update error:', updateError)
      return { success: false, error: 'Failed to change owner' }
    }

    // Create audit log
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'owner_changed',
        performed_by: user.id,
        performed_by_email: user.email,
        details: { 
          new_owner_id: newOwner.id,
          new_owner_email: newOwner.email
        },
      })

    revalidatePath(`/documents/${documentId}`)
    revalidatePath('/documents')

    return { 
      success: true,
      newOwnerEmail: newOwner.email 
    }
  } catch (error: any) {
    console.error('Change owner error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

/**
 * Get all users for admin actions
 * Admin only action
 */
export async function getAllUsers() {
  try {
    const supabase = await createClient()

    // Get current user and verify admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', users: [] }
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return { success: false, error: 'Admin access required', users: [] }
    }

    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, is_admin, created_at')
      .order('email')

    if (error) {
      return { success: false, error: 'Failed to fetch users', users: [] }
    }

    return { success: true, users }
  } catch (error: any) {
    return { success: false, error: error.message, users: [] }
  }
}
