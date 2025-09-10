"use client";

import { useState, useEffect } from 'react';

import { ChevronDown, Users, Building2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import supabase from '@/lib/supabaseBrowserClient';
import { cn } from '@/lib/utils';
import { Team } from '@/types/tasks';

interface TeamSelectorProps {
  selectedTeam: Team | null;
  onTeamChange: (team: Team | null) => void;
  className?: string;
}

export function TeamSelector({ selectedTeam, onTeamChange, className }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  // Load saved team selection on mount
  useEffect(() => {
    if (typeof window === 'undefined' || teams.length === 0 || selectedTeam) {
      return;
    }
    
    const savedTeam = localStorage.getItem('selected-team');
    if (savedTeam) {
      try {
        const parsedTeam = JSON.parse(savedTeam);
        const foundTeam = teams.find(t => t.id === parsedTeam.id);
        if (foundTeam) {
          onTeamChange(foundTeam);
        }
      } catch (error) {
        console.error('Error parsing saved team:', error);
      }
    } else {
      // Default to All Teams (null) if no selection
      onTeamChange(null);
    }
  }, [teams, selectedTeam, onTeamChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (isOpen && target && !target.closest('.team-selector-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (team: Team | null) => {
    onTeamChange(team);
    // Persist selection to localStorage
    if (typeof window !== 'undefined') {
      if (team) {
        localStorage.setItem('selected-team', JSON.stringify(team));
      } else {
        localStorage.removeItem('selected-team');
      }
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="w-6 h-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="text-sm text-slate-400">Loading teams...</span>
      </div>
    );
  }

  const handleTeamChange = (team: Team | null) => {
    handleTeamSelect(team);
    setIsOpen(false);
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Building2 className="w-4 h-4" />
        <span>Team:</span>
      </div>
      
      <div className="relative team-selector-dropdown">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 text-white min-w-[160px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-medium">
              {selectedTeam ? selectedTeam.name : 'All Teams'}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800/95 border border-slate-600/50 backdrop-blur-xl rounded-md shadow-lg z-[100]">
            <div
              onClick={() => handleTeamChange(null)}
              className="flex items-center gap-2 text-white hover:bg-slate-700/50 cursor-pointer px-3 py-2"
            >
              <div className="flex items-center gap-2 flex-1">
                <Building2 className="w-4 h-4" />
                <span>All Teams</span>
              </div>
              {!selectedTeam && (
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Active
                </Badge>
              )}
            </div>
            
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => handleTeamChange(team)}
                className="flex items-center gap-2 text-white hover:bg-slate-700/50 cursor-pointer px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Users className="w-4 h-4" />
                  <span>{team.name}</span>
                </div>
                {selectedTeam?.id === team.id && (
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Active
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedTeam && (
        <Badge 
          variant="outline" 
          className="bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium"
        >
          {selectedTeam.name} Board
        </Badge>
      )}
    </div>
  );
}