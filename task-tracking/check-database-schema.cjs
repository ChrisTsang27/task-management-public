const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking current database schema...\n');
    
    // Check which tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });
    
    if (tablesError) {
      console.log('❌ Cannot execute RPC. Trying alternative method...');
      
      // Try checking specific tables by querying them
      const tablesToCheck = [
        'profiles', 'teams', 'team_members', 'tasks', 'announcements', 
        'announcement_comments', 'announcement_reactions', 'email_logs',
        'event_categories', 'calendar_events'
      ];
      
      console.log('📋 Checking specific tables:\n');
      
      for (const tableName of tablesToCheck) {
        try {
          const { error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error) {
            if (error.code === '42P01') {
              console.log(`❌ Table '${tableName}' does NOT exist`);
            } else {
              console.log(`✅ Table '${tableName}' exists`);
            }
          } else {
            console.log(`✅ Table '${tableName}' exists`);
          }
        } catch (err) {
          console.log(`❌ Table '${tableName}' does NOT exist`);
        }
      }
      
      // Check specific columns that were added in migrations
      console.log('\n🔧 Checking migration-specific columns:\n');
      
      // Check for attachments column in announcements (from schema.sql)
      try {
        const { error } = await supabase
          .from('announcements')
          .select('attachments')
          .limit(1);
        
        if (error && error.code === '42703') {
          console.log('❌ announcements.attachments column is MISSING');
        } else {
          console.log('✅ announcements.attachments column exists');
        }
      } catch (err) {
        console.log('❌ announcements.attachments column is MISSING');
      }
      
      // Check for AI prioritization columns (from 20240115 migration)
      try {
        const { error } = await supabase
          .from('tasks')
          .select('priority_score, ai_insights, complexity_score')
          .limit(1);
        
        if (error && error.code === '42703') {
          console.log('❌ AI prioritization columns (priority_score, ai_insights, complexity_score) are MISSING');
        } else {
          console.log('✅ AI prioritization columns exist');
        }
      } catch (err) {
        console.log('❌ AI prioritization columns are MISSING');
      }
      
      // Check for target_team_id column (from 20240120 migration)
      try {
        const { error } = await supabase
          .from('tasks')
          .select('target_team_id')
          .limit(1);
        
        if (error && error.code === '42703') {
          console.log('❌ tasks.target_team_id column is MISSING');
        } else {
          console.log('✅ tasks.target_team_id column exists');
        }
      } catch (err) {
        console.log('❌ tasks.target_team_id column is MISSING');
      }
      
      // Check for calendar tables (from 20240125 migration)
      try {
        const { error } = await supabase
          .from('calendar_events')
          .select('*')
          .limit(1);
        
        if (error && error.code === '42P01') {
          console.log('❌ Calendar tables (calendar_events, event_categories) are MISSING');
        } else {
          console.log('✅ Calendar tables exist');
        }
      } catch (err) {
        console.log('❌ Calendar tables are MISSING');
      }
      
    } else {
      console.log('📋 Existing tables:');
      tables.forEach(table => {
        console.log(`✅ ${table.table_name}`);
      });
    }
    
    console.log('\n🎯 Migration Status Summary:\n');
    console.log('Based on the checks above, you need to run:');
    console.log('1. Main schema.sql - if core tables are missing');
    console.log('2. 20240101000000_add_predefined_teams.sql - if teams table is empty');
    console.log('3. 20240115000000_add_ai_prioritization.sql - if AI columns are missing');
    console.log('4. 20240120000000_add_target_team_id.sql - if target_team_id is missing');
    console.log('5. 20240125000000_add_calendar_events.sql - if calendar tables are missing');
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  }
}

checkDatabaseSchema();