import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { fileId } = body

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    // Check file exists and is in pending or error state
    const { data: file, error: fileError } = await supabase
      .from('document_files')
      .select('id, scan_status')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (!['pending', 'error'].includes(file.scan_status)) {
      return NextResponse.json({ 
        error: `File is ${file.scan_status}, can only trigger for pending or error files` 
      }, { status: 400 })
    }

    // Reset status to pending
    await supabase
      .from('document_files')
      .update({ 
        scan_status: 'pending',
        scan_result: null,
      })
      .eq('id', fileId)

    // Trigger Inngest scan
    await inngest.send({
      name: 'file/uploaded',
      data: {
        fileId: fileId,
      },
    })

    console.log(`[Admin] Manually triggered scan for file: ${fileId}`)

    return NextResponse.json({ 
      success: true,
      message: 'Scan triggered successfully',
    })
  } catch (error: any) {
    console.error('[Admin] Trigger scan error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to trigger scan' 
    }, { status: 500 })
  }
}
