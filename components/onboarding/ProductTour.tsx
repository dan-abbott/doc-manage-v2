'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TourStep {
  title: string
  content: string
  target?: string // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: {
    label: string
    href?: string
  }
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to BaselineDocs! 👋',
    content: 'Let\'s take a quick tour to help you get started with managing your documents. You can skip this tour anytime by clicking the X or pressing Escape.',
    position: 'center'
  },
  {
    title: 'Your Dashboard',
    content: 'This is your command center. Here you\'ll see statistics about all your documents, pending approvals, and recent activity across your organization.',
    target: '.dashboard-stats',
    position: 'bottom'
  },
  {
    title: 'Create Documents',
    content: 'This is where you create new documents. Choose a document type, add a title and description, upload files, and assign approvers if needed. Your admin can set up document types in the Admin Panel.',
    target: '[href="/documents/new"]',
    position: 'left'
  },
  {
    title: 'Document Lifecycle',
    content: 'Documents move through different states: Draft (editable), In Approval (awaiting reviewers), Released (approved & active), and Obsolete (superseded by a newer version). You can create new versions of Released documents.',
    position: 'center'
  },
  {
    title: 'Pending Approvals',
    content: 'When documents are submitted for your review, they\'ll appear here. You can approve or reject documents assigned to you, with the option to add comments.',
    target: '[href="/approvals"]',
    position: 'left'
  },
  {
    title: 'You\'re All Set! 🎉',
    content: 'You\'re ready to start managing documents! Need more help? Click the Help link in the navigation for guides, tutorials, and FAQs.',
    position: 'center',
    action: {
      label: 'Visit Help Center',
      href: '/help'
    }
  }
]

export default function ProductTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    // Check if user has completed tour
    const tourCompleted = localStorage.getItem('baselinedocs_tour_completed')
    if (!tourCompleted) {
      // Small delay to let page render
      const timer = setTimeout(() => setIsOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const step = TOUR_STEPS[currentStep]
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement
      if (element) {
        setTargetElement(element)
        
        // Calculate highlight position
        const rect = element.getBoundingClientRect()
        setHighlightStyle({
          position: 'fixed',
          top: `${rect.top - 8}px`,
          left: `${rect.left - 8}px`,
          width: `${rect.width + 16}px`,
          height: `${rect.height + 16}px`,
          zIndex: 9998,
          pointerEvents: 'none',
          border: '3px solid #3B82F6',
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s ease'
        })

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        setTargetElement(null)
        setHighlightStyle({})
      }
    } else {
      setTargetElement(null)
      setHighlightStyle({})
    }
  }, [currentStep, isOpen])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    localStorage.setItem('baselinedocs_tour_completed', 'true')
    setIsOpen(false)
  }

  const skipTour = () => {
    if (confirm('Skip the tour? You can always access help from the navigation menu.')) {
      completeTour()
    }
  }

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  // Calculate modal position based on target element
  let modalStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    maxWidth: '480px',
    width: '90%'
  }

  if (step.position === 'center' || !targetElement) {
    modalStyle = {
      ...modalStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    }
  } else if (targetElement) {
    const rect = targetElement.getBoundingClientRect()
    
    switch (step.position) {
      case 'bottom':
        modalStyle = {
          ...modalStyle,
          top: `${rect.bottom + 20}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        }
        break
      case 'top':
        modalStyle = {
          ...modalStyle,
          bottom: `${window.innerHeight - rect.top + 20}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translateX(-50%)'
        }
        break
      case 'left':
        modalStyle = {
          ...modalStyle,
          top: `${rect.top + rect.height / 2}px`,
          right: `${window.innerWidth - rect.left + 20}px`,
          transform: 'translateY(-50%)'
        }
        break
      case 'right':
        modalStyle = {
          ...modalStyle,
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + 20}px`,
          transform: 'translateY(-50%)'
        }
        break
    }
  }

  return (
    <>
      {/* Backdrop */}
      {step.position === 'center' && (
        <div 
          className="fixed inset-0 bg-black/50 z-9997"
          style={{ zIndex: 9997 }}
        />
      )}

      {/* Highlight ring for targeted elements */}
      {targetElement && <div style={highlightStyle} />}

      {/* Tour Modal */}
      <Card style={modalStyle} className="shadow-2xl border-2 border-blue-500">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 pr-8">
              {step.title}
            </h3>
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close tour"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {step.content}
          </p>

          {/* Progress Indicator */}
          <div className="flex gap-1 mb-6">
            {TOUR_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-blue-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 whitespace-nowrap">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </div>

            <div className="flex gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}

              {step.action ? (
                <a href={step.action.href} onClick={completeTour}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    {step.action.label}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </a>
              ) : (
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
