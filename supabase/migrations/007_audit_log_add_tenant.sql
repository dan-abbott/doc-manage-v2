-- =========================================
-- Add tenant_id to audit_log table for multi-tenancy
-- =========================================

-- Add tenant_id column
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill tenant_id from documents table for existing records
UPDATE public.audit_log
SET tenant_id = d.tenant_id
FROM public.documents d
WHERE public.audit_log.document_id = d.id
AND public.audit_log.tenant_id IS NULL;

-- Make tenant_id NOT NULL after backfill
ALTER TABLE public.audit_log 
ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON public.audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created ON public.audit_log(tenant_id, created_at DESC);

-- Update RLS policies to use tenant_id
DROP POLICY IF EXISTS "Users can view audit logs for accessible documents" ON public.audit_log;
DROP POLICY IF EXISTS "System can create audit log entries" ON public.audit_log;

-- Policy: Users can view audit logs for their tenant's documents
CREATE POLICY "Users can view audit logs for their tenant"
  ON public.audit_log
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create audit log entries for their tenant
CREATE POLICY "Users can create audit logs for their tenant"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (
    auth.uid() = performed_by
    AND tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Add additional action types for comprehensive audit trail
ALTER TABLE public.audit_log 
DROP CONSTRAINT IF EXISTS valid_action;

ALTER TABLE public.audit_log
ADD CONSTRAINT valid_action CHECK (action IN (
  'created',
  'updated', 
  'file_uploaded',
  'file_deleted',
  'file_scan_completed',
  'file_scan_failed',
  'submitted_for_approval',
  'approved',
  'rejected',
  'released',
  'promoted_to_production',
  'version_created',
  'document_obsoleted',
  'approver_added',
  'approver_removed',
  'approver_changed',
  'document_deleted',
  'owner_changed',
  'document_type_counter_reset',
  'settings_updated'
));

-- Update the helper function to include tenant_id
DROP FUNCTION IF EXISTS log_audit_entry(UUID, TEXT, UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION log_audit_entry(
  p_document_id UUID,
  p_action TEXT,
  p_performed_by UUID,
  p_performed_by_email TEXT,
  p_tenant_id UUID,
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
    tenant_id,
    details
  ) VALUES (
    p_document_id,
    p_action,
    p_performed_by,
    p_performed_by_email,
    p_tenant_id,
    p_details
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_audit_entry TO authenticated;

COMMENT ON FUNCTION log_audit_entry IS 'Helper function to create audit log entries with tenant isolation';
