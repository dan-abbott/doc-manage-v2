'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { scanFile } from '@/lib/virustotal'
import { getCurrentSubdomain } from '@/lib/tenant'

// ==========================================
// Types
// ==========================================

export interface UploadFileInput {
  documentId: string
  file: File
  originalFileName: string
}

// ==========================================
// Helper: Smart File Renaming
// ==========================================

/**
 * Smart file renaming that:
 * 1. Checks if file already has doc number prefix
 * 2. Removes old/incorrect prefix if present
 * 3. Adds correct prefix if auto_rename is enabled
 */
function smartRenameFile(
  originalFileName: string,
  documentNumber: string,
  version: string,
  autoRename: boolean
): { fileName: string; wasRenamed: boolean } {
  const expectedPrefix = `${documentNumber}${version}_`

  // Pattern to match any doc number prefix: FORM-00001vA_ or PROC-00123v2_
  // Matches: PREFIX-#####v[A-Z or number]_
  const docPrefixPattern = /^[A-Z]+-\d{5}v[A-Z0-9]+_/

  // Check if file already has a doc number prefix
  const hasExistingPrefix = docPrefixPattern.test(originalFileName)

  if (hasExistingPrefix) {
    // Remove the existing prefix (could be old/incorrect)
    const cleanFileName = originalFileName.replace(docPrefixPattern, '')

    // If auto-rename is enabled, add the correct prefix
    if (autoRename) {
      return {
        fileName: `${expectedPrefix}${cleanFileName}`,
        wasRenamed: true
      }
    } else {
      // Auto-rename disabled, just use the clean filename
      return {
        fileName: cleanFileName,
        wasRenamed: true
      }
    }
  } else {
    // No existing prefix
    if (autoRename) {
      return {
        fileName: `${expectedPrefix}${originalFileName}`,
        wasRenamed: true
      }
    } else {
      return {
        fileName: originalFileName,
        wasRenamed: false
      }
    }
  }
}

// ==========================================
// Helper: Log Audit Entry
// ==========================================

async function logAudit(
  supabase: any,
  documentId: string,
  action: string,
  userId: string,
  userEmail: string,
  details?: any
) {
  const { error } = await supabase.rpc('log_audit_entry', {
    p_document_id: documentId,
    p_action: action,
    p_performed_by: userId,
    p_performed_by_email: userEmail,
    p_details: details || null
  })

  if (error) {
    console.error('Failed to log audit entry:', error)
  }
}

// ==========================================
// Action: Upload File
// ==========================================

export async function uploadFile(formData: FormData) {
  console.log('🚨 [TEST] uploadFile function called!')

  try {

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Extract form data
    const documentId = formData.get('documentId') as string
    const file = formData.get('file') as File

    if (!documentId || !file) {
      return { success: false, error: 'Document ID and file are required' }
    }

    console.log('[Upload] Starting file upload:', {
      documentId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    // Get document to verify ownership and get document number
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, created_by, status, document_number, version, tenant_id')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // Check ownership
    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized to upload files to this document' }
    }

    // Check status - only Draft can have files uploaded
    if (document.status !== 'Draft') {
      return {
        success: false,
        error: 'Files can only be uploaded to Draft documents'
      }
    }

    // Get tenant settings for auto-rename
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('auto_rename_files')
      .eq('id', document.tenant_id)
      .single()

    if (tenantError) {
      console.error('Error fetching tenant settings:', tenantError)
      // Continue with default (no auto-rename)
    }

    const autoRename = tenant?.auto_rename_files || false

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 50MB limit'
      }
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'text/plain',
      'text/csv'
    ]

    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT, CSV'
      }
    }

    // ==========================================
    // VIRUS SCAN - ENHANCED DEBUG LOGGING
    // ==========================================

    console.log('[VirusTotal] Pre-scan check:', {
      fileName: file.name,
      fileSize: file.size,
      hasApiKey: !!process.env.VIRUSTOTAL_API_KEY,
      apiKeyLength: process.env.VIRUSTOTAL_API_KEY?.length || 0,
      apiKeyPrefix: process.env.VIRUSTOTAL_API_KEY?.substring(0, 8) + '...',
    })

    const fileBuffer = await file.arrayBuffer()
    console.log('[VirusTotal] File buffer created, size:', fileBuffer.byteLength)
    console.log('[VirusTotal] Starting virus scan for file:', file.name)

    const scanResult = await scanFile(fileBuffer, file.name)

    console.log('[VirusTotal] Scan result received:', {
      hasError: 'error' in scanResult,
      result: scanResult
    })

    if ('error' in scanResult) {
      console.error('[VirusTotal] Virus scan error:', scanResult.error)
      console.error('[VirusTotal] Error details:', scanResult.details)
      // Log the error but allow upload to continue if VirusTotal is not configured
      // In production, you may want to block uploads if scanning fails
    } else {
      console.log('[VirusTotal] Virus scan result:', {
        safe: scanResult.safe,
        malicious: scanResult.malicious,
        suspicious: scanResult.suspicious,
        undetected: scanResult.undetected,
        harmless: scanResult.harmless,
        scanId: scanResult.scanId,
        permalink: scanResult.permalink
      })

      if (!scanResult.safe) {
        return {
          success: false,
          error: `File blocked: ${scanResult.malicious} malicious and ${scanResult.suspicious} suspicious detections found. This file may contain malware.`,
        }
      }

      console.log('[VirusTotal] ✅ File passed virus scan - safe to upload')
    }

    // Smart file renaming
    const originalFileName = file.name
    const { fileName: displayName, wasRenamed } = smartRenameFile(
      originalFileName,
      document.document_number,
      document.version,
      autoRename
    )

    console.log('[File Upload] Smart rename:', {
      original: originalFileName,
      final: displayName,
      wasRenamed,
      autoRename,
      docNumber: document.document_number,
      version: document.version
    })

    // Generate file path: documents/{subdomain}/{docNumber}/{filename}
    const tenantSubdomain = await getCurrentSubdomain()
    const filePath = `${tenantSubdomain}/${document.document_number}/${displayName}`

    console.log('[File Upload] Storage path:', filePath)

    // Upload to storage (reuse buffer from virus scan)
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)

      // Check if file already exists
      if (uploadError.message?.includes('already exists')) {
        return {
          success: false,
          error: 'A file with this name already exists. Please rename and try again.'
        }
      }

      return {
        success: false,
        error: uploadError.message || 'Failed to upload file'
      }
    }

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('document_files')
      .insert({
        document_id: documentId,
        file_name: displayName,
        original_file_name: originalFileName,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)

      // Try to clean up storage if database insert fails
      await supabase.storage.from('documents').remove([filePath])

      return { success: false, error: 'Failed to save file metadata' }
    }

    // Log audit entry
    await logAudit(
      supabase,
      documentId,
      'file_uploaded',
      user.id,
      user.email || '',
      {
        file_name: originalFileName,
        renamed_to: displayName,
        auto_renamed: wasRenamed,
        file_size: file.size,
        mime_type: file.type
      }
    )

    revalidatePath(`/documents/${documentId}`)

    return {
      success: true,
      file: fileRecord,
      wasRenamed,
      message: wasRenamed
        ? `File uploaded and renamed to: ${displayName}`
        : 'File uploaded successfully'
    }
  } catch (error: any) {
    console.error('Upload file error:', error)
    return { success: false, error: error.message || 'Failed to upload file' }
  }
}

