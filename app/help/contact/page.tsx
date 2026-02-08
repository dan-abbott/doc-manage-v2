'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, CheckCircle, Mail, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { submitContactForm, type ContactFormData } from '@/app/actions/contact-support'
import { toast } from 'sonner'

export default function ContactSupportPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState<ContactFormData>({
    subject: '',
    message: '',
    priority: 'normal',
    category: 'general'
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const result = await submitContactForm(formData)

      if (result.success) {
        setSubmitted(true)
        toast.success(result.message || 'Your message has been sent!')
      } else {
        toast.error(result.error || 'Failed to send message')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="text-center">
            <CardContent className="p-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Message Sent Successfully!
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Thank you for contacting us. We've received your message and will get back to you within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/help">
                  <Button variant="outline">
                    Back to Help Center
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
            Contact Support
          </h1>
          <p className="text-xl text-gray-600">
            Get help from our support team. We typically respond within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  <MessageSquare className="inline h-5 w-5 mr-2" />
                  Send us a message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Issue</option>
                      <option value="feature">Feature Request</option>
                      <option value="billing">Billing Question</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="low">Low - General question</option>
                      <option value="normal">Normal - Standard support</option>
                      <option value="high">High - Urgent issue</option>
                    </select>
                  </div>

                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                      placeholder="Brief description of your issue"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      minLength={5}
                      maxLength={200}
                    />
                    {errors.subject && (
                      <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.subject.length}/200 characters
                    </p>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      placeholder="Please provide as much detail as possible about your question or issue..."
                      rows={8}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required
                      minLength={20}
                      maxLength={5000}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {formData.message.length}/5000 characters (minimum 20)
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      * Required fields
                    </p>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Response Time */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Response Time</h3>
                    <p className="text-sm text-gray-600">
                      We typically respond within 24 hours during business days. High priority issues are addressed first.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Direct Email */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Direct Email</h3>
                <p className="text-sm text-gray-600 mb-3">
                  You can also email us directly:
                </p>
                <a 
                  href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@baselinedocs.com'}`}
                  className="text-sm text-blue-600 hover:text-blue-700 break-all"
                >
                  {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@baselinedocs.com'}
                </a>
              </CardContent>
            </Card>

            {/* Other Resources */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Other Resources</h3>
                <div className="space-y-2">
                  <Link 
                    href="/help/quick-start"
                    className="block text-sm text-blue-600 hover:text-blue-700"
                  >
                    → Quick Start Guide
                  </Link>
                  <Link 
                    href="/help/documentation"
                    className="block text-sm text-blue-600 hover:text-blue-700"
                  >
                    → Full Documentation
                  </Link>
                  <Link 
                    href="/help"
                    className="block text-sm text-blue-600 hover:text-blue-700"
                  >
                    → Help Center
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
