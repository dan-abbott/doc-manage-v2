'use client'

import { useEffect, useState } from 'react'
import { getGreetingWithName } from '@/lib/utils/greetings'

interface ClientGreetingProps {
  fullName: string | null | undefined
}

export default function ClientGreeting({ fullName }: ClientGreetingProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and before mount, return placeholder
  if (!mounted) {
    return <span>Hi there</span>
  }

  // After mount, show actual greeting
  return <span>{getGreetingWithName(fullName)}</span>
}
