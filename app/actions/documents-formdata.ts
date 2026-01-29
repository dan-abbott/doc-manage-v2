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
    
    const autoRename = tenant?.auto_rename_files ?? true // Default to true

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
    
    if (files.length > 0) {
      console.log(`Uploading ${files.length} files for document ${documentId}`)
      
      for (const file of files) {
        if (file.size === 0) continue // Skip empty files

        console.log(`Processing file: ${file.name}, size: ${file.size}`)

        // ==========================================
        // VIRUS SCAN WITH VIRUSTOTAL
        // ==========================================
        console.log('[VirusTotal] Converting file to buffer...')
        const fileBuffer = await file.arrayBuffer()
        
        console.log('[VirusTotal] Starting virus scan for:', file.name, {
          size: file.size,
          type: file.type,
          hasApiKey: !!process.env.VIRUSTOTAL_API_KEY,
          apiKeyLength: process.env.VIRUSTOTAL_API_KEY?.length || 0,
        })
        
        const scanResult = await scanFile(fileBuffer, file.name)
        
        console.log('[VirusTotal] Scan result:', scanResult)
        
        if ('error' in scanResult) {
          console.error('[VirusTotal] Scan error:', scanResult.error, scanResult.details)
          // Continue with upload if VirusTotal is not configured or fails
        } else {
          console.log('[VirusTotal] Scan complete:', {
            safe: scanResult.safe,
            malicious: scanResult.malicious,
            suspicious: scanResult.suspicious,
            permalink: scanResult.permalink
          })
          
          if (!scanResult.safe) {
            console.error('[VirusTotal] ⚠️  MALWARE DETECTED - blocking upload')
            return {
              success: false,
              error: `File "${file.name}" blocked: ${scanResult.malicious} malicious and ${scanResult.suspicious} suspicious detections found. This file may contain malware.`
            }
          }
          
          console.log('[VirusTotal] ✅ File is clean, proceeding with upload')
        }

        // Generate unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${documentId}/${Date.now()}-${file.name}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
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

        // Use service role client to bypass RLS for file insert
        // We've already verified ownership above, so this is safe
        const supabaseAdmin = createServiceRoleClient()
        
        // Format filename with smart renaming (scrubs old prefix, applies current)
        const formattedFileName = formatDocumentFilename(
          document.document_number,
          document.version,
          file.name,
          autoRename
        )
        
        // Create file record with tenant_id
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
            tenant_id: document.tenant_id, // Include tenant_id from document
          })
          .select()

        if (fileError) {
          console.error('File record creation error:', fileError)
          return { 
            success: false, 
            error: `Failed to save file metadata for ${file.name}: ${fileError.message}` 
          }
        }

        console.log('File record created:', fileRecord)
      }
    }

    revalidatePath('/documents')
    
    return {
      success: true,
      documentNumber: document.document_number,
      version: document.version,
    }
  } catch (error: any) {
    console.error('Server action error:', error)
    return { success: false, error: error.message || 'An error occurred' }
  }
}
