'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDocumentFilename } from '@/lib/file-naming'
import { scanFile } from '@/lib/virustotal'

export async function updateDocumentWithFiles(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Extract form fields
    const documentId = formData.get('documentId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const projectCode = formData.get('projectCode') as string | null

    // Get document to check ownership and status
    const { data: document, error: getError } = await supabase
      .from('documents')
      .select('*, users!documents_created_by_fkey(tenant_id)')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Get tenant's auto_rename setting
    const tenantId = (document.users as any)?.tenant_id || document.tenant_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('auto_rename_files')
      .eq('id', tenantId)
      .single()
    
    const autoRename = tenant?.auto_rename_files ?? true

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Only Draft documents can be edited' }
    }

    // Update document metadata
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        title,
        description,
        project_code: projectCode ? projectCode.toUpperCase() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    if (updateError) {
      return { success: false, error: 'Failed to update document' }
    }

    // Handle file uploads - PARALLEL SCANNING
    const files = formData.getAll('files') as File[]
    
    if (files.length > 0) {
      console.log(`Uploading ${files.length} files for document ${documentId}`)
      
      // Convert all files to buffers first
      const fileBuffers = await Promise.all(
        files.map(async (file, i) => {
          if (file.size === 0) return null
          console.log(`[${i + 1}/${files.length}] Preparing file: ${file.name}`)
          return {
            index: i,
            file,
            buffer: await file.arrayBuffer(),
          }
        })
      )
      
      const validFiles = fileBuffers.filter(f => f !== null)
      
      // ==========================================
      // PARALLEL VIRUS SCANNING
      // ==========================================
      console.log(`Starting parallel virus scans for ${validFiles.length} files`)
      
      const scanPromises = validFiles.map(async ({ index, file, buffer }) => {
        console.log(`[${index + 1}/${files.length}] Starting scan: ${file.name}`)
        const result = await scanFile(buffer, file.name)
        console.log(`[${index + 1}/${files.length}] Scan complete: ${file.name}`)
        return { index, file, buffer, scanResult: result }
      })
      
      // Wait for all scans to complete
      const scanResults = await Promise.all(scanPromises)
      
      console.log('All virus scans complete')
      
      // Check for malware
      for (const { index, file, scanResult } of scanResults) {
        if ('error' in scanResult) {
          console.error(`[${index + 1}/${files.length}] Scan error for ${file.name}:`, scanResult.error)
          // Continue with upload but mark as error
        } else {
          console.log(`[${index + 1}/${files.length}] Scan result for ${file.name}:`, {
            safe: scanResult.safe,
            malicious: scanResult.malicious,
            suspicious: scanResult.suspicious,
          })
          
          if (!scanResult.safe) {
            console.error(`[${index + 1}/${files.length}] ⚠️ MALWARE DETECTED in ${file.name}`)
            return {
              success: false,
              error: `File "${file.name}" blocked: ${scanResult.malicious} malicious and ${scanResult.suspicious} suspicious detections found. Upload aborted.`
            }
          }
        }
      }
      
      console.log('✅ All files passed virus scan, proceeding with upload')
      
      // ==========================================
      // UPLOAD FILES TO STORAGE
      // ==========================================
      const uploadedFiles: any[] = []
      
      for (const { index, file, buffer, scanResult } of scanResults) {
        console.log(`[${index + 1}/${files.length}] Uploading ${file.name} to storage`)
        
        // Generate unique file name
        const fileName = `${documentId}/${Date.now()}-${file.name}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('File upload error:', uploadError)
          return { 
            success: false, 
            error: `Failed to upload file ${file.name}: ${uploadError.message}` 
          }
        }

        console.log(`[${index + 1}/${files.length}] File uploaded to storage`)

        // Use service role client for DB insert
        const supabaseAdmin = createServiceRoleClient()
        
        // Format filename with smart renaming
        const formattedFileName = formatDocumentFilename(
          document.document_number,
          document.version,
          file.name,
          autoRename
        )
        
        // Determine scan status based on scan result
        let scanStatus = 'safe'
        let scanResultData = null
        
        if ('error' in scanResult) {
          scanStatus = 'error'
          scanResultData = scanResult
        } else {
          scanStatus = 'safe'
          scanResultData = scanResult
        }
        
        // Create file record
        const { data: fileRecord, error: fileError } = await supabaseAdmin
          .from('document_files')
          .insert({
            document_id: documentId,
            file_name: formattedFileName,
            original_file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
            tenant_id: document.tenant_id,
            scan_status: scanStatus,
            scan_result: scanResultData,
            scanned_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (fileError) {
          console.error('File record creation error:', fileError)
          await supabase.storage.from('documents').remove([fileName])
          return { 
            success: false, 
            error: `Failed to save file metadata for ${file.name}: ${fileError.message}` 
          }
        }

        console.log(`[${index + 1}/${files.length}] ✅ Complete`)
        uploadedFiles.push(fileRecord)
      }
    }

    revalidatePath('/documents')
    
    return {
      success: true,
      documentNumber: document.document_number,
      version: document.version,
      filesUploaded: files.length,
    }
  } catch (error: any) {
    console.error('Server action error:', error)
    return { success: false, error: error.message || 'An error occurred' }
  }
}
