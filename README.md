# Document Control System - Phase 1 Setup

## Overview

This is Phase 1 of the Document Control System: **Foundation & Authentication**. You can sign in with Google, view the dashboard, and sign out.

## Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Google Cloud Platform account (for OAuth)
- Git (for deployment to Vercel)

## Setup Instructions

### 1. Supabase Project Setup

#### A. Create New Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name:** document-control-dev (or your preference)
   - **Database Password:** (save this somewhere secure)
   - **Region:** Choose closest to you
5. Click "Create new project"
6. Wait for provisioning to complete (~2 minutes)

#### B. Run Database Migration
1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `supabase/migrations/001_users_table.sql`
4. Paste into the editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify: You should see "Success. No rows returned"

#### C. Configure Google OAuth

1. In Supabase, go to **Authentication** → **Providers**
2. Find "Google" and click to expand
3. Enable "Google enabled"
4. Leave the Client ID and Client Secret fields empty for now
5. Note the **Callback URL** shown (you'll need this for Google Cloud)

### 2. Google Cloud OAuth Setup

#### A. Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - User Type: **External** (for MVP)
   - App name: **Document Control System**
   - User support email: (your email)
   - Developer contact: (your email)
   - Click **Save and Continue** through the remaining steps
6. Return to Create OAuth client ID:
   - Application type: **Web application**
   - Name: **Document Control System**
   - Authorized redirect URIs: Add the Supabase callback URL from step 1.C
   - Click **Create**
7. Copy the **Client ID** and **Client Secret**

#### B. Update Supabase with OAuth Credentials
1. Return to Supabase **Authentication** → **Providers** → **Google**
2. Paste the **Client ID**
3. Paste the **Client Secret**
4. Click **Save**

### 3. Local Development Setup

#### A. Clone and Install Dependencies
```bash
cd document-control-system
npm install
```

#### B. Configure Environment Variables
1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Get your Supabase credentials:
   - Go to Supabase project **Settings** → **API**
   - Copy **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → paste as `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

3. Your `.env.local` should look like:
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### C. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Test Phase 1 Features

Use the testing checklist in Phase 1:

- [ ] Can sign in with Google account
- [ ] First user automatically becomes admin (check "Admin" badge)
- [ ] Sign out and create a second account
- [ ] Second user is NOT admin (no "Admin" badge)
- [ ] Session persists across page refreshes
- [ ] Can sign out successfully
- [ ] Unauthenticated users redirect to landing page
- [ ] Authenticated users redirect to dashboard

## Verify Database Setup

### Check Users Table
Run this query in Supabase SQL Editor:
```sql
SELECT id, email, is_admin, created_at 
FROM public.users 
ORDER BY created_at;
```

You should see:
- Your first user with `is_admin = true`
- Your second user (if created) with `is_admin = false`

### Check Trigger
The trigger automatically creates records in `public.users` when someone signs in via Google OAuth. Verify it exists:
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND event_object_table = 'users';
```

## Deployment to Vercel (Optional)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Phase 1: Authentication complete"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [https://vercel.com](https://vercel.com)
2. Click "Import Project"
3. Import your GitHub repository
4. Configure environment variables (same as .env.local but change SITE_URL):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://your-app.vercel.app`
5. Click "Deploy"

### 3. Update Google OAuth Redirect URIs
1. Go to Google Cloud Console → **Credentials**
2. Edit your OAuth client
3. Add the Vercel URL to **Authorized redirect URIs**:
   - `https://your-app.vercel.app/auth/callback`
4. Save changes

## Troubleshooting

### "Invalid login credentials" Error
- Verify Google OAuth is enabled in Supabase
- Check that Client ID and Client Secret are correct
- Ensure the redirect URI in Google Cloud matches Supabase exactly

### "Database error" or Can't Read User Data
- Ensure the migration script ran successfully
- Check that RLS policies are enabled
- Verify the trigger `on_auth_user_created` exists

### First User Not Admin
- Delete the user from Supabase **Authentication** → **Users**
- Delete the row from `public.users` table
- Sign in again (should auto-create with is_admin = true)

### Session Not Persisting
- Clear browser cookies
- Check that middleware.ts is properly configured
- Verify Supabase URL and keys are correct

## Project Structure

```
document-control-system/
├── app/
│   ├── (dashboard)/          # Dashboard route group
│   │   ├── dashboard/
│   │   │   └── page.tsx      # Dashboard page
│   │   └── layout.tsx        # Dashboard layout with nav
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts      # OAuth callback handler
│   ├── globals.css           # Global styles + Tailwind
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/
│   ├── auth/
│   │   └── SignInButton.tsx  # Google sign-in button
│   └── dashboard/
│       └── Navigation.tsx    # Navigation with user menu
├── lib/
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       └── server.ts         # Server Supabase client
├── supabase/
│   └── migrations/
│       └── 001_users_table.sql
├── middleware.ts             # Auth middleware
├── .env.example              # Example environment variables
├── .env.local                # Your local environment variables (gitignored)
├── next.config.js
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## What's Next?

Phase 1 is complete! You have:
- ✅ Working authentication with Google OAuth
- ✅ User management with admin flag
- ✅ Protected routes with middleware
- ✅ Basic navigation and dashboard

**Next: Phase 2 - Document Types Configuration**

Phase 2 will add:
- Admin-only document type management
- CRUD operations for document types (Form, Procedure, Work Instruction)
- Sequential numbering setup
- Active/inactive status

## Getting Help

If you encounter issues:
1. Check the Troubleshooting section above
2. Review Supabase logs: **Logs** → **API Logs**
3. Check browser console for errors
4. Verify all environment variables are set correctly

## Security Notes

- Never commit `.env.local` to Git (it's in .gitignore)
- Keep your `SUPABASE_SERVICE_ROLE_KEY` secret (server-side only)
- The `NEXT_PUBLIC_*` variables are safe to expose to the browser
- RLS (Row Level Security) protects your database even with public keys

---

**Phase 1 Deliverable:** ✅ A working authentication system where users can log in and see a basic authenticated interface.
