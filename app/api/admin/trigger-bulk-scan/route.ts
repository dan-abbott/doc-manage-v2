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
    const { fileIds } = body

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'File IDs array required' }, { status: 400 })
    }

    // Limit bulk operations to 50 files at a time
    if (fileIds.length > 50) {
      return NextResponse.json({ 
        error: 'Maximum 50 files can be triggered at once' 
      }, { status: 400 })
    }

    // Get files and validate they're in pending or error state
    const { data: files, error: filesError } = await supabase
      .from('document_files')
      .select('id, scan_status')
      .in('id', fileIds)

    if (filesError) {
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    // Filter to only pending or error files
    const eligibleFiles = files?.filter(f => 
      ['pending', 'error'].includes(f.scan_status)
    ) || []

    if (eligibleFiles.length === 0) {
      return NextResponse.json({ 
        error: 'No eligible files to scan (must be pending or error status)' 
      }, { status: 400 })
    }

    // Reset all to pending
    const eligibleFileIds = eligibleFiles.map(f => f.id)
    
    await supabase
      .from('document_files')
      .update({ 
        scan_status: 'pending',
        scan_result: null,
      })
      .in('id', eligibleFileIds)

    // Trigger Inngest scans for all files
    const triggerPromises = eligibleFileIds.map(fileId =>
      inngest.send({
        name: 'file/uploaded',
        data: { fileId },
      })
    )

    await Promise.all(triggerPromises)

    console.log(`[Admin] Manually triggered scans for ${eligibleFileIds.length} files`)

    return NextResponse.json({ 
      success: true,
      triggered: eligibleFileIds.length,
      message: `Successfully triggered ${eligibleFileIds.length} scan(s)`,
    })
  } catch (error: any) {
    console.error('[Admin] Bulk trigger error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to trigger scans' 
    }, { status: 500 })
  }
}
