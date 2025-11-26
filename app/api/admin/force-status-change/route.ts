import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin, email')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get request body
    const { documentId, newStatus } = await request.json()

    // Validate status
    const validStatuses = ['Draft', 'In Approval', 'Released', 'Obsolete']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get current document
    const { data: document } = await supabase
      .from('documents')
      .select('status, document_number, version')
      .eq('id', documentId)
      .single()

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Update document status
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (updateError) {
      console.error('Status update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update status' },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('audit_log')
      .insert({
        document_id: documentId,
        action: 'admin_force_status_change',
        performed_by: user.id,
        performed_by_email: userData.email,
        details: {
          old_status: document.status,
          new_status: newStatus,
          admin_action: true,
          document_number: document.document_number,
          version: document.version,
        },
      })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin status change error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
