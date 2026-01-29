import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { scanFile } from '@/lib/virustotal'

export const maxDuration = 300 // 5 minutes for virus scanning
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { fileIds } = await req.json()

    if (!fileIds || !Array.isArray(fileIds)) {
      return NextResponse.json({ error: 'Invalid fileIds' }, { status: 400 })
    }

    console.log('[Async Scan] Processing', fileIds.length, 'files')

    // Process each file in background
    for (const fileId of fileIds) {
      // Don't await - let it run in background
      scanFileInBackground(fileId).catch(err => {
        console.error('[Async Scan] Error for file', fileId, err)
      })
    }

    return NextResponse.json({ 
      success: true, 
      queued: fileIds.length 
    })

  } catch (error: any) {
    console.error('[Async Scan] API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function scanFileInBackground(fileId: string) {
  const supabase = createServiceRoleClient()

  try {
    console.log('[Async Scan] Starting scan for file:', fileId)

    // Update status to 'scanning'
    await supabase
      .from('document_files')
      .update({ scan_status: 'scanning' })
      .eq('id', fileId)

    // Get file details
    const { data: fileRecord, error: fetchError } = await supabase
      .from('document_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fetchError || !fileRecord) {
      throw new Error('File not found')
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(fileRecord.file_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download file for scanning')
    }

    // Convert to buffer
    const fileBuffer = await fileData.arrayBuffer()

    console.log('[Async Scan] Scanning file:', fileRecord.original_file_name)

    // Scan with VirusTotal
    const scanResult = await scanFile(fileBuffer, fileRecord.original_file_name)

    if ('error' in scanResult) {
      // Scan failed - mark as error but don't delete
      console.error('[Async Scan] Scan error:', scanResult.error)
      
      await supabase
        .from('document_files')
        .update({
          scan_status: 'error',
          scan_result: scanResult,
          scanned_at: new Date().toISOString(),
        })
        .eq('id', fileId)

      return
    }

    // Check if file is safe
    if (!scanResult.safe) {
      // MALWARE DETECTED - mark as blocked and delete file
      console.error('[Async Scan] ⚠️ MALWARE DETECTED:', fileRecord.original_file_name)
      console.error('[Async Scan] Details:', {
        malicious: scanResult.malicious,
        suspicious: scanResult.suspicious,
      })

      // Update record as blocked
      await supabase
        .from('document_files')
        .update({
          scan_status: 'blocked',
          scan_result: scanResult,
          scanned_at: new Date().toISOString(),
        })
        .eq('id', fileId)

      // Delete file from storage
      await supabase.storage
        .from('documents')
        .remove([fileRecord.file_path])

      console.log('[Async Scan] Blocked file deleted from storage')

      // TODO: Send notification to user about blocked file
      // Could use email, in-app notification, etc.

      return
    }

    // File is clean!
    console.log('[Async Scan] ✅ File is clean:', fileRecord.original_file_name)

    await supabase
      .from('document_files')
      .update({
        scan_status: 'safe',
        scan_result: scanResult,
        scanned_at: new Date().toISOString(),
      })
      .eq('id', fileId)

    console.log('[Async Scan] File marked as safe')

  } catch (error: any) {
    console.error('[Async Scan] Background scan error:', error)

    // Mark as error
    await supabase
      .from('document_files')
      .update({
        scan_status: 'error',
        scan_result: { error: error.message },
        scanned_at: new Date().toISOString(),
      })
      .eq('id', fileId)
  }
}
