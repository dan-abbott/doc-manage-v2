'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// Action: Promote to Production
// ==========================================

export async function promoteToProduction(prototypeDocumentId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get source Prototype document with full details
    const { data: sourceDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*, document_type:document_types(name, prefix)')
      .eq('id', prototypeDocumentId)
      .single()

    if (fetchError || !sourceDoc) {
      return { success: false, error: 'Source document not found' }
    }

    // Validate document is a Prototype
    if (sourceDoc.is_production) {
      return { success: false, error: 'This document is already a Production document' }
    }

    // Verify document is Released
    if (sourceDoc.status !== 'Released') {
      return { success: false, error: 'Only Released Prototype documents can be promoted to Production' }
    }

    // Verify user has permission (is creator or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.is_admin || false
    const isCreator = sourceDoc.created_by === user.id

    if (!isCreator && !isAdmin) {
      return { success: false, error: 'You do not have permission to promote this document' }
    }

    // Check if Production v1 already exists for this document_number
    const { data: existingProduction } = await supabase
      .from('documents')
      .select('id, version')
      .eq('document_number', sourceDoc.document_number)
      .eq('is_production', true)
      .eq('version', 'v1')
      .single()

    if (existingProduction) {
      return { 
        success: false, 
        error: `Production version v1 already exists for ${sourceDoc.document_number}. You can create a new version of the existing Production document instead.` 
      }
    }

    // Create new Production document record
    const { data: newDoc, error: createError } = await supabase
      .from('documents')
      .insert({
        document_number: sourceDoc.document_number,
        version: 'v1',
        document_type_id: sourceDoc.document_type_id,
        title: sourceDoc.title,
        description: sourceDoc.description,
        project_code: sourceDoc.project_code,
        is_production: true,
        status: 'Draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (createError || !newDoc) {
      console.error('Create Production document error:', createError)
      return { success: false, error: 'Failed to create Production document' }
    }

    // Create audit log entry on the new Production document
    await supabase.from('audit_log').insert({
      document_id: newDoc.id,
      action: 'promoted_to_production',
      performed_by: user.id,
      performed_by_email: user.email,
      details: {
        source_document_id: prototypeDocumentId,
        source_document_number: `${sourceDoc.document_number}${sourceDoc.version}`,
        new_document_number: `${newDoc.document_number}${newDoc.version}`,
        is_production: true,
      },
    })

    // Also create audit log on source Prototype for reference
    await supabase.from('audit_log').insert({
      document_id: prototypeDocumentId,
      action: 'promoted_to_production',
      performed_by: user.id,
      performed_by_email: user.email,
      details: {
        promoted_to_document_id: newDoc.id,
        new_document_number: `${newDoc.document_number}${newDoc.version}`,
        note: 'This Prototype document was promoted to Production',
      },
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${prototypeDocumentId}`)

    return { 
      success: true, 
      documentId: newDoc.id,
      documentNumber: `${newDoc.document_number}${newDoc.version}`,
    }
  } catch (error: any) {
    console.error('Promote to Production error:', error)
    return { success: false, error: error.message || 'Failed to promote to Production' }
  }
}
