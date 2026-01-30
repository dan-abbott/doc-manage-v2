import { Inngest } from 'inngest'

// Create Inngest client for sending events
export const inngest = new Inngest({ 
  id: 'document-control',
  name: 'Document Control System',
})
