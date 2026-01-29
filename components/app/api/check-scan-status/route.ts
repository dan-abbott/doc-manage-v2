import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { fileIds } = await req.json()

    if (!fileIds || !Array.isArray(fileIds)) {
      return NextResponse.json({ error: 'Invalid fileIds' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check scan status for all files
    const { data: files, error } = await supabase
      .from('document_files')
      .select('id, scan_status')
      .in('id', fileIds)

    if (error) {
      console.error('[Check Scan Status] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count how many are still pending/scanning
    const pendingCount = files?.filter(
      f => f.scan_status === 'pending' || f.scan_status === 'scanning'
    ).length || 0

    const statusCounts = files?.reduce((acc: any, f) => {
      acc[f.scan_status] = (acc[f.scan_status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      pendingCount,
      statusCounts,
      total: files?.length || 0,
    })

  } catch (error: any) {
    console.error('[Check Scan Status] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
