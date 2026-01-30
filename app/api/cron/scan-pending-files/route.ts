import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { scanFile } from '@/lib/virustotal'

// Allow up to 60 seconds for this function
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Cron job that scans pending files in the background
 * 
 * Runs every 2 minutes via Vercel Cron
 * Processes up to 10 pending files per run
 * 
 * Flow:
 * 1. Query for files with scan_status='pending'
 * 2. Download file from storage
 * 3. Scan with VirusTotal (parallel for all files)
 * 4. Update scan_status based on results
 * 5. Delete blocked files from storage
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Verify this is a cron request (security)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[Cron] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Cron] Starting background file scan job')

  const supabase = createServiceRoleClient()

  try {
    // Query for pending files (limit 10 per run)
    const { data: pendingFiles, error: queryError } = await supabase
      .from('document_files')
      .select('id, file_path, file_name, original_file_name, document_id')
      .eq('scan_status', 'pending')
      .order('uploaded_at', { ascending: true })
      .limit(10)

    if (queryError) {
      console.error('[Cron] Error querying pending files:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!pendingFiles || pendingFiles.length === 0) {
      console.log('[Cron] No pending files to scan')
      return NextResponse.json({ 
        success: true, 
        message: 'No pending files',
        scanned: 0 
      })
    }

    console.log(`[Cron] Found ${pendingFiles.length} pending files to scan`)

    // Update all to 'scanning' status
    const fileIds = pendingFiles.map(f => f.id)
    await supabase
      .from('document_files')
      .update({ scan_status: 'scanning' })
      .in('id', fileIds)

    // Scan all files in parallel
    const scanPromises = pendingFiles.map(async (file) => {
      try {
        console.log(`[Cron] Scanning file: ${file.id} - ${file.original_file_name}`)

        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(file.file_path)

        if (downloadError || !fileData) {
          console.error(`[Cron] Failed to download file ${file.id}:`, downloadError)
          
          await supabase
            .from('document_files')
            .update({
              scan_status: 'error',
              scan_result: { error: 'Failed to download file for scanning' },
              scanned_at: new Date().toISOString(),
            })
            .eq('id', file.id)

          return { fileId: file.id, status: 'error', error: 'Download failed' }
        }

        // Convert to buffer
        const fileBuffer = await fileData.arrayBuffer()

        // Scan with VirusTotal
        const scanResult = await scanFile(fileBuffer, file.original_file_name)

        // Handle scan error
        if ('error' in scanResult) {
          console.error(`[Cron] Scan error for ${file.id}:`, scanResult.error)
          
          await supabase
            .from('document_files')
            .update({
              scan_status: 'error',
              scan_result: scanResult,
              scanned_at: new Date().toISOString(),
            })
            .eq('id', file.id)

          return { fileId: file.id, status: 'error', error: scanResult.error }
        }

        // Check if file is safe
        if (!scanResult.safe) {
          console.error(`[Cron] ⚠️ MALWARE DETECTED in ${file.id}: ${file.original_file_name}`)
          console.error(`[Cron] Threats: ${scanResult.malicious} malicious, ${scanResult.suspicious} suspicious`)

          // Update status to blocked
          await supabase
            .from('document_files')
            .update({
              scan_status: 'blocked',
              scan_result: scanResult,
              scanned_at: new Date().toISOString(),
            })
            .eq('id', file.id)

          // Delete file from storage
          const { error: deleteError } = await supabase.storage
            .from('documents')
            .remove([file.file_path])

          if (deleteError) {
            console.error(`[Cron] Failed to delete blocked file from storage:`, deleteError)
          } else {
            console.log(`[Cron] Deleted blocked file from storage: ${file.file_path}`)
          }

          return { 
            fileId: file.id, 
            status: 'blocked', 
            malicious: scanResult.malicious,
            suspicious: scanResult.suspicious 
          }
        }

        // File is clean
        console.log(`[Cron] ✅ File is clean: ${file.id} - ${file.original_file_name}`)

        await supabase
          .from('document_files')
          .update({
            scan_status: 'safe',
            scan_result: scanResult,
            scanned_at: new Date().toISOString(),
          })
          .eq('id', file.id)

        return { fileId: file.id, status: 'safe' }

      } catch (error: any) {
        console.error(`[Cron] Unexpected error scanning ${file.id}:`, error)

        await supabase
          .from('document_files')
          .update({
            scan_status: 'error',
            scan_result: { error: error.message },
            scanned_at: new Date().toISOString(),
          })
          .eq('id', file.id)

        return { fileId: file.id, status: 'error', error: error.message }
      }
    })

    // Wait for all scans to complete
    const results = await Promise.all(scanPromises)

    // Summarize results
    const summary = {
      safe: results.filter(r => r.status === 'safe').length,
      blocked: results.filter(r => r.status === 'blocked').length,
      error: results.filter(r => r.status === 'error').length,
    }

    const duration = Date.now() - startTime

    console.log(`[Cron] Scan job complete in ${duration}ms`)
    console.log(`[Cron] Results: ${summary.safe} safe, ${summary.blocked} blocked, ${summary.error} errors`)

    return NextResponse.json({
      success: true,
      scanned: results.length,
      duration: `${duration}ms`,
      summary,
      results,
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[Cron] Job failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: `${duration}ms`,
    }, { status: 500 })
  }
}
