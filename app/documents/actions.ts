"use server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Fetch all documents with optional filters
 */
export async function getDocuments(filters?: {
  search?: string;
  typeId?: string;
  status?: string;
  userId?: string; // For "my documents" filter
}) {
  const supabase = createServerClient();

  let query = supabase
    .from("documents")
    .select(`
      *,
      document_type:document_types(id, name, prefix),
      created_by_user:users!created_by(email, full_name)
    `)
    .order("updated_at", { ascending: false });

  // Apply filters
  if (filters?.search) {
    query = query.or(
      `document_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`
    );
  }

  if (filters?.typeId && filters.typeId !== "all") {
    query = query.eq("document_type_id", filters.typeId);
  }

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.userId) {
    query = query.eq("created_by", filters.userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching documents:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Fetch document types for filter dropdown
 */
export async function getDocumentTypes() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("document_types")
    .select("id, name, prefix")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching document types:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Fetch files for a specific document
 */
export async function getDocumentFiles(documentId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("document_files")
    .select(`
      *,
      uploaded_by_user:users!uploaded_by(email, full_name)
    `)
    .eq("document_id", documentId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("Error fetching document files:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Fetch audit history for a specific document
 */
export async function getDocumentAuditHistory(documentId: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching audit history:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Get current user ID
 */
export async function getCurrentUser() {
  const supabase = createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false, error: "Not authenticated" };
  }

  return { success: true, data: { id: user.id, email: user.email } };
}

/**
 * Get document versions for version history
 */
export async function getDocumentVersions(documentNumber: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("documents")
    .select(`
      *,
      released_by_user:users!released_by(email, full_name)
    `)
    .eq("document_number", documentNumber)
    .order("version", { ascending: true });

  if (error) {
    console.error("Error fetching document versions:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Download file with signed URL
 */
export async function getFileDownloadUrl(filePath: string) {
  const supabase = createServerClient();

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (error) {
    console.error("Error generating download URL:", error);
    return { success: false, error: error.message };
  }

  return { success: true, url: data.signedUrl };
}
