-- =========================================
-- Phase 3: Documents Table
-- =========================================

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id UUID NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  document_number TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  is_production BOOLEAN NOT NULL DEFAULT false,
  project_code TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  
  -- Constraints
  CONSTRAINT unique_document_version UNIQUE (document_number, version),
  CONSTRAINT valid_status CHECK (status IN ('Draft', 'In Approval', 'Released', 'Obsolete')),
  CONSTRAINT valid_project_code CHECK (project_code IS NULL OR project_code ~ '^P-\d{5}$'),
  
  -- Indexes for common queries
  CONSTRAINT fk_document_type FOREIGN KEY (document_type_id) REFERENCES public.document_types(id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_released_by FOREIGN KEY (released_by) REFERENCES public.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_document_type_id ON public.documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_project_code ON public.documents(project_code);
CREATE INDEX IF NOT EXISTS idx_documents_document_number ON public.documents(document_number);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at DESC);

-- Create unique index for document_number + version
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_number_version ON public.documents(document_number, version);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- =========================================
-- Row Level Security Policies
-- =========================================

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT documents they created OR documents that are Released
CREATE POLICY "Users can view own drafts and all released documents"
  ON public.documents
  FOR SELECT
  USING (
    auth.uid() = created_by 
    OR status = 'Released'
    OR status = 'Obsolete'
  );

-- Policy: Authenticated users can INSERT documents
CREATE POLICY "Authenticated users can create documents"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- Policy: Users can UPDATE documents they created if status is Draft
CREATE POLICY "Users can update own draft documents"
  ON public.documents
  FOR UPDATE
  USING (
    auth.uid() = created_by 
    AND status = 'Draft'
  )
  WITH CHECK (
    auth.uid() = created_by
  );

-- Policy: Users can DELETE documents they created if status is Draft
CREATE POLICY "Users can delete own draft documents"
  ON public.documents
  FOR DELETE
  USING (
    auth.uid() = created_by 
    AND status = 'Draft'
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

-- Add comment
COMMENT ON TABLE public.documents IS 'Main documents table storing document metadata and lifecycle information';
