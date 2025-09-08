'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Team {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  department?: string;
  title?: string;
  location?: string;
}

export default function UserDebugPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchTeams();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }
      
      setUser(session.user);
      
      // Get user profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) {
        console.error('Profile error:', error);
      } else {
        setProfile(profile);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Teams error:', error);
      } else {
        setTeams(teams || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const updateUserDepartment = async () => {
    if (!selectedTeam || !profile) return;
    
    setUpdating(true);
    try {
      const selectedTeamData = teams.find(t => t.id === selectedTeam);
      if (!selectedTeamData) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({ department: selectedTeamData.name })
        .eq('id', profile.id);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setProfile({ ...profile, department: selectedTeamData.name });
      
      toast({
        title: 'Success',
        description: `Department updated to ${selectedTeamData.name}`,
      });
    } catch (error) {
      console.error('Error updating department:', error);
      toast({
        title: 'Error',
        description: 'Failed to update department',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Not Logged In</CardTitle>
            <CardDescription>
              Please log in to view your profile information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Profile Debug</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Authentication Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </CardContent>
      </Card>

      {profile && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Full Name:</strong> {profile.full_name}</p>
              <p><strong>Role:</strong> {profile.role}</p>
              <p><strong>Department:</strong> {profile.department || 'Not assigned'}</p>
              <p><strong>Title:</strong> {profile.title || 'Not set'}</p>
              <p><strong>Location:</strong> {profile.location || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!profile?.department && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">⚠️ Missing Department</CardTitle>
            <CardDescription className="text-yellow-700">
              Your profile doesn&apos;t have a department assigned. This is why assistance requests show &quot;Unknown Team&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Assign Department:</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={updateUserDepartment} 
                disabled={!selectedTeam || updating}
              >
                {updating ? 'Updating...' : 'Update Department'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {profile?.department && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ Department Assigned</CardTitle>
            <CardDescription className="text-green-700">
              Your department is set to &quot;{profile.department}&quot;. Assistance requests should now show the correct requesting team.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Available Teams</h3>
        <div className="grid gap-2">
          {teams.map(team => (
            <div key={team.id} className="p-3 border rounded">
              <strong>{team.name}</strong>
              <br />
              <small className="text-gray-500">ID: {team.id}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}