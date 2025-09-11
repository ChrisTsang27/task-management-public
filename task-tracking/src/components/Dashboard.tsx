"use client";

import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from "react";

import { Menu, X, LayoutGrid, List, Calendar, Filter, Search, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingCard } from "@/components/ui/LoadingSpinner";

// Lazy load heavy components
const EmailComposer = lazy(() => import("@/components/email/EmailComposer"));
const AnnouncementManager = lazy(() => import("@/components/announcements/AnnouncementManager"));
const TaskManager = lazy(() => import("@/components/tasks/TaskManager"));
const CalendarView = lazy(() => import("./calendar/CalendarView").then(module => ({ default: module.CalendarView })));
import { TeamSelector } from "@/components/ui/team-selector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import supabase from "@/lib/supabaseBrowserClient";
import { Team } from "@/types/tasks";

type Role = "admin" | "user";
type Tab = "Announcements" | "Email" | "Tasks" | "Calendar";
type TaskView = "kanban" | "list" | "calendar";

interface TabConfig {
  key: Tab;
  roles: Role[];
  icon: React.ReactNode;
  tooltip: string;
}

interface TaskViewConfig {
  key: TaskView;
  label: string;
  icon: React.ReactNode;
  tooltip: string;
}

export default function Dashboard() {
  const { user, profile, loading: profileLoading, error } = useSupabaseProfile();
  
  // Derive role directly from profile to avoid unnecessary state
  const role: Role = useMemo(() => {
    return profile?.role === 'admin' ? 'admin' : 'user';
  }, [profile?.role]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!profileLoading && !user) {
      window.location.href = '/auth/sign-in';
    }
  }, [profileLoading, user]);

  // Memoize tab configuration to prevent recreation
  const allTabs: TabConfig[] = useMemo(
    () => [
      { 
        key: "Announcements", 
        roles: ["admin", "user"],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        ),
        tooltip: "View team announcements"
      },
      { 
        key: "Email", 
        roles: ["admin"],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ),
        tooltip: "Compose and send emails"
      },

      { 
        key: "Tasks", 
        roles: ["admin", "user"],
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        tooltip: "Manage tasks and project workflow"
      },
      { 
        key: "Calendar", 
        roles: ["admin", "user"],
        icon: (
          <Calendar className="w-5 h-5" />
        ),
        tooltip: "View calendar and schedule events"
      },
    ],
    []
  );

  // Memoize available tabs based on role
  const availableTabs = useMemo(() => {
    return allTabs.filter((t) => t.roles.includes(role));
  }, [allTabs, role]);

  // Initialize tab from localStorage or URL params, fallback to "Tasks" for better UX
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      // Check URL params first
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as Tab;
      if (tabParam && ['Announcements', 'Email', 'Tasks', 'Calendar'].includes(tabParam)) {
        return tabParam;
      }
      // Then check localStorage
      const savedTab = localStorage.getItem('dashboard-tab') as Tab;
      if (savedTab && ['Announcements', 'Email', 'Tasks', 'Calendar'].includes(savedTab)) {
        return savedTab;
      }
    }
    return "Tasks"; // Default to Tasks instead of Announcements for better UX
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskView, setTaskView] = useState<TaskView>(() => {
    if (typeof window !== 'undefined') {
      const savedTaskView = localStorage.getItem('dashboard-task-view') as TaskView;
      if (savedTaskView && ['kanban', 'list', 'calendar'].includes(savedTaskView)) {
        return savedTaskView;
      }
    }
    return "kanban";
  });
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const teamParam = urlParams.get('team');
      // If team=all or no team param, return null to show TeamOverview
      if (teamParam === 'all' || !teamParam) {
        return null;
      }
      // For specific team IDs, we'll let the TeamSelector handle the team data loading
      return null;
    }
    return null;
  });

  // Handle team selection from TeamOverview
  useEffect(() => {
    const handleTeamSelection = async (event: CustomEvent) => {
      const { teamId } = event.detail;
      
      // Fetch complete team data instead of creating minimal object
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single();
          
        if (error) throw error;
        if (data) {
          setSelectedTeam(data);
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
        // Fallback to minimal team object if fetch fails
        const team = { id: teamId, name: '', created_at: '' };
        setSelectedTeam(team);
      }
    };

    const eventHandler = (event: Event) => {
      handleTeamSelection(event as CustomEvent);
    };
    
    window.addEventListener('teamSelected', eventHandler);
    
    return () => {
      window.removeEventListener('teamSelected', eventHandler);
    };
  }, []);

  // Handle URL parameter changes for team selection
  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const teamParam = urlParams.get('team');
      
      if (teamParam === 'all') {
        setSelectedTeam(null);
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Task view configurations
  const taskViewConfigs: TaskViewConfig[] = useMemo(() => [
    {
      key: "kanban",
      label: "Kanban Board",
      icon: <LayoutGrid className="w-4 h-4" />,
      tooltip: "View tasks in a kanban board layout"
    },
    {
      key: "list",
      label: "List View",
      icon: <List className="w-4 h-4" />,
      tooltip: "View tasks in a detailed list"
    },
    {
      key: "calendar",
      label: "Calendar",
      icon: <Calendar className="w-4 h-4" />,
      tooltip: "View tasks in a calendar layout"
    }
  ], []);

  // Handle tab change with persistence
  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-tab', newTab);
      // Update URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Handle task view change with persistence
  const handleTaskViewChange = useCallback((newTaskView: TaskView) => {
    setTaskView(newTaskView);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-task-view', newTaskView);
    }
  }, []);

  // Update tab when role changes and current tab is not available
  useEffect(() => {
    const availableTabKeys = availableTabs.map(t => t.key);
    if (availableTabKeys.length > 0 && !availableTabKeys.includes(tab)) {
      handleTabChange(availableTabKeys[0]);
    }
  }, [availableTabs, tab, handleTabChange]);

  // Close sidebar when tab changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [tab]);

  // Memoize sign out handler
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/sign-in';
  }, []);

  // Show loading while profile is being fetched
  if (profileLoading) {
    return (
      <div className="min-h-screen text-foreground bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error if there's an authentication or profile error
  if (error) {
    return (
      <div className="min-h-screen text-foreground bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-muted-foreground mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.href = '/auth/sign-in'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen text-foreground bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-900/70 via-slate-800/70 to-slate-900/70 border-b border-slate-600/30 shadow-2xl backdrop-blur-xl backdrop-saturate-150">
        <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {/* Sidebar toggle button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle sidebar</p>
                </TooltipContent>
              </Tooltip>
              
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Task Management
              </span>
            </div>
            {/* User info and sign out */}
            <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50 shadow-lg">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                      {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">
                        {profile?.full_name || 'User'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Welcome back
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logged in as {profile?.full_name || 'User'} ({profile?.role || 'user'})</p>
                </TooltipContent>
              </Tooltip>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-400/30 shadow-sm">
                {profile?.role || 'member'}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl border border-red-400/30 hover:scale-105"
                >
                  Sign Out
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign out of your account</p>
              </TooltipContent>
            </Tooltip>
            </div>
          </div>
          
          {/* Navigation tabs */}
          <nav className="flex flex-wrap gap-2 items-center">
            {availableTabs.map((tabConfig) => (
              <Tooltip key={tabConfig.key}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleTabChange(tabConfig.key)}
                    variant={tab === tabConfig.key ? "default" : "ghost"}
                    className={`h-10 px-4 rounded-lg transition-all duration-200 ${
                      tab === tabConfig.key 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{tabConfig.icon}</span>
                    {tabConfig.key}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tabConfig.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {/* Admin Panel Button - Only visible to admin users */}
            {role === 'admin' && (
              <div className="ml-4 pl-4 border-l border-slate-600/50">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => window.location.href = '/admin'}
                      variant="outline"
                      className="h-10 px-4 rounded-lg transition-all duration-200 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-purple-500/50 text-purple-300 hover:from-purple-600/30 hover:to-indigo-600/30 hover:border-purple-400 hover:text-purple-200 shadow-lg hover:shadow-xl"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Access admin panel for user management and system settings</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </nav>
        </div>
      </header>

      <div className="flex">
        {/* Collapsible Sidebar */}
        <aside className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-600/30 transition-transform duration-300 ease-in-out z-20 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80`}>
          <div className="p-6 pt-20">
            {/* Sidebar header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Task view options - only show when Tasks tab is active */}
            {tab === "Tasks" && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Task Views</h3>
                <div className="space-y-2">
                  {taskViewConfigs.map((viewConfig) => (
                    <Tooltip key={viewConfig.key}>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            handleTaskViewChange(viewConfig.key);
                            setSidebarOpen(false);
                          }}
                          variant={taskView === viewConfig.key ? "default" : "ghost"}
                          className={`w-full justify-start h-10 ${
                            taskView === viewConfig.key 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                          }`}
                        >
                          <span className="mr-3">{viewConfig.icon}</span>
                          {viewConfig.label}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{viewConfig.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick actions */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:bg-slate-700/50 hover:text-white"
                >
                  <Search className="w-4 h-4 mr-3" />
                  Search Tasks
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:bg-slate-700/50 hover:text-white"
                >
                  <Filter className="w-4 h-4 mr-3" />
                  Filter & Sort
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:bg-slate-700/50 hover:text-white"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Preferences
                </Button>
              </div>
            </div>
          </div>
        </aside>
        
        {/* Sidebar overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-25 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main content area */}
        <main className={`flex-1 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'lg:ml-80' : 'ml-0'
        }`}>
          <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 py-6">
            {/* Task view indicator for Tasks tab */}
            {tab === "Tasks" && (
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Current view:</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-600/30">
                    {taskViewConfigs.find(v => v.key === taskView)?.icon}
                    <span className="text-sm font-medium text-white">
                      {taskViewConfigs.find(v => v.key === taskView)?.label}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="w-4 h-4 mr-2" />
                  Options
                </Button>
              </div>
            )}
            
            {/* Main content */}
            <section className="space-y-6">
            {/* Tab-based content - only show if there are available tabs */}
            {availableTabs.length > 0 && (
              <>
                {tab === "Announcements" && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <Suspense fallback={<LoadingCard title="Loading Announcements..." description="Please wait while we load the announcement manager" />}>
                        <AnnouncementManager />
                      </Suspense>
                    </CardContent>
                  </Card>
                )}
                
                {tab === "Email" && role === "admin" && (
                  <Suspense fallback={<LoadingCard title="Loading Email Composer..." description="Please wait while we load the email composer" />}>
                    <EmailComposer />
                  </Suspense>
                )}
                
                {tab === "Tasks" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <TeamSelector 
                        selectedTeam={selectedTeam}
                        onTeamChange={setSelectedTeam}
                      />
                    </div>
                    <Suspense fallback={<LoadingCard title="Loading Task Manager..." description="Please wait while we load the task manager" />}>
                      <TaskManager 
                        currentUserId={user?.id}
                        className="w-full"
                        viewMode={taskView}
                        selectedTeam={selectedTeam}
                      />
                    </Suspense>
                  </div>
                )}
                
                {tab === "Calendar" && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <Suspense fallback={<LoadingCard title="Loading Calendar..." description="Please wait while we load the calendar" />}>
                        <CalendarView teamId={selectedTeam?.id} />
                      </Suspense>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            </section>
          </div>
        </main>
      </div>
      </div>
    </TooltipProvider>
  );
}