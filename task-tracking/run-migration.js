/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Checking if attachments column exists...');
    
    // First, let's check the current table structure
    const { error: tableError } = await supabase
      .from('announcements')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking table:', tableError);
      return;
    }
    
    console.log('Current table structure checked.');
    
    // Try to add the attachments column using a simple query
    console.log('Adding attachments column...');
    
    // Use the SQL query directly
    const { error } = await supabase
      .from('announcements')
      .select('attachments')
      .limit(1);
    
    if (error && error.code === '42703') {
      console.log('Attachments column does not exist. This confirms the issue.');
      console.log('Please run the following SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE public.announcements');
      console.log("ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;");
      console.log('');
      console.log('After running this SQL, restart your development server.');
    } else if (error) {
      console.error('Unexpected error:', error);
    } else {
      console.log('Attachments column already exists!');
    }
    
  } catch (err) {
    console.error('Error running migration check:', err);
  }
}

runMigration();