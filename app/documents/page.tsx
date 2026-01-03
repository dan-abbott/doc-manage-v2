"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Download,
  Loader2,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getDocuments,
  getDocumentTypes,
  getDocumentFiles,
  getDocumentAuditHistory,
  getCurrentUser,
  getDocumentVersions,
  getFileDownloadUrl,
} from "./documents-actions";

// Types
type DocumentStatus = "Draft" | "In Approval" | "Released" | "Obsolete";

type DocumentType = {
  id: string;
  name: string;
  prefix: string;
};

type Document = {
  id: string;
  document_number: string;
  version: string;
  title: string;
  description: string;
  status: DocumentStatus;
  is_production: boolean;
  project_code: string | null;
  document_type: DocumentType;
  created_by: string;
  created_by_user: { email: string; full_name: string };
  created_at: string;
  updated_at: string;
  released_at: string | null;
  released_by: string | null;
};

type DocumentFile = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by_user: { email: string; full_name: string };
};

type AuditEntry = {
  id: string;
  action: string;
  performed_by_email: string;
  created_at: string;
  details: any;
};

type VersionInfo = {
  id: string;
  version: string;
  status: DocumentStatus;
  released_at: string | null;
  released_by_user: { email: string; full_name: string } | null;
  created_at: string;
};

