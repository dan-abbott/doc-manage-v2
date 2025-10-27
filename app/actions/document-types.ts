'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type DocumentType = {
  id: string;
  name: string;
  prefix: string;
  description: string | null;
  is_active: boolean;
  next_number: number;
  created_at: string;
  updated_at: string;
};

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
};

/**
 * Get all document types (for list page and dropdowns)
 */
export async function getDocumentTypes(activeOnly = false): Promise<ActionResult<DocumentType[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('document_types')
      .select('*')
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to load document types',
        },
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('Error in getDocumentTypes:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Get a single document type by ID
 */
export async function getDocumentType(id: string): Promise<ActionResult<DocumentType>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document type not found',
        },
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error in getDocumentType:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Check if user is admin
 */
async function checkAdminAccess(): Promise<ActionResult> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      },
    };
  }

  const { data: userData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Admin access required',
      },
    };
  }

  return { success: true };
}

/**
 * Validate document type input
 */
function validateDocumentTypeInput(data: {
  name: string;
  prefix: string;
  description?: string;
}): ActionResult {
  if (!data.name || data.name.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Name is required',
        field: 'name',
      },
    };
  }

  if (data.name.length > 100) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Name must be 100 characters or less',
        field: 'name',
      },
    };
  }

  if (!data.prefix || data.prefix.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Prefix is required',
        field: 'prefix',
      },
    };
  }

  // Prefix must be uppercase letters only, 2-10 chars
  const prefixRegex = /^[A-Z]{2,10}$/;
  if (!prefixRegex.test(data.prefix)) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Prefix must be 2-10 uppercase letters (A-Z)',
        field: 'prefix',
      },
    };
  }

  if (data.description && data.description.length > 500) {
    return {
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Description must be 500 characters or less',
        field: 'description',
      },
    };
  }

  return { success: true };
}

/**
 * Create a new document type
 */
export async function createDocumentType(data: {
  name: string;
  prefix: string;
  description?: string;
}): Promise<ActionResult<DocumentType>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck as ActionResult<DocumentType>;
    }

    // Validate input
    const validation = validateDocumentTypeInput(data);
    if (!validation.success) {
      return validation as ActionResult<DocumentType>;
    }

    const supabase = await createClient();

    // Check if prefix already exists
    const { data: existingType } = await supabase
      .from('document_types')
      .select('id')
      .eq('prefix', data.prefix.toUpperCase())
      .single();

    if (existingType) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_PREFIX',
          message: 'A document type with this prefix already exists',
          field: 'prefix',
        },
      };
    }

    // Insert document type
    const { data: newType, error } = await supabase
      .from('document_types')
      .insert({
        name: data.name.trim(),
        prefix: data.prefix.toUpperCase(),
        description: data.description?.trim() || null,
        is_active: true,
        next_number: 1,
      })
      .select()
      .single();

    if (error || !newType) {
      console.error('Error creating document type:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to create document type',
        },
      };
    }

    revalidatePath('/dashboard/document-types');
    return {
      success: true,
      data: newType,
    };
  } catch (error) {
    console.error('Error in createDocumentType:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Update a document type
 */
export async function updateDocumentType(
  id: string,
  data: {
    name: string;
    prefix: string;
    description?: string;
  }
): Promise<ActionResult<DocumentType>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck as ActionResult<DocumentType>;
    }

    // Validate input
    const validation = validateDocumentTypeInput(data);
    if (!validation.success) {
      return validation as ActionResult<DocumentType>;
    }

    const supabase = await createClient();

    // Get current document type
    const { data: currentType } = await supabase
      .from('document_types')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentType) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document type not found',
        },
      };
    }

    // Check if prefix is changing
    const prefixChanged = currentType.prefix !== data.prefix.toUpperCase();

    if (prefixChanged) {
      // Check if any documents exist with this document type
      // Note: This check will be more complete when documents table exists in Phase 3
      // For now, we'll allow prefix changes since no documents exist yet
      
      // Future: Add this check when documents table exists
      // const { count } = await supabase
      //   .from('documents')
      //   .select('id', { count: 'exact', head: true })
      //   .eq('document_type_id', id);
      // 
      // if (count && count > 0) {
      //   return {
      //     success: false,
      //     error: {
      //       code: 'PREFIX_CHANGE_NOT_ALLOWED',
      //       message: `Cannot change prefix - ${count} document(s) exist with this type`,
      //       field: 'prefix',
      //     },
      //   };
      // }

      // Check if new prefix already exists
      const { data: existingType } = await supabase
        .from('document_types')
        .select('id')
        .eq('prefix', data.prefix.toUpperCase())
        .neq('id', id)
        .single();

      if (existingType) {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_PREFIX',
            message: 'A document type with this prefix already exists',
            field: 'prefix',
          },
        };
      }
    }

    // Update document type
    const { data: updatedType, error } = await supabase
      .from('document_types')
      .update({
        name: data.name.trim(),
        prefix: data.prefix.toUpperCase(),
        description: data.description?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedType) {
      console.error('Error updating document type:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update document type',
        },
      };
    }

    revalidatePath('/dashboard/document-types');
    return {
      success: true,
      data: updatedType,
    };
  } catch (error) {
    console.error('Error in updateDocumentType:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Toggle document type active status
 */
export async function toggleDocumentTypeStatus(id: string): Promise<ActionResult<DocumentType>> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck as ActionResult<DocumentType>;
    }

    const supabase = await createClient();

    // Get current status
    const { data: currentType } = await supabase
      .from('document_types')
      .select('is_active')
      .eq('id', id)
      .single();

    if (!currentType) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Document type not found',
        },
      };
    }

    // Toggle status
    const { data: updatedType, error } = await supabase
      .from('document_types')
      .update({ is_active: !currentType.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedType) {
      console.error('Error toggling document type status:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to update status',
        },
      };
    }

    revalidatePath('/dashboard/document-types');
    return {
      success: true,
      data: updatedType,
    };
  } catch (error) {
    console.error('Error in toggleDocumentTypeStatus:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Delete a document type
 */
export async function deleteDocumentType(id: string): Promise<ActionResult> {
  try {
    // Check admin access
    const accessCheck = await checkAdminAccess();
    if (!accessCheck.success) {
      return accessCheck;
    }

    const supabase = await createClient();

    // Check if any documents exist with this document type
    // Note: This check will be implemented when documents table exists in Phase 3
    // For now, we'll allow deletion since no documents exist yet
    
    // Future: Add this check when documents table exists
    // const { count } = await supabase
    //   .from('documents')
    //   .select('id', { count: 'exact', head: true })
    //   .eq('document_type_id', id);
    // 
    // if (count && count > 0) {
    //   return {
    //     success: false,
    //     error: {
    //       code: 'DELETE_NOT_ALLOWED',
    //       message: `Cannot delete - ${count} document(s) exist with this type. Deactivate instead.`,
    //     },
    //   };
    // }

    // Delete document type
    const { error } = await supabase
      .from('document_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document type:', error);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to delete document type',
        },
      };
    }

    revalidatePath('/dashboard/document-types');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteDocumentType:', error);
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
