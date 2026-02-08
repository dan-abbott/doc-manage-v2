import Link from 'next/link'
import { ArrowLeft, CheckCircle, FileText, Users, Upload, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Quick Start Guide | BaselineDocs',
  description: 'Get started with BaselineDocs in 5 minutes'
}

export default function QuickStartPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
            Quick Start Guide
          </h1>
          <p className="text-xl text-gray-600">
            Get up and running with BaselineDocs in just 5 minutes
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-6 mb-12">
          
          {/* Step 1 */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Sign In</CardTitle>
                  <p className="text-gray-600 mb-4">
                    Access your organization's BaselineDocs instance using your Google account. Your admin will provide you with the link to your organization's subdomain.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Your URL format:</strong> https://your-company.baselinedocs.com
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Step 2 */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">
                    <FileText className="inline h-5 w-5 mr-2" />
                    Create Your First Document
                  </CardTitle>
                  <p className="text-gray-600 mb-4">
                    Click "All Documents" in the navigation, then "New Document" to get started.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Choose a document type</p>
                        <p className="text-sm text-gray-600">Select from your organization's document types (Forms, Procedures, Work Instructions, etc.)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Add title and description</p>
                        <p className="text-sm text-gray-600">Give your document a clear, descriptive title</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">Upload files (optional)</p>
                        <p className="text-sm text-gray-600">Attach PDFs, Word docs, images, or other files</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Step 3 */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">
                    <Users className="inline h-5 w-5 mr-2" />
                    Assign Approvers (if needed)
                  </CardTitle>
                  <p className="text-gray-600 mb-4">
                    For documents that require review, select one or more approvers from your team.
                  </p>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-900">
                      <strong>Tip:</strong> Prototype documents can be released without approvers. Production documents should always have at least one approver.
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Step 4 */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">
                    <Send className="inline h-5 w-5 mr-2" />
                    Submit for Approval or Release
                  </CardTitle>
                  <p className="text-gray-600 mb-4">
                    Once your document is ready:
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-100 rounded-lg p-4">
                      <p className="font-medium text-gray-900 mb-1">With Approvers</p>
                      <p className="text-sm text-gray-600">Click "Submit for Approval" - your approvers will be notified and can review the document</p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <p className="font-medium text-gray-900 mb-1">Without Approvers (Prototype only)</p>
                      <p className="text-sm text-gray-600">Click "Release" to immediately make the document active</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Step 5 */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                  ✓
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">You're All Set!</CardTitle>
                  <p className="text-gray-600 mb-4">
                    Your document is now in the system. You can:
                  </p>
                  
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-gray-700">Track its status from your Dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-gray-700">Create new versions when updates are needed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-gray-700">Promote Prototype documents to Production when ready</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span className="text-gray-700">View the complete audit trail of all changes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Next Steps */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">What's Next?</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/help/documentation">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Read Full Documentation
                </Button>
              </Link>
              <Link href="/help/contact">
                <Button variant="outline" className="w-full justify-start">
                  <Send className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
