-- =========================================
-- Phase 3: Storage Bucket Configuration
-- =========================================

-- NOTE: This SQL creates the bucket, but you MUST also configure in Supabase Dashboard

-- Create the documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,  -- Public bucket (access controlled via RLS)
  52428800,  -- 50MB file size limit
  ARRAY[
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
)
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- Storage RLS Policies
-- =========================================

-- Policy: Users can SELECT (download) files for documents they have access to
CREATE POLICY "Users can download files for accessible documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      -- Extract document_id from path: documents/{document_id}/{filename}
      (string_to_array(name, '/'))[1] IN (
        SELECT id::text FROM public.documents
        WHERE auth.uid() = created_by 
        OR status IN ('Released', 'Obsolete')
      )
    )
  );

-- Policy: Users can INSERT (upload) files to documents they created
CREATE POLICY "Users can upload files to own documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT id::text FROM public.documents
        WHERE auth.uid() = created_by
      )
    )
  );

-- Policy: Users can DELETE files from their own draft documents
CREATE POLICY "Users can delete files from own draft documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (
      (string_to_array(name, '/'))[1] IN (
        SELECT id::text FROM public.documents
        WHERE auth.uid() = created_by 
        AND status = 'Draft'
      )
    )
  );

-- =========================================
-- IMPORTANT: Manual Configuration Required
-- =========================================

/*
AFTER RUNNING THIS MIGRATION, CONFIGURE IN SUPABASE DASHBOARD:

1. Go to Storage > documents bucket
2. Verify bucket settings:
   - Public bucket: Yes
   - File size limit: 50MB
   - Allowed MIME types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT, CSV

3. Test file upload/download with RLS policies

4. File storage structure:
   documents/
     └── {document-id}/
         ├── file1.pdf
         ├── file2.docx
         └── file3.xlsx

5. File naming convention:
   - Display name: FORM-00001vA_Original Filename.pdf
   - Storage path: documents/{document-uuid}/file1.pdf
   - Metadata stores both display name and original name
*/
