# How to Create an Admin Account

There are several ways to create an admin account for your task management application. Choose the method that works best for you:

## Method 1: Direct Database Update (Recommended)

### Step 1: Sign up for a regular account first
1. Go to `http://localhost:3000/auth/sign-in`
2. Click "Sign Up" and create a new account with your email
3. Fill in your name, department, and location
4. Verify your email if required
5. Sign in to your account

### Step 2: Update your role in Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Table Editor** → **profiles**
3. Find your user record (look for your email/name)
4. Click on the **role** field for your user
5. Change it from `member` to `admin`
6. Save the changes

### Step 3: Refresh your application
1. Go back to your application
2. Sign out and sign back in, or refresh the page
3. You should now see the "Email" tab and admin features

## Method 2: SQL Command (Advanced)

If you know your user ID, you can run this SQL command in the Supabase SQL Editor:

```sql
-- Replace 'your-user-id-here' with your actual user ID
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'your-user-id-here';
```

To find your user ID:
```sql
-- Find your user ID by email
SELECT id, full_name, email, role 
FROM auth.users 
JOIN public.profiles ON auth.users.id = public.profiles.id 
WHERE auth.users.email = 'your-email@example.com';
```

## Method 3: Create Admin Creation Script

Create a one-time admin setup script:

```sql
-- Run this in Supabase SQL Editor
-- This will make the first user who signs up an admin
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user (oldest created_at)
    SELECT id INTO first_user_id 
    FROM public.profiles 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Make them admin if they exist
    IF first_user_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET role = 'admin' 
        WHERE id = first_user_id;
        
        RAISE NOTICE 'First user has been made admin: %', first_user_id;
    ELSE
        RAISE NOTICE 'No users found in profiles table';
    END IF;
END $$;
```

## Method 4: Environment-Based Auto-Admin

For development, you can modify the profile creation logic to automatically make certain emails admin:

1. Add an environment variable to your `.env.local`:
```
ADMIN_EMAILS=your-email@example.com,another-admin@example.com
```

2. The profile creation logic in `SupabaseAuthInit.tsx` can be updated to check this list.

## Verification

After creating your admin account, verify it works:

1. Sign in to your application
2. Go to the dashboard (`http://localhost:3000/dashboard`)
3. You should see:
   - Your role displayed as "admin" in the header
   - An "Email" tab in the navigation
   - Access to admin-only features

## Troubleshooting

### Issue: Role doesn't update after changing in database
**Solution**: Sign out and sign back in, or clear your browser cache

### Issue: Email tab still not visible
**Solution**: 
1. Check that your role is exactly `admin` (lowercase) in the database
2. Refresh the page or restart the development server
3. Check browser console for any authentication errors

### Issue: Can't access Supabase dashboard
**Solution**: 
1. Make sure you're logged into the correct Supabase project
2. Check that your `.env.local` has the correct `NEXT_PUBLIC_SUPABASE_URL`
3. Verify you have the right permissions on the Supabase project

## Security Note

In production, you should:
1. Remove any auto-admin creation logic
2. Use proper admin invitation flows
3. Implement proper role management through your application UI
4. Never hardcode admin emails in your codebase

The admin panel in your application (`/admin`) provides a proper interface for promoting users to different roles once you have at least one admin account set up.