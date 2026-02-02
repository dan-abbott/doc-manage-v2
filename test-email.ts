import { sendApprovalRequestEmail } from './lib/email-notifications'

// Replace with your actual user ID from Supabase
const YOUR_USER_ID = '4755083f-9721-41cf-856e-10395a19ca09'

async function testEmail() {
  console.log('Sending test email...')
  
  const result = await sendApprovalRequestEmail(YOUR_USER_ID, {
    documentNumber: 'TEST-00001',
    documentVersion: 'vA',
    documentTitle: 'Test Document - Email Notification Test',
    documentId: 'test-id',
    submittedBy: 'Test System'
  })
  
  console.log('Result:', result)
}

testEmail()