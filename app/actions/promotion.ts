// app/actions/promotion.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger, logServerAction, logError } from '@/lib/logger'
import { uuidSchema } from '@/lib/validation/schemas'

/**
 * Promote a Released Prototype document to Production
 * Creates a new Production document starting at v1
 */
export async function promoteToProduction(prototypeDocumentId: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate ID
    const idValidation = uuidSchema.safeParse(prototypeDocumentId)
    if (!idValidation.success) {
      logger.warn('Invalid document ID for promotion', { 
        providedId: prototypeDocumentId 
      })
      return { 
        success: false, 
        error: 'Invalid document ID' 
      }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('Unauthorized promotion attempt', { 
        error: userError?.message 
      })
      return { 
        success: false, 
        error: 'You must be logged in to promote documents' 
      }
    }

    const userId = user.id
    const userEmail = user.email

    logger.info('Promoting document to production', {
      userId,
      userEmail,
      prototypeDocumentId
    })

    // Fetch source Prototype document
    const { data: prototypeDoc, error: fetchError } = await supabase
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
      .eq('id', prototypeDocumentId)
      .single()

    if (fetchError || !prototypeDoc) {
      logger.error('Source document not found for promotion', {
        userId,
        userEmail,
        prototypeDocumentId,
        error: fetchError
      })
      return { 
        success: false, 
        error: 'Source document not found' 
      }
    }

    // Validate: Must be Prototype
    if (prototypeDoc.is_production) {
      logger.warn('Attempted to promote Production document', {
        userId,
        userEmail,
        documentId: prototypeDocumentId,
        documentNumber: prototypeDoc.document_number
      })
      return { 
        success: false, 
        error: 'Document is already Production. Only Prototype documents can be promoted.' 
      }
    }

    // Validate: Must be Released
    if (prototypeDoc.status !== 'Released') {
      logger.warn('Attempted to promote non-released document', {
        userId,
        userEmail,
        documentId: prototypeDocumentId,
        documentNumber: prototypeDoc.document_number,
        currentStatus: prototypeDoc.status
      })
      return { 
        success: false, 
        error: `Only Released Prototype documents can be promoted. Current status: ${prototypeDoc.status}` 
      }
    }

    // Validate: User must be creator (or admin in future)
    if (prototypeDoc.created_by !== userId) {
      logger.warn('Non-creator attempted to promote document', {
        userId,
        userEmail,
        documentId: prototypeDocumentId,
        documentNumber: prototypeDoc.document_number,
        creatorId: prototypeDoc.created_by
      })
      return { 
        success: false, 
        error: 'Only the document creator can promote to Production' 
      }
    }

    // Check if Production v1 already exists
    const { data: existingProduction, error: checkError } = await supabase
      .from('documents')
      .select('id, version, status')
      .eq('document_number', prototypeDoc.document_number)
      .eq('is_production', true)
      .eq('version', 'v1')
      .maybeSingle()

    if (checkError) {
      logger.error('Error checking for existing production version', {
        userId,
        documentNumber: prototypeDoc.document_number,
        error: checkError
      })
      throw checkError
    }

    if (existingProduction) {
      logger.warn('Production v1 already exists for document', {
        userId,
        userEmail,
        prototypeDocumentId,
        documentNumber: prototypeDoc.document_number,
        existingProductionId: existingProduction.id,
        existingStatus: existingProduction.status
      })
      return { 
        success: false, 
        error: `Production version already exists for ${prototypeDoc.document_number} (Status: ${existingProduction.status})` 
      }
    }

    // Create new Production document at v1
    const { data: productionDoc, error: insertError } = await supabase
      .from('documents')
      .insert({
        document_type_id: prototypeDoc.document_type_id,
        document_number: prototypeDoc.document_number,
        version: 'v1', // Production starts at v1
        title: prototypeDoc.title,
        description: prototypeDoc.description,
        status: 'Draft', // Starts as Draft, requires approval
        is_production: true,
        project_code: prototypeDoc.project_code,
        created_by: userId
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to create production document', {
        userId,
        userEmail,
        prototypeDocumentId,
        documentNumber: prototypeDoc.document_number,
        error: insertError
      })
      throw insertError
    }

    // Create audit log for new Production document
    const { error: auditNewError } = await supabase
      .from('audit_log')
      .insert({
        document_id: productionDoc.id,
        action: 'promoted_to_production',
        performed_by: userId,
        performed_by_email: userEmail || '',
        details: {
          source_prototype_id: prototypeDocumentId,
          source_version: prototypeDoc.version,
          production_version: 'v1',
          document_number: prototypeDoc.document_number,
          promotion_date: new Date().toISOString()
        }
      })

    if (auditNewError) {
      logger.error('Failed to create audit log for promotion', {
        userId,
        productionDocId: productionDoc.id,
        error: auditNewError
      })
      // Don't fail the operation
    }

    // Create audit log for source Prototype (reference)
    const { error: auditSourceError } = await supabase
      .from('audit_log')
      .insert({
        document_id: prototypeDocumentId,
        action: 'document_promoted',
        performed_by: userId,
        performed_by_email: userEmail || '',
        details: {
          promoted_to_id: productionDoc.id,
          production_version: 'v1',
          document_number: prototypeDoc.document_number
        }
      })

    if (auditSourceError) {
      logger.error('Failed to create source audit log for promotion', {
        userId,
        prototypeDocumentId,
        error: auditSourceError
      })
      // Don't fail the operation
    }

    const duration = Date.now() - startTime
    
    logger.info('Document promoted to production successfully', {
      userId,
      userEmail,
      prototypeDocumentId,
      prototypeVersion: prototypeDoc.version,
      productionDocumentId: productionDoc.id,
      productionVersion: 'v1',
      documentNumber: prototypeDoc.document_number,
      duration
    })

    logServerAction('promoteToProduction', {
      userId,
      userEmail,
      prototypeDocumentId,
      productionDocumentId: productionDoc.id,
      documentNumber: prototypeDoc.document_number,
      duration,
      success: true
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${prototypeDocumentId}`)
    revalidatePath(`/documents/${productionDoc.id}`)
    
    return { 
      success: true, 
      data: productionDoc 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'promoteToProduction',
      prototypeDocumentId,
      userId: (await supabase.auth.getUser()).data.user?.id,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to promote to production' 
    }
  }
}

/**
 * Check if a document can be promoted to production
 * Validates all promotion requirements
 */
export async function canPromoteToProduction(documentId: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    // Validate ID
    const idValidation = uuidSchema.safeParse(documentId)
    if (!idValidation.success) {
      return { 
        canPromote: false, 
        reason: 'Invalid document ID' 
      }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { 
        canPromote: false, 
        reason: 'You must be logged in' 
      }
    }

    // Fetch document
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('id, document_number, version, status, is_production, created_by')
      .eq('id', documentId)
      .single()

    if (fetchError || !doc) {
      logger.error('Document not found for promotion check', {
        documentId,
        error: fetchError
      })
      return { 
        canPromote: false, 
        reason: 'Document not found' 
      }
    }

    // Check: Must be Prototype
    if (doc.is_production) {
      return { 
        canPromote: false, 
        reason: 'Document is already Production' 
      }
    }

    // Check: Must be Released
    if (doc.status !== 'Released') {
      return { 
        canPromote: false, 
        reason: `Document must be Released (current: ${doc.status})` 
      }
    }

    // Check: User must be creator
    if (doc.created_by !== user.id) {
      return { 
        canPromote: false, 
        reason: 'Only the creator can promote documents' 
      }
    }

    // Check: Production v1 doesn't already exist
    const { data: existingProduction } = await supabase
      .from('documents')
      .select('id')
      .eq('document_number', doc.document_number)
      .eq('is_production', true)
      .eq('version', 'v1')
      .maybeSingle()

    if (existingProduction) {
      return { 
        canPromote: false, 
        reason: 'Production version already exists' 
      }
    }

    const duration = Date.now() - startTime
    
    logger.debug('Promotion eligibility check passed', {
      documentId,
      documentNumber: doc.document_number,
      userId: user.id,
      duration
    })

    return { 
      canPromote: true, 
      reason: null 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'canPromoteToProduction',
      documentId,
      duration
    })

    return { 
      canPromote: false, 
      reason: 'Error checking promotion eligibility' 
    }
  }
}

/**
 * Get promotion history for a document number
 * Shows all Prototype -> Production promotions
 */
export async function getPromotionHistory(documentNumber: string) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    logger.debug('Fetching promotion history', {
      documentNumber
    })

    // Get all promotion audit logs for this document number
    const { data: promotions, error } = await supabase
      .from('audit_log')
      .select(`
        id,
        document_id,
        action,
        performed_by_email,
        created_at,
        details
      `)
      .eq('action', 'promoted_to_production')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching promotion history', {
        documentNumber,
        error
      })
      throw error
    }

    // Filter to promotions for this document number
    const relevantPromotions = promotions?.filter(p => 
      p.details && 
      typeof p.details === 'object' && 
      'document_number' in p.details &&
      p.details.document_number === documentNumber
    ) || []

    const duration = Date.now() - startTime
    
    logger.debug('Promotion history fetched', {
      documentNumber,
      promotionCount: relevantPromotions.length,
      duration
    })

    return { 
      success: true, 
      data: relevantPromotions 
    }

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(error, {
      action: 'getPromotionHistory',
      documentNumber,
      duration
    })

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch promotion history',
      data: []
    }
  }
}