// ==========================================
// Action: Delete File
// ==========================================

export async function deleteFile(fileId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get file with document info
    const { data: file, error: fileError } = await supabase
      .from('document_files')
      .select(`
        *,
        document:documents(id, created_by, status)
      `)
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return { success: false, error: 'File not found' }
    }

    // Check document ownership
    if (file.document.created_by !== user.id) {
      return { success: false, error: 'Not authorized to delete this file' }
    }

    // Check document status - only Draft documents can have files deleted
    if (file.document.status !== 'Draft') {
      return {
        success: false,
        error: 'Files can only be deleted from Draft documents'
      }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([file.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue anyway - we'll delete the database record
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('document_files')
      .delete()
      .eq('id', fileId)

    if (deleteError) {
      console.error('Delete file error:', deleteError)
      return { success: false, error: 'Failed to delete file' }
    }

    // Log audit entry
    await logAudit(
      supabase,
      file.document_id,
      'file_deleted',
      user.id,
      user.email || '',
      {
        file_name: file.original_file_name,
        file_size: file.file_size
      }
    )

    revalidatePath(`/documents/${file.document_id}`)

    return {
      success: true,
      message: 'File deleted successfully'
    }
  } catch (error: any) {
    console.error('Delete file error:', error)
    return { success: false, error: error.message || 'Failed to delete file' }
  }
}

// ==========================================
// Action: Get File Download URL
// ==========================================

export async function getFileDownloadUrl(fileId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get file with document info (RLS will check access)
    const { data: file, error: fileError } = await supabase
      .from('document_files')
      .select(`
        *,
        document:documents(id, created_by, status)
      `)
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return { success: false, error: 'File not found or access denied' }
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(file.file_path, 3600) // 3600 seconds = 1 hour

    if (urlError || !signedUrl) {
      console.error('Create signed URL error:', urlError)
      return { success: false, error: 'Failed to generate download URL' }
    }

    return {
      success: true,
      url: signedUrl.signedUrl,
      fileName: file.original_file_name
    }
  } catch (error: any) {
    console.error('Get download URL error:', error)
    return { success: false, error: error.message || 'Failed to get download URL' }
  }
}

// ==========================================
// Action: Upload Multiple Files
// ==========================================

export async function uploadMultipleFiles(formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    const documentId = formData.get('documentId') as string
    if (!documentId) {
      return { success: false, error: 'Document ID is required' }
    }

    console.log('[Upload Multiple] Starting upload for document:', documentId)

    // Get all files from FormData
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        files.push(value)
      }
    }

    console.log('[Upload Multiple] Found files:', files.length, files.map(f => f.name))

    if (files.length === 0) {
      return { success: false, error: 'No files provided' }
    }

    // Verify document access once
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()


    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.created_by !== user.id) {
      return { success: false, error: 'Not authorized' }
    }

    if (document.status !== 'Draft') {
      return { success: false, error: 'Files can only be uploaded to Draft documents' }
    }

    // Upload all files
    const results = []
    const errors = []

    for (const file of files) {
      console.log('[Upload Multiple] Processing file:', file.name)

      const fileFormData = new FormData()
      fileFormData.append('documentId', documentId)
      fileFormData.append('file', file)

      const result = await uploadFile(fileFormData)

      console.log('[Upload Multiple] File result:', file.name, result.success ? '✅' : '❌', result)

      if (result.success) {
        results.push(result.file)
      } else {
        errors.push({ fileName: file.name, error: result.error })
      }
    }

    revalidatePath(`/documents/${documentId}`)

    console.log('[Upload Multiple] Complete:', {
      total: files.length,
      uploaded: results.length,
      failed: errors.length
    })

    return {
      success: true,
      uploaded: results.length,
      failed: errors.length,
      files: results,
      errors: errors,
      message: `Uploaded ${results.length} of ${files.length} files`
    }
  } catch (error: any) {
    console.error('Upload multiple files error:', error)
    return { success: false, error: error.message || 'Failed to upload files' }
  }
}
