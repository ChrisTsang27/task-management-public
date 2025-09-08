"use client";

import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RichTextEditor = lazy(() => import('@/components/ui/rich-text-editor'));
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Users, AlertCircle, Send } from 'lucide-react';
import { Team, CreateAssistanceRequestData } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';
import supabase from '@/lib/supabaseBrowserClient';

interface AssistanceRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTeamId: string;
  onSubmit: (data: CreateAssistanceRequestData) => Promise<void>;
  loading?: boolean;
}

export function AssistanceRequestForm({
  open,
  onOpenChange,
  currentTeamId,
  onSubmit,
  loading = false
}: AssistanceRequestFormProps) {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [formData, setFormData] = useState<CreateAssistanceRequestData>({
    target_team_id: '',
    title: '',
    description_json: undefined,
    due_date: undefined
  });
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [description, setDescription] = useState<Record<string, unknown> | undefined>(undefined);

  // Fetch available teams
  useEffect(() => {
    const fetchTeams = async () => {
      setLoadingTeams(true);
      try {
        // Get current session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Authentication required');
        }

        const response = await fetch('/api/teams', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch teams');
        
        const data = await response.json();
        // Filter out current team
         const availableTeams = data.teams?.filter((team: Team) => team.id !== currentTeamId) || [];
        setTeams(availableTeams);
      } catch (error) {
        console.error('Error fetching teams:', error);
        toast({
          title: "Error",
          description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoadingTeams(false);
    }
  };

    if (open) {
      fetchTeams();
    }
  }, [open, currentTeamId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.target_team_id) {
      toast({
        title: "Validation Error",
        description: "Please select a target team",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }

    try {
      const requestData: CreateAssistanceRequestData = {
        ...formData,
        description_json: description,
        due_date: dueDate ? dueDate.toISOString() : undefined
      };

      await onSubmit(requestData);
      
      // Reset form
      setFormData({
        target_team_id: '',
        title: '',
        description_json: undefined,
        due_date: undefined
      });
      setDescription(undefined);
      setDueDate(undefined);
      
      onOpenChange(false);
      
      toast({
        title: "Request Sent",
        description: "Your assistance request has been sent to the target team",
      });
    } catch (error) {
      console.error('Error submitting assistance request:', error);
      toast({
        title: "Error",
        description: "Failed to send assistance request",
        variant: "destructive",
      });
    }
  };

  const selectedTeam = teams.find(team => team.id === formData.target_team_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Request Team Assistance
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Request help from another team. They will review and approve your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Team Selection */}
          <div className="space-y-2">
            <Label htmlFor="target-team" className="text-sm font-medium">
              Target Team *
            </Label>
            <Select
              value={formData.target_team_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, target_team_id: value }))}
              disabled={loadingTeams}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select a team to request help from"} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id} className="text-white hover:bg-slate-700">
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTeam && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-blue-900/20 border-blue-600 text-blue-400">
                  Requesting help from: {selectedTeam.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Request Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of what you need help with"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              maxLength={140}
            />
            <div className="text-xs text-slate-500 text-right">
              {formData.title.length}/140
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Detailed Description
            </Label>
            <Suspense fallback={<div className="h-32 bg-gray-50 rounded-md animate-pulse" />}>
              <RichTextEditor
                content={description}
                onChange={(content) => setDescription(typeof content === 'object' && content !== null ? content as Record<string, unknown> : undefined)}
                placeholder="Provide more details about what assistance you need, context, and any specific requirements..."
                className="min-h-[200px]"
              />
            </Suspense>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-slate-800 border-slate-600 text-white hover:bg-slate-700",
                      !dueDate && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="bg-slate-800 text-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 text-blue-300">
                <li>• Your request will appear on the target team&apos;s board with &quot;Awaiting Approval&quot; status</li>
                <li>• The team leader will review and approve or reject your request</li>
                <li>• Once approved, they can assign it to a team member</li>
                <li>• You&apos;ll be notified of status changes</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.target_team_id || !formData.title.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}