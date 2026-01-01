/**
 * Zod validation schemas for all forms and inputs
 * Provides type-safe validation with automatic TypeScript inference
 */

import { z } from 'zod'

// ==========================================
// Reusable Schema Components
// ==========================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Project code validation (P-#####)
 */
export const projectCodeSchema = z
  .string()
  .regex(/^P-\d{5}$/, 'Project code must be in format P-##### (e.g., P-12345)')
  .optional()
  .nullable()
  .transform(val => val === '' ? null : val)

/**
 * Document status validation
 */
export const documentStatusSchema = z.enum([
  'Draft',
  'In Approval',
  'Released',
  'Obsolete',
])

/**
 * Approval status validation
 */
export const approvalStatusSchema = z.enum(['Pending', 'Approved', 'Rejected'])

/**
 * Document version validation
 */
export const versionSchema = z
  .string()
  .regex(/^v[A-Z]$|^v\d+$/, 'Version must be in format vA-vZ or v1-v999')

// ==========================================
// Document Type Schemas
// ==========================================

/**
 * Create document type validation
 */
export const createDocumentTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  
  prefix: z
    .string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(10, 'Prefix must be less than 10 characters')
    .regex(/^[A-Z]+$/, 'Prefix must contain only uppercase letters')
    .trim(),
  
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  is_active: z
    .boolean()
    .default(true),
})

/**
 * Update document type validation
 * Same as create, but all fields optional except those that shouldn't change
 */
export const updateDocumentTypeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  is_active: z
    .boolean()
    .optional(),
  
  // Prefix cannot be updated if documents exist
  // This is enforced at the business logic level
})

// Infer types from schemas
export type CreateDocumentTypeInput = z.infer<typeof createDocumentTypeSchema>
export type UpdateDocumentTypeInput = z.infer<typeof updateDocumentTypeSchema>

// ==========================================
// Document Schemas
// ==========================================

/**
 * Create document validation
 */
export const createDocumentSchema = z.object({
  document_type_id: uuidSchema,
  
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  is_production: z
    .boolean()
    .default(false),
  
  project_code: projectCodeSchema,
})

/**
 * Update document validation
 */
export const updateDocumentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  project_code: projectCodeSchema,
})

// Infer types
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>

// ==========================================
// Approval Schemas
// ==========================================

/**
 * Approve document validation
 */
export const approveDocumentSchema = z.object({
  document_id: uuidSchema,
  
  comments: z
    .string()
    .max(1000, 'Comments must be less than 1000 characters')
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
})

/**
 * Reject document validation
 */
export const rejectDocumentSchema = z.object({
  document_id: uuidSchema,
  
  comments: z
    .string()
    .min(1, 'Rejection reason is required')
    .max(1000, 'Comments must be less than 1000 characters')
    .trim(),
})

/**
 * Add approver validation
 */
export const addApproverSchema = z.object({
  document_id: uuidSchema,
  user_id: uuidSchema,
  user_email: z.string().email('Invalid email address'),
})

/**
 * Remove approver validation
 */
export const removeApproverSchema = z.object({
  document_id: uuidSchema,
  approver_id: uuidSchema,
})

// Infer types
export type ApproveDocumentInput = z.infer<typeof approveDocumentSchema>
export type RejectDocumentInput = z.infer<typeof rejectDocumentSchema>
export type AddApproverInput = z.infer<typeof addApproverSchema>
export type RemoveApproverInput = z.infer<typeof removeApproverSchema>

// ==========================================
// File Upload Schemas
// ==========================================

/**
 * File upload validation
 */
export const fileUploadSchema = z.object({
  file: z.custom<File>((val) => val instanceof File, 'Must be a file'),
  
  // File size validation (50MB max)
  size: z
    .number()
    .max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  
  // MIME type validation
  type: z
    .string()
    .refine(
      (type) => {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png',
          'image/jpeg',
          'text/plain',
          'text/csv',
        ]
        return allowedTypes.includes(type)
      },
      'File type not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT, CSV'
    ),
})

/**
 * Multiple file upload validation
 */
export const multipleFileUploadSchema = z
  .array(fileUploadSchema)
  .max(20, 'Cannot upload more than 20 files at once')

// Infer types
export type FileUploadInput = z.infer<typeof fileUploadSchema>

// ==========================================
// Version Schemas
// ==========================================

/**
 * Create new version validation
 */
export const createVersionSchema = z.object({
  source_document_id: uuidSchema,
})

/**
 * Promote to production validation
 */
export const promoteToProductionSchema = z.object({
  source_document_id: uuidSchema,
  approver_ids: z
    .array(uuidSchema)
    .min(1, 'At least one approver is required for production documents'),
})

// Infer types
export type CreateVersionInput = z.infer<typeof createVersionSchema>
export type PromoteToProductionInput = z.infer<typeof promoteToProductionSchema>

// ==========================================
// Search & Filter Schemas
// ==========================================

/**
 * Document search/filter validation
 */
export const documentSearchSchema = z.object({
  search: z
    .string()
    .max(200, 'Search query too long')
    .optional(),
  
  document_type_id: uuidSchema.optional(),
  
  status: documentStatusSchema.optional(),
  
  project_code: projectCodeSchema,
  
  created_by: uuidSchema.optional(),
  
  page: z
    .number()
    .int()
    .positive()
    .default(1),
  
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(50),
})

// Infer types
export type DocumentSearchInput = z.infer<typeof documentSearchSchema>

// ==========================================
// Admin Schemas
// ==========================================

/**
 * Update user admin status
 */
export const updateUserAdminSchema = z.object({
  user_id: uuidSchema,
  is_admin: z.boolean(),
})

/**
 * Force document status change (admin only)
 */
export const forceStatusChangeSchema = z.object({
  document_id: uuidSchema,
  new_status: documentStatusSchema,
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),
})

// Infer types
export type UpdateUserAdminInput = z.infer<typeof updateUserAdminSchema>
export type ForceStatusChangeInput = z.infer<typeof forceStatusChangeSchema>

/**
 * Document type schemas for admin operations
 */
export const documentTypeCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  prefix: z
    .string()
    .min(2, 'Prefix must be at least 2 characters')
    .max(10, 'Prefix must be at most 10 characters')
    .regex(/^[A-Z]+$/, 'Prefix must contain only uppercase letters'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  is_active: z.boolean().default(true),
})

export const documentTypeUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  is_active: z.boolean(),
})

export type DocumentTypeCreateInput = z.infer<typeof documentTypeCreateSchema>
export type DocumentTypeUpdateInput = z.infer<typeof documentTypeUpdateSchema>
