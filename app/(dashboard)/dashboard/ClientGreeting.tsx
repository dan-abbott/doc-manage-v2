'use client'

import { useEffect, useState } from 'react'
import { getGreetingWithName } from '@/lib/utils/greetings'

interface ClientGreetingProps {
  fullName: string | null | undefined
  className?: string
}

export default function ClientGreeting({ fullName, className }: ClientGreetingProps) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    // Set greeting on client side to ensure consistency
    setGreeting(getGreetingWithName(fullName))
  }, [fullName])

  // Return a non-breaking space during hydration to prevent layout shift
  if (!greeting) {
    return <span className={className}>&nbsp;</span>
  }

  return <span className={className}>{greeting}</span>
}
