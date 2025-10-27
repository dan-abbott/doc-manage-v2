-- =========================================
-- Phase 3: Document Files Table
-- =========================================

-- Create document_files table
CREATE TABLE IF NOT EXISTS public.document_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_file_size CHECK (file_size > 0),
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_files_document_id ON public.document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_document_files_uploaded_by ON public.document_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_files_uploaded_at ON public.document_files(uploaded_at DESC);

-- =========================================
-- Row Level Security Policies
-- =========================================

-- Enable RLS
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT files for documents they have access to
-- This uses a subquery to check document access through the documents table RLS
CREATE POLICY "Users can view files for accessible documents"
  ON public.document_files
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents
      -- RLS on documents table will filter this automatically
    )
  );

-- Policy: Authenticated users can INSERT files to documents they created
CREATE POLICY "Users can upload files to own documents"
  ON public.document_files
  FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE created_by = auth.uid()
    )
  );

-- Policy: Users can DELETE files from their own draft documents
CREATE POLICY "Users can delete files from own draft documents"
  ON public.document_files
  FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM public.documents 
      WHERE created_by = auth.uid() 
      AND status = 'Draft'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.document_files TO authenticated;

-- Add comment
COMMENT ON TABLE public.document_files IS 'File attachments for documents with metadata and storage paths';
