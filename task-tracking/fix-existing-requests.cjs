const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixExistingRequests() {
  try {
    console.log('Fixing existing assistance requests...');
    
    // Get all assistance requests that are missing requesting_team_id
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, team_id, description_json, created_by')
      .eq('is_request', true);
    
    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }
    
    console.log(`Found ${tasks.length} assistance requests to check...`);
    
    let updatedCount = 0;
    
    for (const task of tasks) {
      const metadata = task.description_json?._metadata;
      
      // Skip if already has requesting_team_id
      if (metadata?.requesting_team_id) {
        console.log(`✓ Task "${task.title}" already has requesting_team_id`);
        continue;
      }
      
      // Since we can't determine the requesting team from user profile,
      // we'll use IT Team as the default requesting team for existing requests
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', 'IT Team')
        .single();
      
      if (teamsError || !teams?.id) {
        console.log(`⚠️  Could not find IT Team for default requesting team`);
        continue;
      }
      
      // Update the task with requesting_team_id
      const updatedDescriptionJson = {
        ...task.description_json,
        _metadata: {
          ...(metadata || {}),
          requesting_team_id: teams.id,
          target_team_id: task.team_id,
          is_assistance_request: true
        }
      };
      
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ description_json: updatedDescriptionJson })
        .eq('id', task.id);
      
      if (updateError) {
        console.error(`❌ Error updating task "${task.title}":`, updateError);
      } else {
        console.log(`✅ Updated task "${task.title}" with requesting_team_id: ${teams.id} (IT Team)`);
        updatedCount++;
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} assistance requests!`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixExistingRequests();