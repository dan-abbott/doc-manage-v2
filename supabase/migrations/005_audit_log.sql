-- =========================================
-- Phase 3: Audit Log Table
-- =========================================

-- Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  performed_by_email TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_action CHECK (action IN (
    'created', 
    'updated', 
    'file_uploaded', 
    'file_deleted', 
    'submitted_for_approval', 
    'approved', 
    'rejected', 
    'released', 
    'promoted_to_production', 
    'version_created', 
    'document_obsoleted',
    'approver_added',
    'approver_removed'
  )),
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE,
  CONSTRAINT fk_performed_by FOREIGN KEY (performed_by) REFERENCES public.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_document_id ON public.audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON public.audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- Create index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_audit_log_recent ON public.audit_log(created_at DESC, document_id);

-- =========================================
-- Row Level Security Policies
-- =========================================

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT audit logs for documents they have access to
CREATE POLICY "Users can view audit logs for accessible documents"
  ON public.audit_log
  FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents
      -- RLS on documents table will filter this automatically
    )
  );

-- Policy: System can INSERT audit log entries (no direct user INSERT)
-- This policy allows authenticated users to insert, but in practice
-- only server-side code should be creating audit entries
CREATE POLICY "System can create audit log entries"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (
    auth.uid() = performed_by
  );

-- No UPDATE or DELETE policies - audit logs are immutable

-- Grant permissions
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

-- Add comment
COMMENT ON TABLE public.audit_log IS 'Immutable audit trail of all document activities';

-- =========================================
-- Helper Function: Log Audit Entry
-- =========================================

-- Function to create audit log entries (called from application)
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_document_id UUID,
  p_action TEXT,
  p_performed_by UUID,
  p_performed_by_email TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    document_id,
    action,
    performed_by,
    performed_by_email,
    details
  ) VALUES (
    p_document_id,
    p_action,
    p_performed_by,
    p_performed_by_email,
    p_details
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_audit_entry TO authenticated;

COMMENT ON FUNCTION log_audit_entry IS 'Helper function to create audit log entries with validation';
