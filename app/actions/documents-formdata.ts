'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDocumentFilename } from '@/lib/file-naming'
import { inngest } from '@/lib/inngest/client'
import { createDocumentAudit, AuditAction } from '@/lib/audit-helper'

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
      .select('*')
      .eq('id', documentId)
      .single()

    if (getError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Use the DOCUMENT's tenant_id (not the creator's home tenant)
    const tenantId = document.tenant_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('auto_rename_files, virus_scan_enabled')
      .eq('id', tenantId)
      .single()
    
    const autoRename = tenant?.auto_rename_files ?? true
    const virusScanEnabled = tenant?.virus_scan_enabled ?? true

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

    // Handle file uploads
    const files = formData.getAll('files') as File[]
    const uploadedFiles: any[] = []
    
    if (files.length > 0) {
      console.log(`Uploading ${files.length} files for document ${documentId}`)
      console.log(`Virus scanning: ${virusScanEnabled ? 'ENABLED' : 'DISABLED'}`)
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size === 0) continue

        console.log(`[${i + 1}/${files.length}] Processing file: ${file.name}, size: ${file.size}`)

        // Convert to buffer
        const fileBuffer = await file.arrayBuffer()

        // Generate unique file name
        const fileName = `${documentId}/${Date.now()}-${file.name}`

        // Upload to Supabase Storage
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

        console.log(`[${i + 1}/${files.length}] File uploaded to storage`)

        // Use service role client for DB insert
        const supabaseAdmin = createServiceRoleClient()
        
        // Format filename with smart renaming
        const formattedFileName = formatDocumentFilename(
          document.document_number,
          document.version,
          file.name,
          autoRename
        )
        
        // Set scan_status based on virus_scan_enabled setting
        const scanStatus = virusScanEnabled ? 'pending' : 'safe'
        
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
            scanned_at: virusScanEnabled ? null : new Date().toISOString(),
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

        console.log(`[${i + 1}/${files.length}] ✅ File ${virusScanEnabled ? 'queued for scanning' : 'marked as safe (scanning disabled)'}`)

        // AUDIT: Log file upload
        await createDocumentAudit({
          documentId: documentId,
          action: AuditAction.FILE_UPLOADED,
          performedBy: user.id,
          performedByEmail: user.email!,
          tenantId: tenantId,
          details: {
            file_id: fileRecord.id,
            file_name: fileRecord.file_name,
            original_file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            virus_scan_enabled: virusScanEnabled,
          }
        })

        // Only trigger Inngest if virus scanning is enabled
        if (virusScanEnabled) {
          try {
            await inngest.send({
              name: 'file/uploaded',
              data: {
                fileId: fileRecord.id,
              },
            })
            console.log(`[${i + 1}/${files.length}] 🚀 Inngest scan triggered`)
          } catch (inngestError) {
            console.warn(`[${i + 1}/${files.length}] ⚠️ Inngest not configured, skipping background scan:`, inngestError instanceof Error ? inngestError.message : 'Unknown error')
            // File upload succeeded, just no background scanning
          }
        } else {
          console.log(`[${i + 1}/${files.length}] ⏭️  Skipping virus scan (disabled by tenant)`)
        }

        uploadedFiles.push(fileRecord)
      }
    }

    revalidatePath('/documents')
    
    return {
      success: true,
      documentNumber: document.document_number,
      version: document.version,
      filesUploaded: uploadedFiles.length,
      virusScanEnabled,
    }
  } catch (error: any) {
    console.error('Server action error:', error)
    return { success: false, error: error.message || 'An error occurred' }
  }
}
