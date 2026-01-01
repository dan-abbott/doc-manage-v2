// app/actions/versions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger, logServerAction, logError } from '@/lib/logger'
import { uuidSchema } from '@/lib/validation/schemas'

/**
 * Create a new version of an existing document
 * Only works on Released documents
 */
export async function createNewVersion(sourceDocumentId: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate ID
    const idValidation = uuidSchema.safeParse(sourceDocumentId)
    if (!idValidation.success) {
      logger.warn('Invalid document ID for version creation', { 
        providedId: sourceDocumentId 
      })
      return { 
        success: false, 
        error: 'Invalid document ID' 
      }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized version creation attempt', { 
        error: userError?.message 
      })
      return { 
        success: false, 
        error: 'You must be logged in to create versions' 
      }
    }

    const userId = user.id
    const userEmail = user.email

    logger.info('Creating new document version', {
      userId,
      userEmail,
      sourceDocumentId
    })

    // Fetch source document with all needed info
    const { data: sourceDoc, error: fetchError } = await supabase
      .from('documents')
      .select(`
        id,
        document_number,
        version,
        title,
        description,
        status,
        is_production,
        project_code,
        document_type_id,
        created_by
      `)
      .eq('id', sourceDocumentId)
      .single()

    if (fetchError || !sourceDoc) {
      logger.error('Source document not found for versioning', {
        userId,
        userEmail,
        sourceDocumentId,
        error: fetchError
      })
      return { 
        success: false, 
        error: 'Source document not found' 
      }
    }

    // Validate source document status
    if (sourceDoc.status !== 'Released') {
      logger.warn('Attempted to version non-released document', {
        userId,
        userEmail,
        sourceDocumentId,
        documentNumber: sourceDoc.document_number,
        currentStatus: sourceDoc.status
      })
      return { 
        success: false, 
        error: 'Only Released documents can be versioned. Current status: ' + sourceDoc.status 
      }
    }

    // Determine next version
    // For Production: v1 -> v2 -> v3
    // For Prototype: vA -> vB -> vC
    let nextVersion: string

    if (sourceDoc.is_production) {
      // Extract numeric version (v1 -> 1)
      const currentVersionNum = parseInt(sourceDoc.version.substring(1))
      nextVersion = `v${currentVersionNum + 1}`
      
      logger.debug('Calculating next production version', {
        currentVersion: sourceDoc.version,
        nextVersion,
        documentNumber: sourceDoc.document_number
      })
    } else {
      // Extract letter version (vA -> A)
      const currentVersionLetter = sourceDoc.version.substring(1)
      const nextLetter = String.fromCharCode(currentVersionLetter.charCodeAt(0) + 1)
      nextVersion = `v${nextLetter}`
      
      logger.debug('Calculating next prototype version', {
        currentVersion: sourceDoc.version,
        nextVersion,
        documentNumber: sourceDoc.document_number
      })
    }

    // Check if next version already exists
    const { data: existingVersion, error: checkError } = await supabase
      .from('documents')
      .select('id, version')
      .eq('document_number', sourceDoc.document_number)
      .eq('version', nextVersion)
      .maybeSingle()

    if (checkError) {
      logger.error('Error checking for existing version', {
        userId,
        documentNumber: sourceDoc.document_number,
        nextVersion,
        error: checkError
      })
      throw checkError
    }

    if (existingVersion) {
      logger.warn('Next version already exists', {
        userId,
        userEmail,
        documentNumber: sourceDoc.document_number,
        existingVersion: nextVersion
      })
      return { 
        success: false, 
        error: `Version ${nextVersion} already exists for this document` 
      }
    }

    // Create new version as Draft
    const { data: newVersion, error: insertError } = await supabase
      .from('documents')
      .insert({
        document_type_id: sourceDoc.document_type_id,
        document_number: sourceDoc.document_number,
        version: nextVersion,
        title: sourceDoc.title,
        description: sourceDoc.description,
        status: 'Draft',
        is_production: sourceDoc.is_production,
        project_code: sourceDoc.project_code,
        created_by: userId
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to create new version', {
        userId,
        userEmail,
        sourceDocumentId,
        documentNumber: sourceDoc.document_number,
        nextVersion,
        error: insertError
      })
      throw insertError
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        document_id: newVersion.id,
        action: 'version_created',
        performed_by: userId,
        performed_by_email: userEmail || '',
        details: {
          source_document_id: sourceDocumentId,
          source_version: sourceDoc.version,
          new_version: nextVersion,
          document_number: sourceDoc.document_number
        }
      })

    if (auditError) {
      logger.error('Failed to create audit log for version creation', {
        userId,
        newVersionId: newVersion.id,
        error: auditError
      })
      // Don't fail the operation, just log the error
    }

    const duration = Date.now() - startTime
    
    logger.info('New version created successfully', {
      userId,
      userEmail,
      sourceDocumentId,
      sourceVersion: sourceDoc.version,
      newVersionId: newVersion.id,
      newVersion: nextVersion,
      documentNumber: sourceDoc.document_number,
      isProduction: sourceDoc.is_production,
      duration
    })

    logServerAction('createNewVersion', {
      userId,
      userEmail,
      sourceDocumentId,
      newVersionId: newVersion.id,
      documentNumber: sourceDoc.document_number,
      newVersion: nextVersion,
      duration,
      success: true
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${sourceDocumentId}`)
    revalidatePath(`/documents/${newVersion.id}`)
    
    return { 
      success: true, 
      data: newVersion 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'createNewVersion',
      sourceDocumentId,
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create new version' 
    }
  }
}

/**
 * Mark previous version as obsolete when new version is released
 * This is called automatically when a document is released
 */
export async function markPreviousVersionObsolete(
  documentNumber: string, 
  currentVersion: string,
  currentUserId: string
) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    logger.info('Marking previous version as obsolete', {
      documentNumber,
      currentVersion,
      userId: currentUserId
    })

    // Get all versions of this document
    const { data: allVersions, error: fetchError } = await supabase
      .from('documents')
      .select('id, version, status, is_production')
      .eq('document_number', documentNumber)
      .order('created_at', { ascending: true })

    if (fetchError) {
      logger.error('Error fetching document versions', {
        documentNumber,
        error: fetchError
      })
      throw fetchError
    }

    if (!allVersions || allVersions.length === 0) {
      logger.warn('No versions found for document', {
        documentNumber
      })
      return { success: false, error: 'No versions found' }
    }

    // Find the current version in the list
    const currentVersionIndex = allVersions.findIndex(v => v.version === currentVersion)
    
    if (currentVersionIndex === -1) {
      logger.warn('Current version not found in version list', {
        documentNumber,
        currentVersion,
        availableVersions: allVersions.map(v => v.version)
      })
      return { success: false, error: 'Current version not found' }
    }

    // If this is the first version, nothing to obsolete
    if (currentVersionIndex === 0) {
      logger.debug('First version - nothing to obsolete', {
        documentNumber,
        currentVersion
      })
      return { success: true }
    }

    // Get the immediate previous version
    const previousVersion = allVersions[currentVersionIndex - 1]

    // Only obsolete if previous version is Released
    if (previousVersion.status !== 'Released') {
      logger.debug('Previous version not Released - skipping obsolete', {
        documentNumber,
        previousVersion: previousVersion.version,
        previousStatus: previousVersion.status
      })
      return { success: true }
    }

    // Mark previous version as Obsolete
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'Obsolete' })
      .eq('id', previousVersion.id)

    if (updateError) {
      logger.error('Failed to mark previous version obsolete', {
        documentNumber,
        previousVersionId: previousVersion.id,
        previousVersion: previousVersion.version,
        error: updateError
      })
      throw updateError
    }

    // Get user email for audit log
    const { data: { user } } = await supabase.auth.getUser()
    const userEmail = user?.email || ''

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        document_id: previousVersion.id,
        action: 'document_obsoleted',
        performed_by: currentUserId,
        performed_by_email: userEmail,
        details: {
          obsoleted_version: previousVersion.version,
          new_released_version: currentVersion,
          document_number: documentNumber,
          reason: 'Newer version released'
        }
      })

    if (auditError) {
      logger.error('Failed to create audit log for obsolete', {
        documentId: previousVersion.id,
        error: auditError
      })
      // Don't fail the operation
    }

    const duration = Date.now() - startTime
    
    logger.info('Previous version marked obsolete', {
      documentNumber,
      obsoletedVersion: previousVersion.version,
      obsoletedDocumentId: previousVersion.id,
      newReleasedVersion: currentVersion,
      userId: currentUserId,
      duration
    })

    logServerAction('markPreviousVersionObsolete', {
      documentNumber,
      obsoletedVersion: previousVersion.version,
      newVersion: currentVersion,
      userId: currentUserId,
      duration,
      success: true
    })

    revalidatePath('/documents')
    
    return { success: true }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'markPreviousVersionObsolete',
      documentNumber,
      currentVersion,
      userId: currentUserId,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to mark version obsolete' 
    }
  }
}

/**
 * Get all versions of a document by document number
 */
export async function getDocumentVersions(documentNumber: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    logger.debug('Fetching document versions', {
      documentNumber
    })

    const { data: versions, error } = await supabase
      .from('documents')
      .select(`
        id,
        version,
        status,
        is_production,
        created_at,
        released_at,
        released_by,
        users:released_by (
          email,
          full_name
        )
      `)
      .eq('document_number', documentNumber)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Error fetching document versions', {
        documentNumber,
        error
      })
      throw error
    }

    const duration = Date.now() - startTime
    
    logger.debug('Document versions fetched', {
      documentNumber,
      versionCount: versions?.length || 0,
      duration
    })

    return { 
      success: true, 
      data: versions || [] 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'getDocumentVersions',
      documentNumber,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch versions',
      data: []
    }
  }
}

/**
 * Get latest released version of a document
 */
export async function getLatestReleasedVersion(documentNumber: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('document_number', documentNumber)
    .eq('status', 'Released')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error) throw error
  return data
}

/**
 * Get version history for a document
 */
export async function getVersionHistory(documentNumber: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      users!documents_created_by_fkey(email),
      document_types(name, prefix)
    `)
    .eq('document_number', documentNumber)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}
