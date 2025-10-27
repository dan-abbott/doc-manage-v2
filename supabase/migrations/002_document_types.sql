-- =========================================
-- Phase 2: Document Types Table
-- =========================================

-- Create document_types table
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT prefix_format CHECK (prefix ~ '^[A-Z]{2,10}$'),
  CONSTRAINT next_number_positive CHECK (next_number > 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_document_types_is_active ON public.document_types(is_active);
CREATE INDEX IF NOT EXISTS idx_document_types_prefix ON public.document_types(prefix);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_document_types ON public.document_types;
CREATE TRIGGER set_updated_at_document_types
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- Row Level Security Policies
-- =========================================

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view document types
CREATE POLICY "All users can view document types"
  ON public.document_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert document types
-- Note: In MVP we check is_admin in Server Actions
-- Future: Add admin role check in RLS policy
CREATE POLICY "Admins can insert document types"
  ON public.document_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Only admins can update document types
CREATE POLICY "Admins can update document types"
  ON public.document_types
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Only admins can delete document types
CREATE POLICY "Admins can delete document types"
  ON public.document_types
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- =========================================
-- Seed Data (Optional - can be run separately)
-- =========================================

-- Insert default document types if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.document_types LIMIT 1) THEN
    INSERT INTO public.document_types (name, prefix, description, is_active, next_number)
    VALUES 
      ('Form', 'FORM', 'Standard forms and templates', true, 1),
      ('Procedure', 'PROC', 'Standard operating procedures', true, 1),
      ('Work Instruction', 'WI', 'Detailed work instructions', true, 1);
  END IF;
END $$;

-- =========================================
-- Comments
-- =========================================

COMMENT ON TABLE public.document_types IS 'Document type configuration for categorizing documents with unique prefixes';
COMMENT ON COLUMN public.document_types.prefix IS 'Unique uppercase prefix for document numbering (e.g., FORM, PROC)';
COMMENT ON COLUMN public.document_types.next_number IS 'Next available sequential number for this document type';
COMMENT ON COLUMN public.document_types.is_active IS 'Inactive types do not appear in document creation dropdown';
