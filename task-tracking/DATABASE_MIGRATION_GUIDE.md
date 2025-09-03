# Database Migration Guide - Fix "Failed to fetch announcements" Error

## Problem Summary

The application is failing to fetch announcements with the error:
```
column announcements.attachments does not exist
```

This happens because the application code expects an `attachments` column in the `announcements` table, but this column is missing from the actual database.

## Root Cause

The database schema in `supabase/schema.sql` includes the `attachments` column, but this schema hasn't been applied to the actual Supabase database. There's a mismatch between:

1. **Application Code**: Expects `attachments` column (defined in schema.sql)
2. **Actual Database**: Missing the `attachments` column

## Solutions

### Option 1: Quick Fix (Recommended)

1. Go to your Supabase project dashboard: https://yhyanbmckqddodbzibta.supabase.co
2. Navigate to **SQL Editor**
3. Run this single SQL command:

```sql
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
```

4. Restart your development server:
```bash
npm run dev
```

### Option 2: Complete Schema Reset (If you don't mind losing data)

1. Go to Supabase SQL Editor
2. Copy the entire contents of `supabase/schema.sql`
3. Paste and execute it in the SQL Editor
4. This will recreate all tables with the correct schema

### Option 3: Safe Migration Function

1. Go to Supabase SQL Editor
2. Run this migration function:

```sql
CREATE OR REPLACE FUNCTION temp_add_attachments_column()
RETURNS text AS $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' 
    AND column_name = 'attachments'
    AND table_schema = 'public'
  ) THEN
    -- Add the column
    ALTER TABLE public.announcements 
    ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
    RETURN 'Attachments column added successfully!';
  ELSE
    RETURN 'Attachments column already exists!';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT temp_add_attachments_column();

-- Clean up
DROP FUNCTION temp_add_attachments_column();
```

## Verification

After applying any of the above solutions:

1. Restart your development server: `npm run dev`
2. Check the browser console - the "Failed to fetch announcements" error should be gone
3. The announcements page should load properly
4. You can verify the column exists by running in Supabase SQL Editor:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'announcements' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

## Prevention

To prevent this issue in the future:

1. **Always apply schema changes**: When updating `supabase/schema.sql`, make sure to apply changes to the actual database
2. **Use migrations**: Consider using Supabase CLI migrations for schema changes
3. **Test locally**: Always test schema changes in a development environment first

## Files Created for Debugging

- `run-migration.js` - Script to check if the column exists
- `apply-migration.js` - Script that attempts to apply the migration
- `add_attachments_column.sql` - SQL migration file

You can delete these files after fixing the issue.

## Next Steps

Once the database migration is complete:

1. The announcements should load properly
2. Pin functionality should work
3. All announcement features should be functional
4. You can proceed with any additional development tasks

---

**Note**: This issue was caused by a schema mismatch between the application code and the actual database. The fix is simple but requires manual execution in the Supabase SQL Editor.