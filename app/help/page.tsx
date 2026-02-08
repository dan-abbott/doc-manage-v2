import { Metadata } from 'next'
import Link from 'next/link'
import { 
  BookOpen, 
  FileText, 
  HelpCircle, 
  Video, 
  MessageCircle,
  Download,
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Help Center | BaselineDocs',
  description: 'Get help with BaselineDocs - guides, tutorials, and support resources'
}

const quickStartSteps = [
  {
    title: 'Sign In',
    description: 'Use your Google account to sign in to your organization\'s BaselineDocs instance'
  },
  {
    title: 'Create Your First Document',
    description: 'Click "New Document", select a type, add a title and description, and optionally upload files'
  },
  {
    title: 'Submit for Approval',
    description: 'Assign approvers to your document and submit it for review'
  },
  {
    title: 'Track & Manage',
    description: 'Monitor document status, create new versions, and manage your document library'
  }
]

const commonTasks = [
  {
    title: 'Creating Documents',
    items: [
      'Choose the right document type',
      'Understanding Prototype vs Production',
      'Uploading and managing files',
      'Assigning project codes'
    ]
  },
  {
    title: 'Approval Workflows',
    items: [
      'Assigning approvers to documents',
      'Reviewing documents as an approver',
      'Handling rejection feedback',
      'Tracking approval progress'
    ]
  },
  {
    title: 'Version Control',
    items: [
      'Creating new document versions',
      'Understanding version numbering (vA, vB vs v1, v2)',
      'Viewing version history',
      'Promoting Prototype to Production'
    ]
  },
  {
    title: 'Document Management',
    items: [
      'Searching and filtering documents',
      'Understanding document statuses',
      'Managing obsolete documents',
      'Using the audit trail'
    ]
  }
]

const faqItems = [
  {
    question: 'What does each document status mean?',
    answer: 'Draft (editable, gray badge) - document is being created or revised. In Approval (yellow badge) - awaiting approver reviews. Released (green badge) - approved and active. Obsolete (dark gray badge) - superseded by a newer version.'
  },
  {
    question: 'How is a document number assigned?',
    answer: 'Document numbers are automatically generated using the format PREFIX-00001vA, where PREFIX comes from the document type (e.g., FORM, PROC), followed by a 5-digit sequential number and version letter/number.'
  },
  {
    question: 'What\'s the difference between Prototype and Production?',
    answer: 'Prototype documents use alphabetic versioning (vA, vB, vC) and are for development/testing. Production documents use numeric versioning (v1, v2, v3) and represent formally released documents. You can promote a Prototype to Production when ready.'
  },
  {
    question: 'Can I edit a Released document?',
    answer: 'No, Released documents are read-only to maintain document integrity. To make changes, create a new version of the document, which will start as Draft and go through the approval process again.'
  },
  {
    question: 'What happens when I reject a document?',
    answer: 'When you reject a document, it returns to Draft status so the creator can revise it. Your rejection comment helps them understand what needs to be changed. They can then resubmit for approval.'
  },
  {
    question: 'Who can see my Draft documents?',
    answer: 'Only you (the creator) and system administrators can see your Draft documents. Once Released, documents become visible to all authenticated users in your organization.'
  },
  {
    question: 'How do I find a specific document?',
    answer: 'Use the search box on the Documents page to search by document number or title. You can also filter by document type, status, project code, or use the "My Documents" toggle to see only documents you created.'
  },
  {
    question: 'What is the audit trail?',
    answer: 'The audit trail tracks all actions on a document including creation, edits, file uploads, submissions, approvals, rejections, and releases. This provides a complete history for compliance and tracking purposes.'
  }
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Help Center
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about using BaselineDocs for document control and version management
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Quick Start Guide</CardTitle>
              <CardDescription>
                Get up and running in 5 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="p-0 text-blue-600">
                View guide <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Complete Documentation</CardTitle>
              <CardDescription>
                Detailed guide covering all features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="p-0 text-blue-600">
                Download PDF <Download className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Need help? We're here for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="p-0 text-blue-600">
                Get support <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Start Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to start managing documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {quickStartSteps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 mb-1">
                    Want a visual walkthrough?
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Restart the interactive product tour from your dashboard
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('baselinedocs_tour_completed')
                      window.location.href = '/dashboard'
                    }}
                  >
                    Restart Tour
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Tasks */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Common Tasks</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {commonTasks.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-blue-600" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Quick answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {faqItems.map((faq, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                  {index < faqItems.length - 1 && (
                    <div className="border-b border-gray-200 mt-6" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Still need help?
              </h2>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                Can't find what you're looking for? Our support team is ready to assist you with any questions or issues.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/dashboard">
                  <Button variant="outline" className="bg-white">
                    Back to Dashboard
                  </Button>
                </Link>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
