import Link from 'next/link'
import { ArrowLeft, Book, FileText, GitBranch, CheckCircle, Users, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Documentation | BaselineDocs',
  description: 'Complete guide to using BaselineDocs'
}

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link 
          href="/help"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Help Center
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Documentation
          </h1>
          <p className="text-xl text-gray-600">
            Everything you need to know about using BaselineDocs
          </p>
        </div>

        {/* Table of Contents */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              <Book className="inline h-5 w-5 mr-2" />
              Table of Contents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <a href="#documents" className="text-blue-600 hover:text-blue-700">1. Document Management</a>
              <a href="#versioning" className="text-blue-600 hover:text-blue-700">2. Version Control</a>
              <a href="#approvals" className="text-blue-600 hover:text-blue-700">3. Approval Workflows</a>
              <a href="#lifecycle" className="text-blue-600 hover:text-blue-700">4. Document Lifecycle</a>
              <a href="#admin" className="text-blue-600 hover:text-blue-700">5. Admin Functions</a>
              <a href="#best-practices" className="text-blue-600 hover:text-blue-700">6. Best Practices</a>
            </div>
          </CardContent>
        </Card>

        {/* Content Sections */}
        <div className="space-y-8">
          
          {/* Document Management */}
          <Card id="documents">
            <CardHeader>
              <CardTitle className="text-2xl">
                <FileText className="inline h-6 w-6 mr-2" />
                1. Document Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Creating Documents</h3>
                <p className="text-gray-600 mb-2">To create a new document:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                  <li>Navigate to "All Documents" from the main menu</li>
                  <li>Click the "New Document" button</li>
                  <li>Select a document type from the dropdown</li>
                  <li>Choose Prototype or Production classification</li>
                  <li>Enter a title and description</li>
                  <li>Optionally attach files</li>
                  <li>Assign approvers if needed</li>
                  <li>Click "Create Document"</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Document Numbering</h3>
                <p className="text-gray-600 mb-2">
                  Documents are automatically numbered using the format: <code className="bg-gray-100 px-2 py-1 rounded">PREFIX-00001vA</code>
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li><strong>PREFIX:</strong> Defined by document type (e.g., FORM, PROC, WI)</li>
                  <li><strong>00001:</strong> Sequential number starting at 1</li>
                  <li><strong>vA:</strong> Version identifier (alphabetic for Prototype, numeric for Production)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Editing Documents</h3>
                <p className="text-gray-600">
                  Only Draft documents can be edited. Once a document is Released, you must create a new version to make changes.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Searching & Filtering</h3>
                <p className="text-gray-600 mb-2">Find documents quickly using:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li><strong>Search box:</strong> Search by document number or title</li>
                  <li><strong>Type filter:</strong> Filter by document type</li>
                  <li><strong>Status filter:</strong> View only Draft, In Approval, Released, or Obsolete documents</li>
                  <li><strong>Project filter:</strong> Filter by project code</li>
                  <li><strong>My Documents:</strong> View only documents you created</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Version Control */}
          <Card id="versioning">
            <CardHeader>
              <CardTitle className="text-2xl">
                <GitBranch className="inline h-6 w-6 mr-2" />
                2. Version Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Creating New Versions</h3>
                <p className="text-gray-600 mb-2">
                  When you need to update a Released document:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                  <li>Open the Released document</li>
                  <li>Click "Create New Version"</li>
                  <li>The new version starts as a Draft</li>
                  <li>Make your changes and submit for approval (if required)</li>
                  <li>Once released, the previous version becomes Obsolete</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Version Numbering</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <p className="font-medium text-gray-900">Prototype Documents</p>
                    <p className="text-sm text-gray-600">Use alphabetic versioning: vA → vB → vC → ... → vZ</p>
                    <p className="text-xs text-gray-500 mt-1">Example: FORM-00001vA, FORM-00001vB</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="font-medium text-gray-900">Production Documents</p>
                    <p className="text-sm text-gray-600">Use numeric versioning: v1 → v2 → v3 → ...</p>
                    <p className="text-xs text-gray-500 mt-1">Example: FORM-00001v1, FORM-00001v2</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Viewing Version History</h3>
                <p className="text-gray-600">
                  Each document displays its complete version history, showing all previous versions, their status, and who released them.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Approval Workflows */}
          <Card id="approvals">
            <CardHeader>
              <CardTitle className="text-2xl">
                <CheckCircle className="inline h-6 w-6 mr-2" />
                3. Approval Workflows
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Submitting for Approval</h3>
                <p className="text-gray-600 mb-2">
                  When your document is ready for review:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                  <li>Ensure all required fields are complete</li>
                  <li>Assign at least one approver</li>
                  <li>Click "Submit for Approval"</li>
                  <li>The document status changes to "In Approval"</li>
                  <li>Approvers are notified (if email notifications are enabled)</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Approving Documents</h3>
                <p className="text-gray-600 mb-2">
                  When you're assigned as an approver:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                  <li>Navigate to "Approvals" to see pending documents</li>
                  <li>Open the document to review</li>
                  <li>Review all content and attached files</li>
                  <li>Click "Approve" or "Reject"</li>
                  <li>Add comments if needed (required for rejections)</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Handling Rejections</h3>
                <p className="text-gray-600 mb-2">
                  If a document is rejected:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>The document returns to Draft status</li>
                  <li>The rejection reason is displayed prominently</li>
                  <li>The creator can edit and resubmit</li>
                  <li>All approvers must review again after resubmission</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Multi-Approver Requirements</h3>
                <p className="text-gray-600">
                  <strong>All</strong> assigned approvers must approve before a document is Released. If <strong>any</strong> approver rejects, the document returns to Draft.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Document Lifecycle */}
          <Card id="lifecycle">
            <CardHeader>
              <CardTitle className="text-2xl">4. Document Lifecycle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Document States</h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-20 h-8 bg-gray-500 text-white rounded-md flex items-center justify-center text-sm font-medium">
                      Draft
                    </div>
                    <p className="text-sm text-gray-700">Initial working state. Document can be edited, deleted, or submitted for approval.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-20 h-8 bg-yellow-500 text-white rounded-md flex items-center justify-center text-sm font-medium">
                      In Approval
                    </div>
                    <p className="text-sm text-gray-700">Document is under review. No edits allowed. Awaiting approver decisions.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-20 h-8 bg-green-600 text-white rounded-md flex items-center justify-center text-sm font-medium">
                      Released
                    </div>
                    <p className="text-sm text-gray-700">Approved and active. Available for use. Can create new versions.</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-20 h-8 bg-gray-600 text-white rounded-md flex items-center justify-center text-sm font-medium">
                      Obsolete
                    </div>
                    <p className="text-sm text-gray-700">Superseded by a newer version. Read-only, kept for historical reference.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Prototype vs Production</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">Prototype</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• For development and testing</li>
                      <li>• Alphabetic versioning (vA, vB, vC)</li>
                      <li>• Can be released without approvers</li>
                      <li>• Can be promoted to Production</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Production</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• For official, released documents</li>
                      <li>• Numeric versioning (v1, v2, v3)</li>
                      <li>• Requires approval workflow</li>
                      <li>• Subject to full audit trail</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Promoting to Production</h3>
                <p className="text-gray-600 mb-2">
                  When a Prototype document is ready for production use:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                  <li>Open the Released Prototype document</li>
                  <li>Click "Promote to Production"</li>
                  <li>The new Production document starts at v1 as a Draft</li>
                  <li>Assign approvers (required for Production)</li>
                  <li>Submit for approval</li>
                  <li>Once approved, it's released as v1</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Admin Functions */}
          <Card id="admin">
            <CardHeader>
              <CardTitle className="text-2xl">
                <Settings className="inline h-6 w-6 mr-2" />
                5. Admin Functions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Managing Document Types</h3>
                <p className="text-gray-600 mb-2">
                  Admins can configure document types from the Admin Panel:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Create new document types with custom prefixes</li>
                  <li>Set descriptions for each type</li>
                  <li>Activate or deactivate types</li>
                  <li>View sequential numbering status</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">User Management</h3>
                <p className="text-gray-600">
                  Control user access and permissions through the Admin Panel. Assign admin roles to trusted users.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Email Notifications</h3>
                <p className="text-gray-600">
                  Configure email notification settings to keep users informed of document activities and approval requests.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card id="best-practices">
            <CardHeader>
              <CardTitle className="text-2xl">6. Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Document Titles</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Use clear, descriptive titles that explain the document's purpose</li>
                  <li>Include key information like process names or equipment IDs</li>
                  <li>Keep titles concise but informative</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">File Attachments</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Use meaningful file names that describe the content</li>
                  <li>Keep file sizes reasonable (under 50MB per file)</li>
                  <li>Use PDF format for final documents to preserve formatting</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Approval Workflows</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Assign approvers who are familiar with the document content</li>
                  <li>Include at least one technical reviewer and one manager</li>
                  <li>Provide clear rejection reasons to help improve documents</li>
                  <li>Review documents promptly to avoid workflow delays</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Version Control</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Create new versions for all substantive changes</li>
                  <li>Use Prototype documents for development and testing</li>
                  <li>Promote to Production only when documents are finalized</li>
                  <li>Document your changes in the description field</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Organization</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Use project codes consistently across related documents</li>
                  <li>Bookmark frequently accessed documents</li>
                  <li>Review obsolete documents periodically for archival</li>
                  <li>Maintain clear document descriptions for searchability</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer CTA */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Still Have Questions?</h2>
            <p className="text-gray-600 mb-4">
              Our support team is here to help you get the most out of BaselineDocs.
            </p>
            <Link href="/help/contact">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Contact Support
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