export default function DocumentsPage() {
  const router = useRouter();

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data State
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionInfo[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showOnlyMyDocs, setShowOnlyMyDocs] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Loading States
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload documents when filters change
  useEffect(() => {
    if (!loading) {
      loadDocuments();
    }
  }, [searchQuery, selectedType, selectedStatus, showOnlyMyDocs]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const userResult = await getCurrentUser();
      if (!userResult.success) {
        throw new Error("Failed to get current user");
      }
      setCurrentUserId(userResult.data.id);

      // Get document types
      const typesResult = await getDocumentTypes();
      if (!typesResult.success) {
        throw new Error("Failed to load document types");
      }
      setDocumentTypes(typesResult.data || []);

      // Get documents
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || "Failed to load data");
      console.error("Error loading initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const filters = {
        search: searchQuery.trim() || undefined,
        typeId: selectedType !== "all" ? selectedType : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        userId: showOnlyMyDocs ? currentUserId : undefined,
      };

      const result = await getDocuments(filters);
      if (!result.success) {
        throw new Error(result.error);
      }

      setDocuments(result.data || []);
    } catch (err: any) {
      console.error("Error loading documents:", err);
      // Don't show error toast for filter changes, just log it
    }
  };

  const handleDocumentSelect = async (doc: Document) => {
    setSelectedDocument(doc);
    setLoadingDocument(true);

    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }

    try {
      // Load document details in parallel
      const [filesResult, auditResult, versionsResult] = await Promise.all([
        getDocumentFiles(doc.id),
        getDocumentAuditHistory(doc.id),
        getDocumentVersions(doc.document_number),
      ]);

      if (filesResult.success) {
        setDocumentFiles(filesResult.data || []);
      }

      if (auditResult.success) {
        setAuditHistory(auditResult.data || []);
      }

      if (versionsResult.success) {
        setVersionHistory(versionsResult.data || []);
      }
    } catch (err: any) {
      console.error("Error loading document details:", err);
    } finally {
      setLoadingDocument(false);
    }
  };

  const handleFileDownload = async (file: DocumentFile) => {
    try {
      setDownloadingFile(file.id);

      const result = await getFileDownloadUrl(file.file_path);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Trigger download
      window.open(result.url, "_blank");
    } catch (err: any) {
      console.error("Error downloading file:", err);
      alert("Failed to download file");
    } finally {
      setDownloadingFile(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }

      // Focus search with Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("document-search")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const getStatusBadgeClass = (status: DocumentStatus) => {
    switch (status) {
      case "Draft":
        return "bg-gray-200 text-gray-700";
      case "In Approval":
        return "bg-yellow-200 text-yellow-800";
      case "Released":
        return "bg-green-200 text-green-800";
      case "Obsolete":
        return "bg-gray-400 text-gray-800";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Documents</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? "w-80" : "w-0"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          transition-all duration-300 ease-in-out overflow-hidden
          bg-white border-r border-gray-200 flex flex-col
          fixed lg:relative h-full z-50 lg:z-0
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded lg:block hidden"
                title="Close sidebar (Ctrl+B)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 hover:bg-gray-100 rounded lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="document-search"
              type="text"
              placeholder="Search documents... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 space-y-4 border-b border-gray-200">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              {documentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="In Approval">In Approval</option>
              <option value="Released">Released</option>
              <option value="Obsolete">Obsolete</option>
            </select>
          </div>

          {/* My Documents Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="myDocs"
              checked={showOnlyMyDocs}
              onChange={(e) => setShowOnlyMyDocs(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="myDocs" className="ml-2 text-sm text-gray-700">
              Show only my documents
            </label>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {documents.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No documents found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    handleDocumentSelect(doc);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full p-4 text-left hover:bg-gray-50 transition-colors
                    ${
                      selectedDocument?.id === doc.id
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : ""
                    }
                  `}
                >
                  <div className="font-medium text-gray-900 text-sm mb-1">
                    {doc.document_number}
                    {doc.version}
                  </div>
                  <div className="text-sm text-gray-600 mb-2 line-clamp-2">{doc.title}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeClass(
                        doc.status
                      )}`}
                    >
                      {doc.status}
                    </span>
                    <span className="text-xs text-gray-500">{doc.document_type.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop sidebar toggle */}
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
                  title="Show filters (Ctrl+B)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Documents</h1>
              <span className="text-xs lg:text-sm text-gray-500">
                ({documents.length} {documents.length === 1 ? "document" : "documents"})
              </span>
            </div>
            <Link
              href="/documents/new"
              className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Document</span>
            </Link>
          </div>
        </header>

        {/* Split Pane Content */}
        {selectedDocument ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Document Preview */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-white lg:border-r border-gray-200">
              {loadingDocument ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Document Header */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                        {selectedDocument.document_number}
                        {selectedDocument.version}
                      </h2>
                      <span
                        className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusBadgeClass(
                          selectedDocument.status
                        )}`}
                      >
                        {selectedDocument.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-4 text-sm text-gray-600 flex-wrap">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {selectedDocument.document_type.name}
                      </span>
                      {selectedDocument.project_code && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {selectedDocument.project_code}
                        </span>
                      )}
                      <span
                        className={
                          selectedDocument.is_production ? "text-blue-600 font-medium" : ""
                        }
                      >
                        {selectedDocument.is_production ? "Production" : "Prototype"}
                      </span>
                    </div>
                  </div>

                  {/* Document Information */}
                  <div className="mb-6">
                    <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2">
                      {selectedDocument.title}
                    </h3>
                    {selectedDocument.description && (
                      <p className="text-gray-700 leading-relaxed text-sm lg:text-base">
                        {selectedDocument.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Created By</div>
                      <div className="text-sm text-gray-900">
                        {selectedDocument.created_by_user?.full_name ||
                          selectedDocument.created_by_user?.email ||
                          "Unknown"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Created Date</div>
                      <div className="text-sm text-gray-900">
                        {new Date(selectedDocument.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                      <div className="text-sm text-gray-900">
                        {new Date(selectedDocument.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    {selectedDocument.released_at && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Released Date</div>
                        <div className="text-sm text-gray-900">
                          {new Date(selectedDocument.released_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attached Files */}
                  <div className="mb-6">
                    <h4 className="text-base lg:text-lg font-semibold text-gray-900 mb-3">
                      Attached Files
                    </h4>
                    {documentFiles.length === 0 ? (
                      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
                        No files attached
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documentFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {file.file_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatFileSize(file.file_size)} • Uploaded{" "}
                                  {new Date(file.uploaded_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleFileDownload(file)}
                              disabled={downloadingFile === file.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0 disabled:opacity-50"
                            >
                              {downloadingFile === file.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Actions & Audit */}
            <aside className="w-full lg:w-96 overflow-y-auto p-4 lg:p-6 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200">
              {/* Actions Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  Actions
                </h4>
                <div className="space-y-2">
                  {selectedDocument.status === "Draft" && (
                    <>
                      <Link
                        href={`/documents/${selectedDocument.id}/edit`}
                        className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                      >
                        Edit Document
                      </Link>
                      <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                        Submit for Approval
                      </button>
                      <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                        Delete Document
                      </button>
                    </>
                  )}
                  {selectedDocument.status === "Released" && (
                    <>
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Create New Version
                      </button>
                      {!selectedDocument.is_production && (
                        <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                          Promote to Production
                        </button>
                      )}
                    </>
                  )}
                  {selectedDocument.status === "In Approval" && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      Document is pending approval
                    </div>
                  )}
                </div>
              </div>

              {/* Version History */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  Version History
                </h4>
                <div className="space-y-2">
                  {versionHistory.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-gray-200 text-center text-gray-500 text-xs">
                      No version history
                    </div>
                  ) : (
                    versionHistory.map((version) => (
                      <div
                        key={version.id}
                        className={`p-3 rounded-lg border ${
                          version.id === selectedDocument.id
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {version.version}
                          {version.id === selectedDocument.id && (
                            <span className="ml-2 text-xs text-blue-600">(Current)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {version.status}
                          {version.released_at &&
                            ` • ${new Date(version.released_at).toLocaleDateString()}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Audit History */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  Audit History
                </h4>
                <div className="space-y-2">
                  {auditHistory.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-gray-200 text-center text-gray-500 text-xs">
                      No audit history
                    </div>
                  ) : (
                    auditHistory.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="text-sm font-medium text-gray-900 capitalize">
                          {entry.action.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {entry.performed_by_email}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(entry.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Admin Functions */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                  Admin Functions
                </h4>
                <Link
                  href="/document-types"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  → Manage Document Types
                </Link>
              </div>
            </aside>
          </div>
        ) : (
          /* No Document Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
              <FileText className="w-12 lg:w-16 h-12 lg:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-2">
                No document selected
              </h3>
              <p className="text-sm text-gray-500">
                Select a document from the sidebar to view details
              </p>
              <button
                onClick={() => {
                  setSidebarOpen(true);
                  setMobileMenuOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:hidden"
              >
                Browse Documents
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
