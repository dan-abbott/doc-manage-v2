'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDocumentFilename } from '@/lib/file-naming'

export async function updateDocumentWithFiles(formData: FormData) {
  const requestStartTime = Date.now()
  console.log('🔍 [documents-formdata] ========== ACTION CALLED ==========')
  console.log('🔍 [documents-formdata] Timestamp:', new Date().toISOString())
  
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('🔍 [documents-formdata] Auth error:', authError)
      return { success: false, error: 'Not authenticated' }
    }

    console.log('🔍 [documents-formdata] User authenticated:', user.email)

    // Extract form fields
    const documentId = formData.get('documentId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const projectCode = formData.get('projectCode') as string | null

    console.log('🔍 [documents-formdata] Document ID:', documentId)
    console.log('🔍 [documents-formdata] Title:', title)
    console.log('🔍 [documents-formdata] Project Code:', projectCode)

    // Get document to check ownership and status
    const { data: document, error: getError } = await supabase
      .from('documents')
      .select('*, users!documents_created_by_fkey(tenant_id)')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      console.log('🔍 [documents-formdata] Document not found:', getError)
      return { success: false, error: 'Document not found' }
    }

    console.log('🔍 [documents-formdata] Document found:', document.document_number, document.version)

    // Get tenant's auto_rename setting
    const tenantId = (document.users as any)?.tenant_id || document.tenant_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('auto_rename_files')
      .eq('id', tenantId)
      .single()
    
    const autoRename = tenant?.auto_rename_files ?? true
    console.log('🔍 [documents-formdata] Auto rename files:', autoRename)

    if (document.created_by !== user.id) {
      console.log('🔍 [documents-formdata] User not authorized')
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      console.log('🔍 [documents-formdata] Document not in Draft status:', document.status)
      return { success: false, error: 'Only Draft documents can be edited' }
    }

    // Update document metadata
    console.log('🔍 [documents-formdata] Updating document metadata...')
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
      console.log('🔍 [documents-formdata] Update error:', updateError)
      return { success: false, error: 'Failed to update document' }
    }

    console.log('🔍 [documents-formdata] Document metadata updated successfully')

    // Handle file uploads - NO SCANNING (just mark as pending)
    const files = formData.getAll('files') as File[]
    const uploadedFiles: any[] = []
    
    console.log(`🔍 [documents-formdata] Files to process: ${files.length}`)
    
    if (files.length > 0) {
      console.log('🔍 [documents-formdata] *** NO SCANNING - MARKING AS PENDING ***')
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size === 0) {
          console.log(`🔍 [documents-formdata] [${i + 1}/${files.length}] Skipping empty file`)
          continue
        }

        console.log(`🔍 [documents-formdata] [${i + 1}/${files.length}] Processing: ${file.name}, size: ${file.size}`)

        // Convert to buffer
        const fileBuffer = await file.arrayBuffer()

        // Generate unique file name
        const fileName = `${documentId}/${Date.now()}-${file.name}`

        console.log(`🔍 [documents-formdata] [${i + 1}/${files.length}] Uploading to storage: ${fileName}`)
        const uploadStart = Date.now()

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: false,
          })

        const uploadDuration = Date.now() - uploadStart
        console.log(`🔍 [documents-formdata] [${i + 1}/${files.length}] Upload completed in ${uploadDuration}ms`)

        if (uploadError) {
          console.error(`🔍 [documents-formdata] [${i + 1}/${files.length}] Upload error:`, uploadError)
          return { 
            success: false, 
            error: `Failed to upload file ${file.name}: ${uploadError.message}` 
          }
        }

        // Use service role client for DB insert
        const supabaseAdmin = createServiceRoleClient()
        
        // Format filename with smart renaming
        const formattedFileName = formatDocumentFilename(
          document.document_number,
          document.version,
          file.name,
          autoRename
        )
        
        console.log(`🔍 [documents-formdata] [${i + 1}/${files.length}] Creating DB record with scan_status='pending'`)
        console.log(`🔍 [documents-formdata] [${i + 1}/${files.length}] Formatted filename: ${formattedFileName}`)
        
        // Create file record with scan_status='pending'
        // Cron job will pick it up and scan in background
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
            scan_status: 'pending', // Will be scanned by cron job
          })
          .select()
          .single()

        if (fileError) {
          console.error(`🔍 [documents-formdata] [${i + 1}/${files.length}] DB insert error:`, fileError)
          await supabase.storage.from('documents').remove([fileName])
          return { 
            success: false, 
            error: `Failed to save file metadata for ${file.name}: ${fileError.message}` 
          }
        }

        console.log(`🔍 [documents-formdata] [${i + 1}/${files.length}] ✅ File queued for scanning`)
        uploadedFiles.push(fileRecord)
      }
    } else {
      console.log('🔍 [documents-formdata] No files to process')
    }

    const totalDuration = Date.now() - requestStartTime
    console.log(`🔍 [documents-formdata] Total request duration: ${totalDuration}ms`)
    console.log('🔍 [documents-formdata] ========== ACTION COMPLETED ==========')

    revalidatePath('/documents')
    
    return {
      success: true,
      documentNumber: document.document_number,
      version: document.version,
      filesUploaded: uploadedFiles.length,
    }
  } catch (error: any) {
    const totalDuration = Date.now() - requestStartTime
    console.error('🔍 [documents-formdata] EXCEPTION:', error)
    console.error('🔍 [documents-formdata] Duration before error:', totalDuration, 'ms')
    console.error('🔍 [documents-formdata] Stack:', error.stack)
    console.log('🔍 [documents-formdata] ========== ACTION FAILED ==========')
    return { success: false, error: error.message || 'An error occurred' }
  }
}
