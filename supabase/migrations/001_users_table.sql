-- =========================================
-- Phase 1: Users Table and Authentication
-- =========================================

-- Create users table in public schema
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on email for lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Create trigger function to auto-create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  -- Insert new user record
  -- First user (user_count = 0) becomes admin automatically
  INSERT INTO public.users (id, email, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    (user_count = 0), -- true if first user, false otherwise
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to users table
DROP TRIGGER IF EXISTS set_updated_at ON public.users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- Row Level Security Policies for Users
-- =========================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all user records (needed for approver selection)
CREATE POLICY "Users can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can only update their own record (future profile updates)
CREATE POLICY "Users can update own record"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: INSERT is handled by the trigger, no RLS policy needed
-- Note: DELETE is CASCADE from auth.users, no RLS policy needed

-- =========================================
-- Comments for Documentation
-- =========================================

COMMENT ON TABLE public.users IS 'User profiles with admin flag. First user is automatically admin.';
COMMENT ON COLUMN public.users.id IS 'References auth.users.id via foreign key';
COMMENT ON COLUMN public.users.is_admin IS 'Admin flag for elevated permissions. First user is auto-admin.';
COMMENT ON COLUMN public.users.email IS 'Denormalized from auth.users for easier queries';
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates user record on signup. First user becomes admin.';
