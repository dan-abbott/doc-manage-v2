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

    // Handle file uploads - ASYNC SCANNING
    const files = formData.getAll('files') as File[]
    const uploadedFileIds: string[] = []
    
    if (files.length > 0) {
      console.log(`Uploading ${files.length} files for document ${documentId}`)
      
      for (const file of files) {
        if (file.size === 0) continue

        console.log(`Processing file: ${file.name}, size: ${file.size}`)

        // Convert to buffer
        const fileBuffer = await file.arrayBuffer()

        // Generate unique file name
        const fileName = `${documentId}/${Date.now()}-${file.name}`

        // Upload to Supabase Storage immediately
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, fileBuffer, {
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

        console.log('File uploaded to storage:', fileName)

        // Use service role client for DB insert
        const supabaseAdmin = createServiceRoleClient()
        
        // Format filename with smart renaming
        const formattedFileName = formatDocumentFilename(
          document.document_number,
          document.version,
          file.name,
          autoRename
        )
        
        // Create file record with scan_status = 'pending'
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
            scan_status: 'pending',
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

        uploadedFileIds.push(fileRecord.id)

        // Start async scan immediately (fire and forget)
        scanFileAsync(fileRecord.id, fileName, file.name, fileBuffer).catch(err => {
          console.error('[Async Scan] Error:', err)
        })
      }
    }

    revalidatePath('/documents')
    
    return {
      success: true,
      documentNumber: document.document_number,
      version: document.version,
      filesUploaded: uploadedFileIds.length,
    }
  } catch (error: any) {
    console.error('Server action error:', error)
    return { success: false, error: error.message || 'An error occurred' }
  }
}

// Background scan function
async function scanFileAsync(
  fileId: string,
  filePath: string,
  fileName: string,
  fileBuffer: ArrayBuffer
) {
  const supabase = createServiceRoleClient()

  try {
    console.log('[Async Scan] Starting scan for file:', fileId, fileName)

    // Update status to 'scanning'
    await supabase
      .from('document_files')
      .update({ scan_status: 'scanning' })
      .eq('id', fileId)

    // Scan with VirusTotal
    const scanResult = await scanFile(fileBuffer, fileName)

    if ('error' in scanResult) {
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
      console.error('[Async Scan] ⚠️ MALWARE DETECTED:', fileName)
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
        .remove([filePath])

      console.log('[Async Scan] Blocked file deleted from storage')
      return
    }

    // File is clean
    console.log('[Async Scan] ✅ File is clean:', fileName)

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
    console.error('[Async Scan] Error:', error)

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
