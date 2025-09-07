// Script to check IT team tasks
/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function checkITTeamTasks() {
  try {
    // Get IT teams
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name")
      .ilike("name", "%IT%");

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      return;
    }

    console.log("IT Teams found:", teams);

    // Get tasks for each IT team
    for (const team of teams) {
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, status, created_at")
        .eq("team_id", team.id);

      if (tasksError) {
        console.error(`Error fetching tasks for ${team.name}:`, tasksError);
        continue;
      }

      console.log(`\nTasks for ${team.name} (${team.id}):`);
      console.log(`Total tasks: ${tasks.length}`);
      tasks.forEach((task) => {
        console.log(`- ${task.title} (${task.status})`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkITTeamTasks();