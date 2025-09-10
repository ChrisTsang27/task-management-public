-- Fix profile RLS policies to ensure proper profile creation
-- Run this in Supabase SQL Editor

-- First, check if the INSERT policy exists and drop it if it does
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;

-- Recreate the INSERT policy with proper permissions
CREATE POLICY "profiles_self_insert" ON public.profiles
FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- Ensure the SELECT policy allows authenticated users to read profiles
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles
FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- Ensure the UPDATE policy allows users to update their own profiles
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
FOR UPDATE 
USING ( auth.uid() = id );

-- Verify RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Test the policies by attempting to select from profiles
-- This should work for any authenticated user
SELECT 'Profile RLS policies updated successfully!' as result;

-- Show current policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY policyname;