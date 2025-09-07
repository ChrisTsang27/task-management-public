/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertTeams() {
  try {
    console.log("Inserting predefined teams...");

    // Define the teams to insert
    const teams = [
      { name: "IT Team" },
      { name: "Sales Team" },
      { name: "Marketing Team" },
      { name: "Design Team" },
      { name: "HR Team" },
      { name: "Finance Team" },
    ];

    // Insert teams one by one to handle conflicts gracefully
    for (const team of teams) {
      const { error } = await supabase
        .from("teams")
        .insert([team])
        .select();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          console.log(`Team "${team.name}" already exists, skipping...`);
        } else {
          console.error(`Error inserting team "${team.name}":`, error);
        }
      } else {
        console.log(`Successfully inserted team: ${team.name}`);
      }
    }

    // Verify teams were created
    console.log("\nVerifying teams in database...");
    const { data: allTeams, error: fetchError } = await supabase
      .from("teams")
      .select("*")
      .order("name");

    if (fetchError) {
      console.error("Error fetching teams:", fetchError);
    } else {
      console.log("Teams in database:");
      allTeams.forEach((team) => {
        console.log(`- ${team.name} (ID: ${team.id})`);
      });
      console.log(`\nTotal teams: ${allTeams.length}`);
    }
  } catch (err) {
    console.error("Error running team insertion:", err);
  }
}

insertTeams();