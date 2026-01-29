'use client'

import { useState } from 'react'
import { X, MessageSquare, Bug, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitFeedback, type FeedbackType } from '@/app/actions/feedback'
import { toast } from 'sonner'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('general')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      toast.error('Please enter a description')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitFeedback({
        type,
        description: description.trim(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      })

      if (result.success) {
        toast.success(result.message || 'Feedback sent successfully!')
        setDescription('')
        setType('general')
        onClose()
      } else {
        toast.error(result.error || 'Failed to send feedback')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Feedback submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const feedbackTypes = [
    { value: 'bug' as FeedbackType, label: 'Bug Report', icon: Bug, color: 'text-red-600' },
    { value: 'feature' as FeedbackType, label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-600' },
    { value: 'general' as FeedbackType, label: 'General Feedback', icon: MessageSquare, color: 'text-blue-600' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Send Feedback
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Feedback Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What would you like to share?
            </label>
            <div className="grid grid-cols-1 gap-2">
              {feedbackTypes.map((feedbackType) => {
                const Icon = feedbackType.icon
                return (
                  <button
                    key={feedbackType.value}
                    type="button"
                    onClick={() => setType(feedbackType.value)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                      ${type === feedbackType.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${feedbackType.color}`} />
                    <span className="font-medium text-gray-900">
                      {feedbackType.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'bug' 
                  ? 'Please describe the bug you encountered. Include steps to reproduce if possible...'
                  : type === 'feature'
                  ? 'What feature would you like to see? How would it help you?'
                  : 'Share your thoughts, ideas, or any other feedback...'
              }
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Your email and user info will be included automatically
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !description.trim()}
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
