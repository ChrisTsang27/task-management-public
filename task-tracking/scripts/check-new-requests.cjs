const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNewRequests() {
  try {
    console.log('Checking recent assistance requests...');
    
    // Get the most recent assistance requests
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        team_id,
        is_request,
        description_json,
        created_at,
        teams!inner(name)
      `)
      .eq('is_request', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }
    
    console.log(`\nFound ${tasks.length} recent assistance requests:\n`);
    
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. Task: ${task.title}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Target Team: ${task.teams.name} (ID: ${task.team_id})`);
      console.log(`   Created: ${new Date(task.created_at).toLocaleString()}`);
      
      const metadata = task.description_json?._metadata;
      if (metadata) {
        console.log(`   Metadata:`);
        console.log(`     - requesting_team_id: ${metadata.requesting_team_id || 'MISSING'}`);
        console.log(`     - target_team_id: ${metadata.target_team_id || 'MISSING'}`);
        console.log(`     - is_assistance_request: ${metadata.is_assistance_request || 'MISSING'}`);
        
        if (metadata.requesting_team_id) {
          console.log(`   ✅ Has requesting_team_id`);
        } else {
          console.log(`   ❌ Missing requesting_team_id`);
        }
      } else {
        console.log(`   ❌ No metadata found`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkNewRequests();