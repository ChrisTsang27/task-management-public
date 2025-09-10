/* eslint-disable @typescript-eslint/no-require-imports */
// const { createClient } = require('@supabase/supabase-js'); // Not used in this script

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// const supabase = createClient(supabaseUrl, supabaseServiceKey); // Not used in this script

async function applyMigration() {
  try {
    console.log('Applying database migration...');
    
    // Use Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: `ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;`
      })
    });
    
    if (!response.ok) {
      // Try alternative approach using a stored procedure
      console.log('Direct SQL execution not available. Creating a temporary function...');
      
      // Create a temporary function to execute the migration
      const createFunctionSQL = `
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
      `;
      
      // This approach requires manual execution in Supabase SQL Editor
      console.log('\n=== MANUAL MIGRATION REQUIRED ===');
      console.log('Please copy and paste the following SQL into your Supabase SQL Editor:');
      console.log('\n1. First, create the migration function:');
      console.log(createFunctionSQL);
      console.log('\n2. Then execute the function:');
      console.log('SELECT temp_add_attachments_column();');
      console.log('\n3. Finally, clean up the temporary function:');
      console.log('DROP FUNCTION temp_add_attachments_column();');
      console.log('\n=== OR SIMPLE VERSION ===');
      console.log('Just run this single line in Supabase SQL Editor:');
      console.log("ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;");
      console.log('\nAfter running the SQL, restart your development server with: npm run dev');
      
    } else {
      const result = await response.json();
      console.log('Migration applied successfully!', result);
    }
    
  } catch (err) {
    console.error('Error applying migration:', err);
    console.log('\n=== FALLBACK: MANUAL MIGRATION ===');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log("ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;");
  }
}

applyMigration();