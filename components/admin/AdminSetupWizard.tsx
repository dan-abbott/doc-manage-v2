'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, FileText, AlertCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createDocumentType } from '@/app/actions/document-types'

interface DocumentTypeTemplate {
  name: string
  prefix: string
  description: string
}

const STANDARD_TEMPLATES: DocumentTypeTemplate[] = [
  {
    name: 'Form',
    prefix: 'FORM',
    description: 'Forms, templates, and structured documents'
  },
  {
    name: 'Procedure',
    prefix: 'PROC',
    description: 'Standard operating procedures and process documentation'
  },
  {
    name: 'Work Instruction',
    prefix: 'WI',
    description: 'Detailed step-by-step work instructions'
  }
]

interface AdminSetupWizardProps {
  onComplete?: () => void
}

export default function AdminSetupWizard({ onComplete }: AdminSetupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [useStandardTypes, setUseStandardTypes] = useState<boolean | null>(null)
  const [customType, setCustomType] = useState({
    name: '',
    prefix: '',
    description: ''
  })

  const handleQuickSetup = async () => {
    setLoading(true)
    try {
      // Create all standard types
      const results = await Promise.all(
        STANDARD_TEMPLATES.map(template => 
          createDocumentType({
            name: template.name,
            prefix: template.prefix,
            description: template.description,
            is_active: true
          })
        )
      )

      const failures = results.filter(r => !r.success)
      
      if (failures.length > 0) {
        toast.error(`Created ${results.length - failures.length} types, but ${failures.length} failed`)
      } else {
        toast.success('Standard document types created successfully!')
      }

      // Mark wizard as completed
      localStorage.setItem('baselinedocs_admin_setup_completed', 'true')
      
      if (onComplete) {
        onComplete()
      } else {
        router.push('/admin/document-types')
      }
    } catch (error) {
      console.error('Setup failed:', error)
      toast.error('Failed to create document types')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomSetup = async () => {
    if (!customType.name || !customType.prefix) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!/^[A-Z]{2,10}$/.test(customType.prefix)) {
      toast.error('Prefix must be 2-10 uppercase letters')
      return
    }

    setLoading(true)
    try {
      const result = await createDocumentType({
        name: customType.name,
        prefix: customType.prefix,
        description: customType.description,
        is_active: true
      })

      if (result.success) {
        toast.success('Document type created successfully!')
        
        // Mark wizard as completed
        localStorage.setItem('baselinedocs_admin_setup_completed', 'true')
        
        if (onComplete) {
          onComplete()
        } else {
          router.push('/admin/document-types')
        }
      } else {
        toast.error(result.error || 'Failed to create document type')
      }
    } catch (error) {
      console.error('Custom setup failed:', error)
      toast.error('Failed to create document type')
    } finally {
      setLoading(false)
    }
  }

  const skipWizard = () => {
    localStorage.setItem('baselinedocs_admin_setup_completed', 'true')
    router.push('/admin/document-types')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Step 1: Welcome & Choice */}
        {step === 1 && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Welcome, Admin! 👋</CardTitle>
              <CardDescription className="text-base mt-2">
                Before users can create documents, you need to set up document types. 
                Document types define categories and numbering schemes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Setup Option */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  useStandardTypes === true ? 'border-2 border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setUseStandardTypes(true)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">
                        Quick Setup (Recommended)
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        Create standard document types used by most organizations:
                      </p>
                      <div className="space-y-2">
                        {STANDARD_TEMPLATES.map((template, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-16 bg-gray-200 px-2 py-1 rounded font-mono text-xs">
                              {template.prefix}
                            </div>
                            <div>
                              <span className="font-medium">{template.name}</span>
                              <span className="text-gray-500 ml-2">- {template.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Setup Option */}
              <Card 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  useStandardTypes === false ? 'border-2 border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setUseStandardTypes(false)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">
                        Custom Setup
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Create your own document type with a custom prefix and description. 
                        You can add more types later.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={skipWizard}
                  disabled={loading}
                >
                  Skip for Now
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (useStandardTypes === null) {
                      toast.error('Please choose a setup option')
                      return
                    }
                    if (useStandardTypes) {
                      handleQuickSetup()
                    } else {
                      setStep(2)
                    }
                  }}
                  disabled={loading || useStandardTypes === null}
                >
                  {loading ? 'Creating...' : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Custom Type Creation */}
        {step === 2 && !useStandardTypes && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle>Create Your First Document Type</CardTitle>
              <CardDescription>
                Define a custom document type for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name Field */}
              <div>
                <Label htmlFor="name">
                  Document Type Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Form, Procedure, Protocol"
                  value={customType.name}
                  onChange={(e) => setCustomType(prev => ({ ...prev, name: e.target.value }))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  A descriptive name for this document category
                </p>
              </div>

              {/* Prefix Field */}
              <div>
                <Label htmlFor="prefix">
                  Prefix <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="prefix"
                  placeholder="e.g., FORM, PROC, PROTO"
                  value={customType.prefix}
                  onChange={(e) => setCustomType(prev => ({ 
                    ...prev, 
                    prefix: e.target.value.toUpperCase() 
                  }))}
                  maxLength={10}
                  className="font-mono"
                />
                <p className="text-sm text-gray-500 mt-1">
                  2-10 uppercase letters. Used in document numbers (e.g., FORM-00001)
                </p>
              </div>

              {/* Description Field */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this document type is used for..."
                  value={customType.description}
                  onChange={(e) => setCustomType(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Preview */}
              {customType.prefix && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    📋 Document numbers will look like:
                  </p>
                  <div className="font-mono text-lg font-semibold text-blue-900">
                    {customType.prefix}-00001vA
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">Important:</p>
                  <p>Once documents are created with this prefix, it cannot be changed. Choose carefully!</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleCustomSetup}
                  disabled={loading || !customType.name || !customType.prefix}
                >
                  {loading ? 'Creating...' : 'Create Document Type'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
