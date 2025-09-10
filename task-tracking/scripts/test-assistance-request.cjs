const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAssistanceRequest() {
  try {
    console.log('Testing assistance request creation...');
    
    // Get IT and HR team IDs
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .in('name', ['IT Team', 'HR Team']);
    
    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return;
    }
    
    const itTeam = teams.find(t => t.name === 'IT Team');
    const hrTeam = teams.find(t => t.name === 'HR Team');
    
    if (!itTeam || !hrTeam) {
      console.error('Could not find IT Team or HR Team');
      return;
    }
    
    console.log('IT Team ID:', itTeam.id);
    console.log('HR Team ID:', hrTeam.id);
    
    // Create a test assistance request from IT to HR
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: 'Test Assistance Request - Metadata Check',
        description_json: {
          content: 'This is a test to verify requesting team metadata is working',
          _metadata: {
            requesting_team_id: itTeam.id,
            target_team_id: hrTeam.id,
            is_assistance_request: true
          }
        },
        team_id: hrTeam.id, // Target team
        is_request: true,
        status: 'awaiting_approval',
        created_by: '00000000-0000-0000-0000-000000000000' // Placeholder user ID
      })
      .select('*')
      .single();
    
    if (taskError) {
      console.error('Error creating test task:', taskError);
      return;
    }
    
    console.log('\nTest task created successfully!');
    console.log('Task ID:', task.id);
    console.log('Team ID (target):', task.team_id);
    console.log('Metadata:', JSON.stringify(task.description_json, null, 2));
    
    // Check if requesting_team_id is properly set
    const metadata = task.description_json?._metadata;
    if (metadata?.requesting_team_id === itTeam.id) {
      console.log('✅ SUCCESS: requesting_team_id is correctly set to IT Team ID');
    } else {
      console.log('❌ FAILED: requesting_team_id is not set correctly');
      console.log('Expected:', itTeam.id);
      console.log('Actual:', metadata?.requesting_team_id);
    }
    
    // Clean up - delete the test task
    await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id);
    
    console.log('\nTest task cleaned up.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testAssistanceRequest();