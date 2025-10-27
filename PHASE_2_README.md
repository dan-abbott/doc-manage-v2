# Phase 2: Document Types Configuration

## What's New

Phase 2 adds **admin-only document type management** - the foundation for document numbering. Admins can configure document types (like "Form", "Procedure", "Work Instruction") with unique prefixes that determine how documents are numbered.

### Why This Matters

Before users can create documents, we need to define what types of documents exist. Each type has a prefix (e.g., "FORM") that's used to generate document numbers like "FORM-00001vA".

## Files Added/Modified

### Database
- `supabase/migrations/002_document_types.sql` - Document types table, RLS policies, seed data

### Server Actions
- `app/actions/document-types.ts` - CRUD operations with admin checks and validation

### UI Components
- `app/(dashboard)/dashboard/document-types/page.tsx` - List page with table
- `app/(dashboard)/dashboard/document-types/new/page.tsx` - Create new type
- `app/(dashboard)/dashboard/document-types/[id]/edit/page.tsx` - Edit existing type
- `components/document-types/DocumentTypesTable.tsx` - Table with actions (client component)
- `components/document-types/DocumentTypeForm.tsx` - Reusable form (client component)
- `components/dashboard/Navigation.tsx` - Updated with Document Types link (admin only)

## Installation

### 1. Run Database Migration

In your Supabase SQL Editor, run:

```sql
-- Copy and paste the contents of supabase/migrations/002_document_types.sql
```

This creates:
- `document_types` table
- RLS policies (admin-only for create/update/delete)
- Three default types: Form, Procedure, Work Instruction

### 2. Copy New Files

Copy all files from this phase into your project:

```bash
# Copy migration
cp supabase/migrations/002_document_types.sql YOUR_PROJECT/supabase/migrations/

# Copy actions
cp app/actions/document-types.ts YOUR_PROJECT/app/actions/

# Copy pages
cp -r app/(dashboard)/dashboard/document-types YOUR_PROJECT/app/(dashboard)/dashboard/

# Copy components
cp -r components/document-types YOUR_PROJECT/components/
cp components/dashboard/Navigation.tsx YOUR_PROJECT/components/dashboard/
```

### 3. Verify Navigation

The navigation now shows "Document Types" link for admin users only. Non-admin users won't see this link.

## Features

### Document Type Configuration
- **Create** new document types with unique prefixes
- **Edit** existing types (name, description)
- **Toggle** active/inactive status
- **Delete** types (only if no documents exist)

### Validation
- Prefix must be 2-10 uppercase letters
- Prefix must be unique
- Name required, max 100 chars
- Description optional, max 500 chars

### Business Rules
- **Prefix uniqueness** - Can't have two types with same prefix
- **Prefix immutability** - Can't change prefix once documents exist (Phase 3+)
- **Deletion protection** - Can't delete types with existing documents (Phase 3+)
- **Deactivation** - Can deactivate types at any time (hides from dropdown)

### Access Control
- Only admin users can access `/dashboard/document-types`
- Non-admins redirected to dashboard
- RLS policies enforce admin-only modifications

## Testing Phase 2

### Admin Access ✅
- [ ] Sign in as admin user (first user)
- [ ] Navigate to "Document Types" in navigation
- [ ] Verify link is visible
- [ ] Access document types page successfully

### Non-Admin Access ✅
- [ ] Sign in as non-admin user (create second account)
- [ ] Verify "Document Types" link NOT in navigation
- [ ] Try accessing `/dashboard/document-types` directly
- [ ] Verify redirect to dashboard

### Create Document Type ✅
- [ ] Click "Add Document Type"
- [ ] Enter name: "Quality Record"
- [ ] Enter prefix: "QR"
- [ ] Enter description: "Quality assurance records"
- [ ] See document number preview: "QR-00001vA"
- [ ] Submit form
- [ ] Verify redirect to list page
- [ ] Verify new type appears in table

### Validation ✅
- [ ] Try creating type with empty name → See error
- [ ] Try creating type with empty prefix → See error
- [ ] Try creating type with lowercase prefix → Auto-converts to uppercase
- [ ] Try creating type with prefix "A" (too short) → See error
- [ ] Try creating type with prefix "ABCDEFGHIJK" (too long) → See error
- [ ] Try creating type with prefix "FORM" (duplicate) → See error
- [ ] Try creating type with prefix "F0RM" (numbers) → See error

### Edit Document Type ✅
- [ ] Click "Edit" on existing type
- [ ] Change name → Save successfully
- [ ] Change description → Save successfully
- [ ] Try changing prefix to existing prefix → See error
- [ ] Cancel and verify no changes saved

### Toggle Status ✅
- [ ] Click "Deactivate" on active type
- [ ] Verify status badge changes to "Inactive"
- [ ] Verify page refreshes automatically
- [ ] Click "Activate" on inactive type
- [ ] Verify status badge changes to "Active"

### Delete Document Type ✅
- [ ] Click "Delete" on a type
- [ ] See confirmation modal
- [ ] Click "Cancel" → Modal closes, no deletion
- [ ] Click "Delete" again
- [ ] Click "Delete" in modal → Type deleted
- [ ] Verify type removed from list
- [ ] Verify page refreshes automatically

### Database Verification ✅
In Supabase SQL Editor:

```sql
-- Verify document types table
SELECT * FROM document_types ORDER BY name;

-- Verify RLS policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'document_types';

-- Test admin query (should work)
SELECT * FROM document_types WHERE is_active = true;
```

### Seed Data ✅
- [ ] Verify three default types exist: Form, Procedure, Work Instruction
- [ ] Verify all have `is_active = true`
- [ ] Verify `next_number = 1` for all

## Common Issues

### "Document Types" Link Not Showing
- Verify you're signed in as admin (first user)
- Check `users` table: `SELECT * FROM users;` - first user should have `is_admin = true`
- Clear browser cache and refresh

### Can't Create Document Type
- Check browser console for errors
- Verify RLS policies are active: `SELECT * FROM pg_policies WHERE tablename = 'document_types';`
- Ensure you're signed in as admin

### Prefix Validation Not Working
- Validation happens both client-side (HTML pattern) and server-side
- Check browser console for validation errors
- Ensure prefix is uppercase letters only

## What's Next: Phase 3

Phase 3 will implement **Basic Document Creation**:
- Create documents with auto-generated numbers (PREFIX-00001vA)
- Attach files to documents
- Simple release workflow (Prototype, no approvals)
- Document list with search and filters

**Note:** Prefix change prevention and deletion protection will be fully enforced in Phase 3 when documents exist.

## Success Criteria

Phase 2 is complete when:
- ✅ Admin can create document types
- ✅ Admin can edit document types
- ✅ Admin can toggle active/inactive
- ✅ Admin can delete document types
- ✅ Non-admin cannot access document types page
- ✅ Prefix validation works (unique, uppercase, 2-10 chars)
- ✅ Default types (Form, Procedure, WI) exist
- ✅ Navigation shows "Document Types" for admin only
- ✅ All 25+ tests pass

---

**Phase 2 Complete!** ✅ System ready for document creation in Phase 3.
