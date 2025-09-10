require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  try {
    console.log('Checking current user session...');
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return;
    }
    
    if (!session?.user) {
      console.log('❌ No user is currently logged in');
      console.log('Please log in to the application first.');
      return;
    }
    
    console.log('✅ User is logged in:');
    console.log('User ID:', session.user.id);
    console.log('Email:', session.user.email);
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }
    
    console.log('\n📋 User Profile:');
    console.log('Full Name:', profile.full_name);
    console.log('Role:', profile.role);
    console.log('Department:', profile.department);
    console.log('Title:', profile.title);
    console.log('Location:', profile.location);
    
    // Check if user has a team assigned
    if (!profile.department) {
      console.log('\n⚠️  User has no department assigned!');
      console.log('This is why assistance requests show "Unknown Team".');
      
      // Show available teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      console.log('\n🏢 Available teams:');
      teams?.forEach(team => {
        console.log(`- ${team.name} (ID: ${team.id})`);
      });
      
      console.log('\n💡 To fix this, you can:');
      console.log('1. Go to the admin panel and assign yourself to a team');
      console.log('2. Or run the fix script to assign yourself to a team');
    } else {
      console.log('\n✅ User has department:', profile.department);
      
      // Try to find matching team
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .ilike('name', `%${profile.department}%`);
      
      if (teams && teams.length > 0) {
        console.log('\n🏢 Matching team found:');
        teams.forEach(team => {
          console.log(`- ${team.name} (ID: ${team.id})`);
        });
      } else {
        console.log('\n⚠️  No matching team found for department:', profile.department);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
})();