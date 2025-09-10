// Script to fix duplicate teams in the database
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function fixDuplicateTeams() {
  try {
    console.log('Fetching all teams...');
    
    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, created_at')
      .order('name, created_at');
    
    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return;
    }
    
    console.log(`Found ${teams.length} teams total`);
    
    // Group teams by name
    const teamGroups = {};
    teams.forEach(team => {
      if (!teamGroups[team.name]) {
        teamGroups[team.name] = [];
      }
      teamGroups[team.name].push(team);
    });
    
    // Find duplicates and keep the oldest one (first created)
    const teamsToDelete = [];
    const teamsToKeep = [];
    
    for (const [teamName, teamList] of Object.entries(teamGroups)) {
      if (teamList.length > 1) {
        console.log(`\nFound ${teamList.length} duplicates for "${teamName}"`);
        
        // Sort by created_at to keep the oldest
        teamList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        const keepTeam = teamList[0];
        const deleteTeams = teamList.slice(1);
        
        teamsToKeep.push(keepTeam);
        teamsToDelete.push(...deleteTeams);
        
        console.log(`  Keeping: ${keepTeam.name} (${keepTeam.id}) - created ${keepTeam.created_at}`);
        deleteTeams.forEach(team => {
          console.log(`  Deleting: ${team.name} (${team.id}) - created ${team.created_at}`);
        });
      } else {
        teamsToKeep.push(teamList[0]);
      }
    }
    
    if (teamsToDelete.length === 0) {
      console.log('\nNo duplicate teams found!');
      return;
    }
    
    console.log(`\nWill delete ${teamsToDelete.length} duplicate teams`);
    
    // First, check if any tasks are assigned to teams we're about to delete
    for (const team of teamsToDelete) {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('team_id', team.id);
      
      if (tasksError) {
        console.error(`Error checking tasks for team ${team.name}:`, tasksError);
        continue;
      }
      
      if (tasks.length > 0) {
        console.log(`\nWARNING: Team "${team.name}" (${team.id}) has ${tasks.length} tasks:`);
        tasks.forEach(task => console.log(`  - ${task.title}`));
        
        // Find the team to keep with the same name
        const keepTeam = teamsToKeep.find(t => t.name === team.name);
        if (keepTeam) {
          console.log(`Moving tasks to "${keepTeam.name}" (${keepTeam.id})`);
          
          // Update tasks to point to the team we're keeping
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ team_id: keepTeam.id })
            .eq('team_id', team.id);
          
          if (updateError) {
            console.error(`Error moving tasks:`, updateError);
            continue;
          }
          
          console.log(`Successfully moved ${tasks.length} tasks`);
        }
      }
    }
    
    // Now delete the duplicate teams
    for (const team of teamsToDelete) {
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);
      
      if (deleteError) {
        console.error(`Error deleting team ${team.name}:`, deleteError);
      } else {
        console.log(`✓ Deleted duplicate team: ${team.name} (${team.id})`);
      }
    }
    
    console.log('\n✅ Duplicate team cleanup completed!');
    
    // Verify final state
    const { data: finalTeams, error: finalError } = await supabase
      .from('teams')
      .select('id, name')
      .order('name');
    
    if (!finalError) {
      console.log('\nFinal teams in database:');
      finalTeams.forEach(team => {
        console.log(`- ${team.name} (${team.id})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixDuplicateTeams();