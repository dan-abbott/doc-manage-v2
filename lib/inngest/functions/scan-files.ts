import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { scanFile } from '@/lib/virustotal'

/**
 * Inngest function: Scan uploaded file for viruses
 * 
 * Triggered by 'file/uploaded' event
 * Runs in background, automatically retries on failure
 */
export const scanPendingFiles = inngest.createFunction(
  {
    id: 'scan-pending-files',
    name: 'Scan Pending Files for Viruses',
    retries: 3, // Retry up to 3 times on failure
    // Extend timeout for large files - VirusTotal can take 3+ minutes
    maxDuration: '5m', // 5 minutes total timeout
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
        .select('id, file_path, original_file_name, document_id')
        .eq('id', fileId)
        .single()
      
      if (error || !file) {
        throw new Error(`File not found: ${fileId}`)
      }

      console.log('[Inngest] File data retrieved:', file.original_file_name)
      return file
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
    const fileBlob = await step.run('download-file', async () => {
      const supabase = createServiceRoleClient()
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(fileData.file_path)
      
      if (error || !data) {
        throw new Error(`Failed to download file: ${error?.message}`)
      }
      
      // Convert Blob to base64 string for serialization
      const buffer = await data.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      console.log('[Inngest] File downloaded, size:', buffer.byteLength)
      return base64
    })

    // Step 4: Scan with VirusTotal
    const scanResult = await step.run('scan-with-virustotal', async () => {
      console.log('[Inngest] Scanning with VirusTotal...')
      // Convert base64 back to Buffer for scanFile function
      const fileBuffer = Buffer.from(fileBlob, 'base64')
      const result = await scanFile(fileBuffer, fileData.original_file_name)
      console.log('[Inngest] Scan complete:', 
        'error' in result ? 'ERROR' : result.safe ? 'SAFE' : 'MALWARE')
      return result
    })

    // Step 5: Update database based on results
    await step.run('update-scan-results', async () => {
      const supabase = createServiceRoleClient()
      
      if ('error' in scanResult) {
        // Scan error - mark as error, keep file
        console.log('[Inngest] Scan error:', scanResult.error)
        
        await supabase
          .from('document_files')
          .update({
            scan_status: 'error',
            scan_result: scanResult,
            scanned_at: new Date().toISOString(),
          })
          .eq('id', fileId)
        
        return { status: 'error' }
      }
      
      if (!scanResult.safe) {
        // Malware detected - mark as blocked, delete file
        console.log('[Inngest] ⚠️ MALWARE DETECTED:', {
          malicious: scanResult.malicious,
          suspicious: scanResult.suspicious,
        })
        
        await supabase
          .from('document_files')
          .update({
            scan_status: 'blocked',
            scan_result: scanResult,
            scanned_at: new Date().toISOString(),
          })
          .eq('id', fileId)
        
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
          scan_result: scanResult,
          scanned_at: new Date().toISOString(),
        })
        .eq('id', fileId)
      
      return { status: 'safe' }
    })

    console.log('[Inngest] Scan job complete for file:', fileId)

    return { 
      fileId,
      fileName: fileData.original_file_name,
      status: 'error' in scanResult ? 'error' : scanResult.safe ? 'safe' : 'blocked',
    }
  }
)
