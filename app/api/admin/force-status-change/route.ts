import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ success: false, error: 'Not authorized - admin only' }, { status: 403 })
    }

    const { documentId, newStatus } = await request.json()

    if (!documentId || !newStatus) {
      return NextResponse.json({ success: false, error: 'Missing documentId or newStatus' }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['Draft', 'In Approval', 'Released', 'Obsolete']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, document_number, version, status, tenant_id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
    }

    // Use service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()
    
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ status: newStatus })
      .eq('id', documentId)

    if (updateError) {
      console.error('Failed to update document status:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 })
    }

    // Create audit log
    await supabaseAdmin
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'admin_status_change',
        performed_by: user.id,
        performed_by_email: user.email,
        tenant_id: document.tenant_id,
        details: {
          document_number: `${document.document_number}${document.version}`,
          old_status: document.status,
          new_status: newStatus,
        },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin force status change error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
