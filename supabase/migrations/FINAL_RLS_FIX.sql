-- =========================================
-- COMPLETE CLEANUP: Remove ALL recursive policies
-- Then rebuild with non-recursive versions
-- =========================================

-- =========================================
-- STEP 1: DROP ALL PROBLEMATIC POLICIES
-- =========================================

-- Drop OLD recursive policies on documents
DROP POLICY IF EXISTS "documents_select_tenant" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_tenant" ON public.documents;
DROP POLICY IF EXISTS "documents_update_tenant" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_tenant" ON public.documents;

-- Drop duplicate/conflicting policies on documents
DROP POLICY IF EXISTS "Users can create documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view documents with app-level tenant filtering" ON public.documents;
DROP POLICY IF EXISTS "Users can update own draft documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own draft documents" ON public.documents;

-- Drop ALL recursive policies on document_types
DROP POLICY IF EXISTS "Users can view document types" ON public.document_types;
DROP POLICY IF EXISTS "Users can view document types in their tenant" ON public.document_types;
DROP POLICY IF EXISTS "Admins can create document types in their tenant" ON public.document_types;
DROP POLICY IF EXISTS "Admins can update document types in their tenant" ON public.document_types;
DROP POLICY IF EXISTS "Admins can delete document types in their tenant" ON public.document_types;
DROP POLICY IF EXISTS "Admins can manage document types in their tenant" ON public.document_types;

-- Drop ALL recursive policies on approvers
DROP POLICY IF EXISTS "Users can view approvers in their tenant" ON public.approvers;
DROP POLICY IF EXISTS "Creators can manage approvers in their tenant" ON public.approvers;
DROP POLICY IF EXISTS "Approvers can update their status in their tenant" ON public.approvers;

-- =========================================
-- STEP 2: CREATE NON-RECURSIVE POLICIES
-- =========================================

-- =========================================
-- DOCUMENTS TABLE
-- =========================================

CREATE POLICY "documents_select"
  ON public.documents
  FOR SELECT
  USING (
    -- Own documents
    auth.uid() = created_by 
    -- OR released/obsolete (visible to all in tenant - app must filter)
    OR status IN ('Released', 'Obsolete', 'In Approval')
  );

CREATE POLICY "documents_insert"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "documents_update"
  ON public.documents
  FOR UPDATE
  USING (
    auth.uid() = created_by 
    AND status = 'Draft'
  )
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "documents_delete"
  ON public.documents
  FOR DELETE
  USING (
    auth.uid() = created_by 
    AND status = 'Draft'
  );

-- =========================================
-- DOCUMENT_TYPES TABLE
-- =========================================

CREATE POLICY "document_types_select"
  ON public.document_types
  FOR SELECT
  TO authenticated
  USING (true);  -- App must filter by tenant_id

CREATE POLICY "document_types_insert"
  ON public.document_types
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE is_admin = true
    )
  );

CREATE POLICY "document_types_update"
  ON public.document_types
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE is_admin = true
    )
  );

CREATE POLICY "document_types_delete"
  ON public.document_types
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE is_admin = true
    )
  );

-- =========================================
-- APPROVERS TABLE
-- =========================================

CREATE POLICY "approvers_select"
  ON public.approvers
  FOR SELECT
  USING (
    -- User is the approver
    user_id = auth.uid()
    -- OR user created the document
    OR EXISTS (
      SELECT 1 FROM public.documents 
      WHERE documents.id = approvers.document_id 
      AND documents.created_by = auth.uid()
    )
  );

CREATE POLICY "approvers_insert"
  ON public.approvers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE documents.id = approvers.document_id 
      AND documents.created_by = auth.uid()
    )
  );

CREATE POLICY "approvers_update"
  ON public.approvers
  FOR UPDATE
  USING (
    user_id = auth.uid()  -- Approvers can update their own status
  );

CREATE POLICY "approvers_delete"
  ON public.approvers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE documents.id = approvers.document_id 
      AND documents.created_by = auth.uid()
      AND documents.status = 'Draft'
    )
  );

-- =========================================
-- STEP 3: VERIFY NO RECURSION
-- =========================================

-- List all policies - none should query users.tenant_id
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
      WHEN qual LIKE '%users.tenant_id%' THEN '⚠️ RECURSIVE'
      WHEN with_check LIKE '%users.tenant_id%' THEN '⚠️ RECURSIVE'
      ELSE '✅ SAFE'
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('documents', 'document_types', 'approvers')
ORDER BY tablename, policyname;

-- All should show ✅ SAFE

COMMENT ON POLICY "documents_select" ON public.documents IS 
  'Basic access control. Application MUST filter by tenant_id for isolation.';

COMMENT ON POLICY "document_types_select" ON public.document_types IS 
  'Application MUST filter by tenant_id for tenant isolation.';

COMMENT ON POLICY "approvers_select" ON public.approvers IS 
  'Application MUST filter by tenant_id for tenant isolation.';
