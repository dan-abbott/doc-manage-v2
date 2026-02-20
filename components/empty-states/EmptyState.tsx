'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Search, Users, CheckCircle, Plus, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface EmptyStateProps {
  type: 'documents' | 'my-documents' | 'approvals' | 'search-results' | 'document-types'
  searchQuery?: string
}

export default function EmptyState({ type, searchQuery }: EmptyStateProps) {
  const states = {
    'documents': {
      icon: FileText,
      title: 'No documents yet',
      description: 'Get started by creating your first document. You can add files, assign approvers, and track versions all in one place.',
      action: {
        label: 'Create Your First Document',
        href: '/documents/new',
        icon: Plus
      },
      helpText: 'Documents will appear here once they\'re created'
    },
    'my-documents': {
      icon: FileText,
      title: 'You haven\'t created any documents yet',
      description: 'Create a document to get started. All documents you create will be listed here for easy access.',
      action: {
        label: 'Create Document',
        href: '/documents/new',
        icon: Plus
      },
      helpText: 'Tip: Use document types to organize your documents effectively'
    },
    'approvals': {
      icon: CheckCircle,
      title: 'No pending approvals',
      description: 'You\'re all caught up! There are no documents currently awaiting your review.',
      secondaryDescription: 'When documents are submitted for your approval, they\'ll appear here.',
      helpText: null
    },
    'search-results': {
      icon: Search,
      title: 'No documents found',
      description: searchQuery 
        ? `No documents match "${searchQuery}". Try adjusting your search terms or filters.`
        : 'No documents match your current filters. Try adjusting your search criteria.',
      tips: [
        'Check your spelling',
        'Try different keywords',
        'Use document numbers (e.g., FORM-00001)',
        'Remove some filters to broaden your search'
      ],
      action: {
        label: 'Clear All Filters',
        onClick: () => window.location.href = '/documents'
      },
      helpText: null
    },
    'document-types': {
      icon: Sparkles,
      title: 'No document types configured',
      description: 'Document types define the categories and numbering schemes for your documents (e.g., Forms, Procedures, Work Instructions).',
      tips: [
        'Each type has a unique prefix (e.g., FORM, PROC, WI)',
        'Documents are automatically numbered sequentially',
        'You can create multiple types for different needs'
      ],
      action: {
        label: 'Create Document Type',
        href: '/admin/document-types/new',
        icon: Plus
      },
      secondaryAction: {
        label: 'Create Standard Types',
        onClick: () => {
          toast.info('Quick setup coming soon!')
        },
        icon: Sparkles
      },
      helpText: 'Users cannot create documents until at least one type is configured'
    }
  }

  const state = states[type]
  const Icon = state.icon

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-2xl w-full border-2 border-dashed">
        <CardContent className="p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon className="h-8 w-8 text-gray-400" />
          </div>

          {/* Title */}
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            {state.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 mb-4 max-w-md mx-auto leading-relaxed">
            {state.description}
          </p>

          {'secondaryDescription' in state && state.secondaryDescription && (
            <p className="text-gray-500 mb-6 text-sm">
              {state.secondaryDescription}
            </p>
          )}

          {/* Tips (if any) */}
          {'tips' in state && state.tips && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
              <p className="font-medium text-gray-900 mb-2 text-sm">💡 Tips:</p>
              <ul className="space-y-1 text-sm text-gray-700">
                {state.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary Action */}
          {'action' in state && state.action && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              {'href' in state.action && state.action.href ? (
                <Link href={state.action.href}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    {('icon' in state.action && state.action.icon) ? 
                      React.createElement(state.action.icon as React.ComponentType<any>, { className: "mr-2 h-4 w-4" }) : null
                    }
                    {state.action.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : 'onClick' in state.action && state.action.onClick ? (
                <Button 
                  onClick={state.action.onClick}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {('icon' in state.action && state.action.icon) ? 
                    React.createElement(state.action.icon as React.ComponentType<any>, { className: "mr-2 h-4 w-4" }) : null
                  }
                  {state.action.label}
                </Button>
              ) : null}

              {/* Secondary Action */}
              {'secondaryAction' in state && state.secondaryAction && (
                <>
                  {'href' in state.secondaryAction && state.secondaryAction.href ? (
                    <Link href={state.secondaryAction.href}>
                      <Button variant="outline">
                        {('icon' in state.secondaryAction && state.secondaryAction.icon) ? 
                          React.createElement(state.secondaryAction.icon as React.ComponentType<any>, { className: "mr-2 h-4 w-4" }) : null
                        }
                        {state.secondaryAction.label}
                      </Button>
                    </Link>
                  ) : 'onClick' in state.secondaryAction && state.secondaryAction.onClick ? (
                    <Button 
                      variant="outline"
                      onClick={state.secondaryAction.onClick}
                    >
                      {('icon' in state.secondaryAction && state.secondaryAction.icon) ? 
                        React.createElement(state.secondaryAction.icon as React.ComponentType<any>, { className: "mr-2 h-4 w-4" }) : null
                      }
                      {state.secondaryAction.label}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          )}

          {/* Help Text */}
          {'helpText' in state && state.helpText && (
            <p className="text-sm text-gray-500 mt-6">
              {state.helpText}
            </p>
          )}

          {/* Admin Help Link for Document Types */}
          {type === 'document-types' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Need help understanding document types?
              </p>
              <Link href="/help">
                <Button variant="link" className="text-blue-600">
                  View Documentation
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Example usage component for different scenarios
export function DocumentsEmptyState() {
  return <EmptyState type="documents" />
}

export function MyDocumentsEmptyState() {
  return <EmptyState type="my-documents" />
}

export function ApprovalsEmptyState() {
  return <EmptyState type="approvals" />
}

export function SearchResultsEmptyState({ searchQuery }: { searchQuery?: string }) {
  return <EmptyState type="search-results" searchQuery={searchQuery} />
}

export function DocumentTypesEmptyState() {
  return <EmptyState type="document-types" />
}
