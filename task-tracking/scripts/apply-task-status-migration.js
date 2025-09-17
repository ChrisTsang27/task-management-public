import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Checking current task status enum values...');
    
    // First, let's check what status values currently exist
    const { data: currentStatuses, error: statusError } = await supabase
      .from('tasks')
      .select('status')
      .limit(1);
    
    if (statusError) {
      console.error('Error checking current statuses:', statusError);
    } else {
      console.log('Current task statuses check completed');
    }
    
    // Try to create a task with 'cancelled' status to test if it exists
    console.log('Testing if cancelled status is available...');
    
    const testTaskData = {
      title: 'Test Migration Task',
      description_json: { content: 'Testing if cancelled status works' },
      status: 'cancelled',
      team_id: null,
      assignee_id: null,
      is_request: false
    };
    
    const { data: testTask, error: testError } = await supabase
      .from('tasks')
      .insert(testTaskData)
      .select()
      .single();
    
    if (testError) {
      if (testError.message.includes('invalid input value for enum task_status')) {
        console.log('❌ Cancelled status not available in database');
        console.log('The database schema needs to be updated manually in Supabase SQL Editor');
        console.log('\nPlease run this SQL in your Supabase SQL Editor:');
        console.log('ALTER TYPE task_status ADD VALUE IF NOT EXISTS \'blocked\';');
        console.log('ALTER TYPE task_status ADD VALUE IF NOT EXISTS \'on_hold\';');
        console.log('ALTER TYPE task_status ADD VALUE IF NOT EXISTS \'cancelled\';');
      } else {
        console.error('Test task creation failed:', testError);
      }
    } else {
      console.log('✅ Cancelled status is available!');
      // Clean up test task
      await supabase.from('tasks').delete().eq('id', testTask.id);
      console.log('Migration appears to be already applied or not needed');
    }
    
  } catch (error) {
    console.error('Error during migration check:', error);
    process.exit(1);
  }
}

applyMigration();