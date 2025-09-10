-- Add missing INSERT policy for profiles table
-- Run this in Supabase SQL Editor to enable automatic profile creation

create policy "profiles_self_insert" on public.profiles
for insert with check ( auth.uid() = id );