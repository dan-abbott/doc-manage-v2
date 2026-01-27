// Patch for app/actions/approvals.ts
// Replace the addApprover function with this version

export async function addApprover(documentId: string, userId: string, userEmail: string) {
  const startTime = Date.now()
  let currentUserId: string | undefined

  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.warn({ authError, documentId }, 'Add approver attempted without authentication')
      return { success: false, error: 'Not authenticated' }
    }

    currentUserId = user.id
    logger.info({ userId: currentUserId, documentId, approverId: userId, action: 'addApprover' }, 'Adding approver')

    // Validate input
    const validation = validateJSON(
      { document_id: documentId, user_id: userId, user_email: userEmail },
      addApproverSchema
    )

    if (!validation.success) {
      logger.warn('Add approver validation failed', {
        userId: currentUserId,
        documentId,
        error: validation.error,
      })
      return { success: false, error: validation.error }
    }

    // Sanitize email
    const cleanEmail = sanitizeEmail(userEmail)
    if (!cleanEmail) {
      return { success: false, error: 'Invalid email address' }
    }

    // Check document ownership and status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, created_by, status, tenant_id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      logger.error('Document not found for adding approver', {
        userId: currentUserId,
        documentId,
        error: docError,
      })
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== currentUserId) {
      logger.warn('Unauthorized approver addition attempt', {
        userId: currentUserId,
        documentId,
        ownerId: document.created_by,
      })
      return { success: false, error: 'Not authorized' }
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
      return { success: false, error: 'User is already an approver' }
    }

    // Use service role client to bypass RLS (we've already verified permissions above)
    const supabaseAdmin = createServiceRoleClient()
    
    const { error: insertError } = await supabaseAdmin
      .from('approvers')
      .insert({
        document_id: documentId,
        user_id: userId,
        user_email: cleanEmail,
        status: 'Pending',
        tenant_id: document.tenant_id  // Include tenant_id if it exists
      })

    if (insertError) {
      logError(insertError, {
        action: 'addApprover',
        userId: currentUserId,
        documentId,
        approverId: userId,
      })
      return { success: false, error: 'Failed to add approver' }
    }

    // Audit log
    await supabaseAdmin.from('audit_log').insert({
      document_id: documentId,
      action: 'approver_added',
      performed_by: currentUserId,
      performed_by_email: user.email,
      details: { approver_email: cleanEmail },
      tenant_id: document.tenant_id
    })

    logger.info(
      { action: 'addApprover', userId: currentUserId, documentId, duration: Date.now() - startTime },
      'Approver added successfully'
    )

    return { success: true }
  } catch (error: any) {
    logError(error, {
      action: 'addApprover',
      userId: currentUserId,
      documentId,
      duration: Date.now() - startTime,
    })
    return { success: false, error: 'An unexpected error occurred' }
  }
}
