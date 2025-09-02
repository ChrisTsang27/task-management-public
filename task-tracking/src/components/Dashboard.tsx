"use client";

import React, { useEffect, useMemo, useState } from "react";
import EmailComposer from "@/components/email/EmailComposer";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import supabase from "@/lib/supabaseBrowserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


type Role = "admin" | "user";
type Tab = "Email" | "Announcements" | "Tasks";

export default function Dashboard() {
  const { user, profile, loading: profileLoading, error } = useSupabaseProfile();
  const [role, setRole] = useState<Role>("user");

  
  // Update role based on actual user profile
  useEffect(() => {
    if (profile?.role === 'admin') {
      setRole('admin');
    } else {
      setRole('user');
    }
  }, [profile]);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!profileLoading && !user) {
      window.location.href = '/auth/sign-in';
    }
  }, [profileLoading, user]);

  const allTabs: { key: Tab; roles: Role[] }[] = useMemo(
    () => [
      { key: "Email", roles: ["admin"] },
      { key: "Announcements", roles: ["admin", "user"] },
      { key: "Tasks", roles: ["admin", "user"] },
    ],
    []
  );

  const availableTabs = allTabs.filter((t) => t.roles.includes(role)).map((t) => t.key);
  const [tab, setTab] = useState<Tab>(availableTabs[0] || "Announcements");

  useEffect(() => {
    if (!availableTabs.includes(tab)) setTab(availableTabs[0] as Tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

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
    <div className="min-h-screen text-foreground bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-slate-900/70 via-slate-800/70 to-slate-900/70 border-b border-slate-600/30 shadow-2xl backdrop-blur-xl backdrop-saturate-150">
        <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
              <div className="flex items-center gap-2">
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
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-400/30 shadow-sm">
                {profile?.role || 'member'}
              </span>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/auth/sign-in';
              }}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl border border-red-400/30 hover:scale-105"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white uppercase tracking-wider font-medium">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="text-white">
                    <span className="font-medium">Role: {role}</span>
                  </div>
                  <div className="text-white">
                    <span className="font-medium">Tabs: {availableTabs.join(" • ")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm text-slate-300 uppercase tracking-wider font-medium">NAVIGATION</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <nav className="flex flex-col gap-2">
                  <Button
                    onClick={() => setTab('Email')}
                    variant={tab === 'Email' ? "default" : "ghost"}
                    className={`justify-start h-12 px-4 rounded-lg transition-all duration-200 ${
                      tab === 'Email' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </Button>
                  <Button
                    onClick={() => setTab('Announcements')}
                    variant={tab === 'Announcements' ? "default" : "ghost"}
                    className={`justify-start h-12 px-4 rounded-lg transition-all duration-200 ${
                      tab === 'Announcements' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    Announcements
                  </Button>
                  <Button
                    onClick={() => setTab('Tasks')}
                    variant={tab === 'Tasks' ? "default" : "ghost"}
                    className={`justify-start h-12 px-4 rounded-lg transition-all duration-200 ${
                      tab === 'Tasks' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Tasks
                  </Button>
                </nav>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm text-slate-300 uppercase tracking-wider font-medium">QUICK ACTIONS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-lg shadow-md transition-all duration-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Task
                </Button>
                <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-md transition-all duration-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  New Announcement
                </Button>
                <Button className="w-full h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white font-medium rounded-lg shadow-md transition-all duration-200">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Full Email Composer
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main content */}
          <section className="lg:col-span-9">
            {tab === "Email" && role === "admin" && <EmailComposer />}
            
            {tab !== "Email" && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{tab}</CardTitle>
                    {/* Top tab buttons for small screens */}
                    <div className="flex lg:hidden flex-wrap gap-2">
                      {availableTabs.map((t) => (
                        <Button
                          key={t}
                          onClick={() => setTab(t)}
                          variant={tab === t ? "default" : "outline"}
                          size="sm"
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-10 m-10">

              {tab === "Announcements" && (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 p-8">
                     {/* Icon */}
                     <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center shadow-lg">
                       <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                       </svg>
                     </div>
                     
                     {/* Title */}
                     <h3 className="text-xl font-semibold text-white mb-2">Team Announcements</h3>
                     
                     {/* Description */}
                     <p className="text-slate-400 max-w-md">
                       Share important updates and announcements with your team members.
                     </p>
                     
                     {/* Button */}
                     <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-lg">
                       New Announcement
                     </Button>
                   </div>
                )}

                {tab === "Tasks" && (
                  <div className="space-y-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Task Board</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm">Placeholder – Kanban with assistance workflow next.</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}