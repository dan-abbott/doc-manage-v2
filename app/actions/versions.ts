'use server'

import { createClient } from '@/lib/supabase/server'
import { getNextVersion, parseVersion } from '@/lib/utils/version'
import { revalidatePath } from 'next/cache'

// ==========================================
// Types
// ==========================================

export interface VersionHistoryItem {
  id: string
  version: string
  status: string
  released_at: string | null
  released_by: string | null
  released_by_email: string | null
  created_at: string
  created_by: string
  created_by_email: string
}

// ==========================================
// Action: Create New Version
// ==========================================

export async function createNewVersion(sourceDocumentId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get source document with full details
    const { data: sourceDoc, error: fetchError } = await supabase
      .from('documents')
      .select('*, document_type:document_types(name, prefix)')
      .eq('id', sourceDocumentId)
      .single()

    if (fetchError || !sourceDoc) {
      return { success: false, error: 'Source document not found' }
    }

    // Verify document is Released
    if (sourceDoc.status !== 'Released') {
      return { success: false, error: 'Can only create versions from Released documents' }
    }

    // Verify user has permission (is creator or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.is_admin || false
    const isCreator = sourceDoc.created_by === user.id

    if (!isCreator && !isAdmin) {
      return { success: false, error: 'You do not have permission to create a version of this document' }
    }

    // Calculate next version
    let nextVersion: string
    try {
      nextVersion = getNextVersion(sourceDoc.version, sourceDoc.is_production)
    } catch (error: any) {
      return { success: false, error: error.message }
    }

    // Check if next version already exists
    const { data: existingVersion } = await supabase
      .from('documents')
      .select('id')
      .eq('document_number', sourceDoc.document_number)
      .eq('version', nextVersion)
      .single()

    if (existingVersion) {
      return { success: false, error: `Version ${nextVersion} already exists` }
    }

    // Create new document record
    const { data: newDoc, error: createError } = await supabase
      .from('documents')
      .insert({
        document_number: sourceDoc.document_number,
        version: nextVersion,
        document_type_id: sourceDoc.document_type_id,
        title: sourceDoc.title,
        description: sourceDoc.description,
        project_code: sourceDoc.project_code,
        is_production: sourceDoc.is_production,
        status: 'Draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (createError || !newDoc) {
      console.error('Create new version error:', createError)
      return { success: false, error: 'Failed to create new version' }
    }

    // Create audit log entry
    await supabase.from('audit_log').insert({
      document_id: newDoc.id,
      action: 'version_created',
      performed_by: user.id,
      performed_by_email: user.email,
      details: {
        document_number: newDoc.document_number,
        version: nextVersion,
        previous_version: sourceDoc.version,
        source_document_id: sourceDocumentId,
      },
    })

    revalidatePath('/documents')
    revalidatePath(`/documents/${sourceDocumentId}`)

    return { 
      success: true, 
      documentId: newDoc.id,
      version: nextVersion,
    }
  } catch (error: any) {
    console.error('Create new version error:', error)
    return { success: false, error: error.message || 'Failed to create new version' }
  }
}

// ==========================================
// Action: Get Version History
// ==========================================

export async function getVersionHistory(documentNumber: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', data: [] }
    }

    // Get all versions of this document
    const { data: versions, error } = await supabase
      .from('documents')
      .select(`
        id,
        version,
        status,
        released_at,
        released_by,
        created_at,
        created_by,
        releaser:users!documents_released_by_fkey(email),
        creator:users!documents_created_by_fkey(email)
      `)
      .eq('document_number', documentNumber)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get version history error:', error)
      return { success: false, error: 'Failed to fetch version history', data: [] }
    }

    // Format the data
    const formattedVersions: VersionHistoryItem[] = (versions || []).map((v: any) => ({
      id: v.id,
      version: v.version,
      status: v.status,
      released_at: v.released_at,
      released_by: v.released_by,
      released_by_email: v.releaser?.email || null,
      created_at: v.created_at,
      created_by: v.created_by,
      created_by_email: v.creator?.email || null,
    }))

    return { success: true, data: formattedVersions }
  } catch (error: any) {
    console.error('Get version history error:', error)
    return { success: false, error: error.message || 'Failed to fetch version history', data: [] }
  }
}

// ==========================================
// Action: Get Latest Released Version
// ==========================================

export async function getLatestReleasedVersion(documentNumber: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', data: null }
    }

    // Get all Released versions, ordered by version
    const { data: versions, error } = await supabase
      .from('documents')
      .select('id, version, status, is_production')
      .eq('document_number', documentNumber)
      .eq('status', 'Released')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get latest released version error:', error)
      return { success: false, error: 'Failed to fetch latest version', data: null }
    }

    if (!versions || versions.length === 0) {
      return { success: true, data: null }
    }

    // Sort by version number to get the latest
    const sortedVersions = versions.sort((a, b) => {
      const parsedA = parseVersion(a.version)
      const parsedB = parseVersion(b.version)
      
      if (!parsedA || !parsedB) return 0
      
      return parsedB.number - parsedA.number
    })

    return { success: true, data: sortedVersions[0] }
  } catch (error: any) {
    console.error('Get latest released version error:', error)
    return { success: false, error: error.message || 'Failed to fetch latest version', data: null }
  }
}

// ==========================================
// Action: Get Immediate Predecessor
// ==========================================

export async function getImmediatePredecessor(documentNumber: string, currentVersion: string) {
  try {
    const supabase = await createClient()

    // Get all versions
    const { data: versions, error } = await supabase
      .from('documents')
      .select('id, version, status, is_production, document_number')
      .eq('document_number', documentNumber)
      .order('created_at', { ascending: true })

    if (error || !versions) {
      return { success: false, error: 'Failed to fetch versions', data: null }
    }

    // Parse current version
    const currentParsed = parseVersion(currentVersion)
    if (!currentParsed) {
      return { success: false, error: 'Invalid version format', data: null }
    }

    // Find the immediate predecessor (version number one less than current)
    const predecessor = versions.find(v => {
      const parsed = parseVersion(v.version)
      if (!parsed || parsed.type !== currentParsed.type) return false
      return parsed.number === currentParsed.number - 1
    })

    return { success: true, data: predecessor || null }
  } catch (error: any) {
    console.error('Get immediate predecessor error:', error)
    return { success: false, error: error.message, data: null }
  }
}
