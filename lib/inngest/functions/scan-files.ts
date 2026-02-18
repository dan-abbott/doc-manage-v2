import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { scanFile } from '@/lib/virustotal'

/**
 * Inngest function: Scan uploaded file for viruses
 * 
 * Triggered by 'file/uploaded' event
 * Runs in background, automatically retries on failure
 * 
 * Note: Inngest handles long-running functions automatically.
 * No timeout configuration needed - functions can run as long as needed.
 */
export const scanPendingFiles = inngest.createFunction(
  {
    id: 'scan-pending-files',
    name: 'Scan Pending Files for Viruses',
    retries: 3, // Retry up to 3 times on failure
    // ⭐ ADD: Global error handler for function-level failures
    onFailure: async ({ error, event }: { error: any; event: { data: { fileId: string } } }) => {
      console.error('[Inngest] Function failed:', error)
      const { fileId } = event.data

      try {
        const supabase = createServiceRoleClient()

        // Mark file as error if function fails
        await supabase
          .from('document_files')
          .update({
            scan_status: 'error',
            scan_result: { error: error.message || 'Function execution failed' },
            scanned_at: new Date().toISOString(),
          })
          .eq('id', fileId)

        console.log('[Inngest] File marked as error due to function failure')
      } catch (updateError) {
        console.error('[Inngest] Failed to update file status on error:', updateError)
      }
    }
  },
  { event: 'file/uploaded' },
  async ({ event, step }) => {
    const { fileId } = event.data

    console.log('[Inngest] Starting scan for file:', fileId)

    // Step 1: Get file metadata from database
    const fileData = await step.run('get-file-data', async () => {
      const supabase = createServiceRoleClient()

      const { data: file, error } = await supabase
        .from('document_files')
        .select(`
          id, 
          file_path, 
          original_file_name, 
          document_id,
          uploaded_by,
          documents!inner(tenant_id)
        `)
        .eq('id', fileId)
        .single()

      if (error || !file) {
        throw new Error(`File not found: ${fileId}`)
      }

      console.log('[Inngest] File data retrieved:', file.original_file_name)
      // ⭐ FIX: Return minimal data to avoid size limits
      return {
        id: file.id,
        file_path: file.file_path,
        original_file_name: file.original_file_name,
        document_id: file.document_id,
        uploaded_by: file.uploaded_by,
        tenant_id: (file.documents as any).tenant_id
      }
    })

    // Step 2: Update status to 'scanning'
    await step.run('update-status-scanning', async () => {
      const supabase = createServiceRoleClient()

      await supabase
        .from('document_files')
        .update({ scan_status: 'scanning' })
        .eq('id', fileId)

      console.log('[Inngest] Status updated to scanning')
    })

    // Step 3: Download file from storage
    const fileSize = await step.run('download-file', async () => {
      const supabase = createServiceRoleClient()

      const { data, error } = await supabase.storage
        .from('documents')
        .download(fileData.file_path)

      if (error || !data) {
        throw new Error(`Failed to download file: ${error?.message}`)
      }

      const buffer = await data.arrayBuffer()
      const size = buffer.byteLength
      console.log('[Inngest] File downloaded, size:', size)

      // ⭐ FIX: Don't return the base64 data - store it and just return size
      // We'll re-download in the next step
      return size
    })

    // Step 4: Scan with VirusTotal
    const scanSummary = await step.run('scan-with-virustotal', async () => {
      console.log('[Inngest] Scanning with VirusTotal...')

      // Re-download file (necessary since we can't pass large data between steps)
      const supabase = createServiceRoleClient()
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('documents')
        .download(fileData.file_path)

      if (downloadError || !fileBlob) {
        throw new Error(`Failed to download file for scanning: ${downloadError?.message}`)
      }

      const fileBuffer = Buffer.from(await fileBlob.arrayBuffer())
      const result = await scanFile(fileBuffer, fileData.original_file_name)

      console.log('[Inngest] Scan complete:',
        'error' in result ? 'ERROR' : result.safe ? 'SAFE' : 'MALWARE')

      // ⭐ FIX: Return only summary data, not full scan result
      if ('error' in result) {
        return {
          status: 'error' as const,
          error: result.error
        }
      }

      return {
        status: result.safe ? 'safe' as const : 'blocked' as const,
        safe: result.safe,
        malicious: result.malicious,
        suspicious: result.suspicious,
        // Don't include: vendors, permalink, analysis_date, etc.
      }
    })

    //Step 4.5: Log scan 
    // Track API usage
    await step.run('track-virustotal-usage', async () => {
      const { trackApiUsage } = await import('@/lib/track-api-usage')

      await trackApiUsage({
        tenantId: fileData.tenant_id,
        apiType: 'virustotal',
        endpoint: 'file/scan',
        status: scanSummary.status === 'error' ? 'error' : 'success',
        requestData: {
          file_name: fileData.original_file_name,
          file_size: fileSize
        },
        responseData: scanSummary.status === 'error'
          ? { error: scanSummary.error }
          : {
            safe: scanSummary.safe,
            malicious: scanSummary.malicious,
            suspicious: scanSummary.suspicious
          }
      })
    })

    // Step 5: Update database based on results
    await step.run('update-scan-results', async () => {
      const supabase = createServiceRoleClient()

      if (scanSummary.status === 'error') {
        // Scan error - mark as error, keep file
        console.log('[Inngest] Scan error:', scanSummary.error)

        await supabase
          .from('document_files')
          .update({
            scan_status: 'error',
            scan_result: {
              error: scanSummary.error,
            },
            scanned_at: new Date().toISOString(),
          })
          .eq('id', fileId)

        // Create audit log for scan failure
        await supabase
          .from('audit_log')
          .insert({
            document_id: fileData.document_id,
            action: 'file_scan_failed',
            performed_by: fileData.uploaded_by,
            performed_by_email: 'system',
            tenant_id: fileData.tenant_id,
            details: {
              file_id: fileId,
              file_name: fileData.original_file_name,
              error: scanSummary.error
            }
          })

        return { status: 'error' }
      }

      if (scanSummary.status === 'blocked') {
        // Malware detected - mark as blocked, delete file
        console.log('[Inngest] ⚠️ MALWARE DETECTED:', {
          malicious: scanSummary.malicious,
          suspicious: scanSummary.suspicious,
        })

        await supabase
          .from('document_files')
          .update({
            scan_status: 'blocked',
            scan_result: {
              safe: false,
              malicious: scanSummary.malicious,
              suspicious: scanSummary.suspicious
            },
            scanned_at: new Date().toISOString(),
          })
          .eq('id', fileId)

        // Create audit log for malware detection
        await supabase
          .from('audit_log')
          .insert({
            document_id: fileData.document_id,
            action: 'file_scan_completed',
            performed_by: fileData.uploaded_by,
            performed_by_email: 'system',
            tenant_id: fileData.tenant_id,
            details: {
              file_id: fileId,
              file_name: fileData.original_file_name,
              status: 'blocked',
              malicious: scanSummary.malicious,
              suspicious: scanSummary.suspicious
            }
          })

        // Delete file from storage
        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove([fileData.file_path])

        if (deleteError) {
          console.error('[Inngest] Failed to delete blocked file:', deleteError)
        } else {
          console.log('[Inngest] Blocked file deleted from storage')
        }

        return { status: 'blocked' }
      }

      // File is safe
      console.log('[Inngest] ✅ File is safe')

      await supabase
        .from('document_files')
        .update({
          scan_status: 'safe',
          scan_result: {
            safe: true,
            malicious: 0,
            suspicious: 0
          },
          scanned_at: new Date().toISOString(),
        })
        .eq('id', fileId)

      // Create audit log for successful scan
      await supabase
        .from('audit_log')
        .insert({
          document_id: fileData.document_id,
          action: 'file_scan_completed',
          performed_by: fileData.uploaded_by,
          performed_by_email: 'system',
          tenant_id: fileData.tenant_id,
          details: {
            file_id: fileId,
            file_name: fileData.original_file_name,
            status: 'safe'
          }
        })

      return { status: 'safe' }
    })

    console.log('[Inngest] Scan job complete for file:', fileId)

    // ⭐ FIX: Return minimal data
    return {
      fileId,
      status: scanSummary.status,
    }
  }
)
