"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import RichTextEditor from "@/components/email/RichTextEditor";
import RdxSelect from "@/components/ui/RdxSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import supabase from "@/lib/supabaseBrowserClient";


type User = {
  id: string;
  name: string;
  email: string;
  occupation: string;
  department: string;
  location: string;
};



// Title/Role colors - maximum contrast across color spectrum
   const titleColor: Record<string, string> = {
     "Manager": "bg-gradient-to-r from-red-600/60 to-red-700/60 text-white shadow-lg border border-white/20",
     "Senior Officer": "bg-gradient-to-r from-blue-600/60 to-blue-700/60 text-white shadow-lg border border-white/20", 
     "Team Leader": "bg-gradient-to-r from-purple-600/60 to-purple-700/60 text-white shadow-lg border border-white/20",
     "Officer": "bg-gradient-to-r from-green-600/60 to-green-700/60 text-white shadow-lg border border-white/20",
     "Assistant": "bg-gradient-to-r from-yellow-500/60 to-yellow-600/60 text-white shadow-lg border border-white/20",
     "Coordinator": "bg-gradient-to-r from-pink-600/60 to-pink-700/60 text-white shadow-lg border border-white/20",
     "Specialist": "bg-gradient-to-r from-indigo-600/60 to-indigo-700/60 text-white shadow-lg border border-white/20",
     "Analyst": "bg-gradient-to-r from-teal-600/60 to-teal-700/60 text-white shadow-lg border border-white/20",
     "Executive": "bg-gradient-to-r from-orange-600/60 to-orange-700/60 text-white shadow-lg border border-white/20",
     "Other": "bg-gradient-to-r from-gray-600/60 to-gray-700/60 text-white shadow-lg border border-white/20",
     // Legacy role mappings for backward compatibility
     "member": "bg-gradient-to-r from-green-600/60 to-green-700/60 text-white shadow-lg border border-white/20",
     "manager": "bg-gradient-to-r from-red-600/60 to-red-700/60 text-white shadow-lg border border-white/20",
     "lead": "bg-gradient-to-r from-purple-600/60 to-purple-700/60 text-white shadow-lg border border-white/20",
     "admin": "bg-gradient-to-r from-orange-600/60 to-orange-700/60 text-white shadow-lg border border-white/20",
   };

// Department colors - completely distinct color families
   const deptColor: Record<string, string> = {
     "Sales": "bg-gradient-to-r from-emerald-600/60 to-emerald-700/60 text-white shadow-lg border border-white/20",
     "Marketing": "bg-gradient-to-r from-violet-600/60 to-violet-700/60 text-white shadow-lg border border-white/20",
     "Administration": "bg-gradient-to-r from-amber-600/60 to-amber-700/60 text-white shadow-lg border border-white/20",
     "HR": "bg-gradient-to-r from-rose-600/60 to-rose-700/60 text-white shadow-lg border border-white/20",
     "IT": "bg-gradient-to-r from-cyan-600/60 to-cyan-700/60 text-white shadow-lg border border-white/20",
     "Finance": "bg-gradient-to-r from-lime-600/60 to-lime-700/60 text-white shadow-lg border border-white/20",
     "Operations": "bg-gradient-to-r from-fuchsia-600/60 to-fuchsia-700/60 text-white shadow-lg border border-white/20",
     "Customer Service": "bg-gradient-to-r from-sky-600/60 to-sky-700/60 text-white shadow-lg border border-white/20",
     // Legacy mappings for backward compatibility
     "sales": "bg-gradient-to-r from-emerald-600/60 to-emerald-700/60 text-white shadow-lg border border-white/20",
     "marketing": "bg-gradient-to-r from-violet-600/60 to-violet-700/60 text-white shadow-lg border border-white/20",
     "it": "bg-gradient-to-r from-cyan-600/60 to-cyan-700/60 text-white shadow-lg border border-white/20",
     "hr": "bg-gradient-to-r from-rose-600/60 to-rose-700/60 text-white shadow-lg border border-white/20",
     "ops": "bg-gradient-to-r from-fuchsia-600/60 to-fuchsia-700/60 text-white shadow-lg border border-white/20",
     "General": "bg-gradient-to-r from-slate-600/60 to-slate-700/60 text-white shadow-lg border border-white/20",
   };

// Location colors - extreme contrast using opposite spectrum colors
   const locColor: Record<string, string> = {
     "SGI Gold Coast": "bg-gradient-to-r from-yellow-600/60 to-yellow-700/60 text-white shadow-lg border border-white/20",
     "SGI Melbourne": "bg-gradient-to-r from-indigo-600/60 to-indigo-700/60 text-white shadow-lg border border-white/20",
     "KAYO Coopers Plains": "bg-gradient-to-r from-red-600/60 to-red-700/60 text-white shadow-lg border border-white/20",
     "KAYO Underwood": "bg-gradient-to-r from-teal-600/60 to-teal-700/60 text-white shadow-lg border border-white/20",
     "KAYO Brendale": "bg-gradient-to-r from-purple-600/60 to-purple-700/60 text-white shadow-lg border border-white/20",
     "KAYO Yatala": "bg-gradient-to-r from-green-600/60 to-green-700/60 text-white shadow-lg border border-white/20",
     // Additional SGI locations with unique colors
     "SGI Coopers Plains": "bg-gradient-to-r from-orange-600/60 to-orange-700/60 text-white shadow-lg border border-white/20",
     "SGI Brendale": "bg-gradient-to-r from-blue-600/60 to-blue-700/60 text-white shadow-lg border border-white/20",
     "SGI Toowoomba": "bg-gradient-to-r from-pink-600/60 to-pink-700/60 text-white shadow-lg border border-white/20",
     "Office": "bg-gradient-to-r from-gray-600/60 to-gray-700/60 text-white shadow-lg border border-white/20",
   };

export default function EmailComposer() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [contentHTML, setContentHTML] = useState("");

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [isDragging, setIsDragging] = useState(false);



  // Fetch users from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // First check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setUsers([]);
          setLoading(false);
          return;
        }
        
        // Fetch users with real emails from our API endpoint
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const { users } = await response.json();
        setUsers(users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        // Fallback to empty array if fetch fails
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filters
  const [occFilter, setOccFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [locFilter, setLocFilter] = useState<string>("all");
  const [userQuery, setUserQuery] = useState("");

  const recipientIds = useMemo(() => new Set(recipients.map((r) => r.id)), [recipients]);

  // Available users = users - recipients - not matching filters
  const availableUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (recipientIds.has(u.id)) return false;
      if (occFilter !== "all" && String(u.occupation) !== occFilter) return false;
      if (deptFilter !== "all" && String(u.department) !== deptFilter) return false;
      if (locFilter !== "all" && String(u.location) !== locFilter) return false;
      if (q) {
        const hay =
          `${u.name} ${u.email} ${String(u.occupation)} ${String(u.department)} ${String(u.location)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, recipientIds, occFilter, deptFilter, locFilter, userQuery]);

  const addRecipient = useCallback((user: User) => {
    setRecipients((prev) => (prev.find((u) => u.id === user.id) ? prev : [...prev, user]));
  }, []);

  const removeRecipient = useCallback((userId: string) => {
    setRecipients((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const addAll = () => {
    setRecipients((prev) => {
      const merged: Record<string, User> = {};
      [...prev, ...availableUsers].forEach((u) => (merged[u.id] = u));
      return Object.values(merged);
    });
  };

  const removeAll = () => setRecipients([]);

  // Drag & Drop
  const onUserDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData("text/plain", userId);
    e.dataTransfer.effectAllowed = "copyMove";
    setIsDragging(true);
  };
  
  const onUserDragEnd = () => {
    setIsDragging(false);
  };
  const onDropRecipient = (e: React.DragEvent) => {
    e.preventDefault();
    const userId = e.dataTransfer.getData("text/plain");
    const user = users.find((u) => u.id === userId);
    if (user && !recipientIds.has(user.id)) addRecipient(user);
  };
  const onDragOverRecipient = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const contentIsEmpty = !contentHTML || !contentHTML.replace(/<[^>]+>/g, "").trim();

  const handleSend = async () => {
    setSending(true);
    setStatus(null);
    try {
      const payload = {
        title,
        subject,
        content: contentHTML,
        recipients: recipients.map((r) => ({ name: r.name, email: r.email })),
        timestamp: new Date().toISOString(),
      };
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setStatus({ ok: res.ok, msg: data.message || (res.ok ? "Sent" : "Failed") });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Send failed";
      setStatus({ ok: false, msg: errorMessage });
    } finally {
      setSending(false);
    }
  };

  // Complete lists from signup form
  const titleOptions = useMemo(() => [
    "Manager",
    "Senior Officer", 
    "Team Leader",
    "Officer",
    "Assistant",
    "Coordinator",
    "Specialist",
    "Analyst",
    "Executive",
    "Other"
  ], []);
  
  const departmentOptions = useMemo(() => [
    "Sales",
    "Marketing", 
    "Administration",
    "HR",
    "IT",
    "Finance",
    "Operations",
    "Customer Service"
  ], []);
  
  const locationOptions = useMemo(() => [
    "SGI Coopers Plains",
    "SGI Brendale",
    "SGI Gold Coast", 
    "SGI Toowoomba",
    "SGI Melbourne",
    "KAYO Coopers Plains"
  ], []);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto space-y-4 text-white bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 shadow-xl p-6 rounded-xl">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Email Composer</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Users Pool */}
          <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-600/50 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Users Pool</CardTitle>
                <div className="flex items-center gap-2">

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setOccFilter("all"); setDeptFilter("all"); setLocFilter("all"); setUserQuery("");
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-400 hover:to-slate-500 border border-slate-400/60 transition-all shadow-md hover:shadow-lg ring-1 ring-slate-300/10"
                    >
                      Clear filters
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear all filters and search</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={addAll}
                      className="text-sm px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-blue-500/60 transition-all shadow-md hover:shadow-lg ring-1 ring-blue-400/20 text-white font-medium"
                    >
                      Add all
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add all filtered users to recipients</p>
                  </TooltipContent>
                </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

            {/* Search */}
            <div className="mb-3">
              <input

                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all text-slate-100 cursor-text"
                placeholder="Search users (name, email, title, department, location)"
                aria-label="Search users"
              />
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <RdxSelect
                value={occFilter}
                onValueChange={setOccFilter}
                ariaLabel="Filter by title"
                placeholder="All titles"
                items={[{ value: 'all', label: 'All titles' }, ...titleOptions.map(t => ({ value: t, label: t }))]}
              />
              <RdxSelect
                value={deptFilter}
                onValueChange={setDeptFilter}
                ariaLabel="Filter by department"
                placeholder="All departments"
                items={[{ value: 'all', label: 'All departments' }, ...departmentOptions.map(d => ({ value: d, label: d }))]}
              />
              <RdxSelect
                value={locFilter}
                onValueChange={setLocFilter}
                ariaLabel="Filter by location"
                placeholder="All locations"
                items={[{ value: 'all', label: 'All locations' }, ...locationOptions.map(l => ({ value: l, label: l }))]}
              />
            </div>

            <div className="space-y-3 max-h-[58vh] overflow-auto pr-1 custom-scrollbar">
              {loading && (
                <div className="text-sm text-slate-300 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Loading users...
                </div>
              )}
              {!loading && availableUsers.length === 0 && (
                <div className="text-sm text-slate-300">No users match filters (or already in recipients).</div>
              )}
              {!loading && availableUsers.map((u) => (
                <div
                  key={u.id}
    
                  className={`rounded-xl p-4 bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-400/60 hover:from-slate-500/90 hover:to-slate-600/90 transition-all flex flex-col gap-2 shadow-lg hover:shadow-xl ring-1 ring-slate-300/10 hover:ring-slate-300/20 cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
                  draggable
                  onDragStart={(e) => onUserDragStart(e, u.id)}
                  onDragEnd={onUserDragEnd}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-slate-300">{u.email}</div>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => addRecipient(u)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/60 hover:from-blue-500 hover:to-blue-600 transition-all shadow-md hover:shadow-lg ring-1 ring-blue-400/20 font-medium cursor-pointer"
                        >
                          Add
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add {u.name} to recipients</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${titleColor[u.occupation] || titleColor.Officer}`}>{u.occupation}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${deptColor[u.department] || deptColor.IT}`}>{u.department}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${locColor[u.location] || locColor.Office}`}>{u.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recipients */}
          <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-600/50 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Recipients ({recipients.length})</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          availableUsers.forEach(user => addRecipient(user));
                        }}
                        className="text-sm px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/60 transition-all shadow-md hover:shadow-lg ring-1 ring-emerald-400/20 text-white font-medium cursor-pointer"
                      >
                        Add All
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add all filtered users to recipients</p>
                    </TooltipContent>
                  </Tooltip>
                  {recipients.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={removeAll}
                          className="text-sm px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border border-rose-500/60 transition-all shadow-md hover:shadow-lg ring-1 ring-rose-400/20 text-white font-medium cursor-pointer"
                        >
                          Remove All
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove all recipients</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent
              onDrop={onDropRecipient}
              onDragOver={onDragOverRecipient}
            >
              <div
                className={`min-h-[260px] rounded-xl p-4 border transition-all ${
                  recipients.length === 0
                    ? "border-dashed border-slate-500/50 bg-slate-700/30 text-slate-300 flex items-center justify-center"
                    : "border-slate-600/50 bg-slate-700/20"
                }`}
              >
                {recipients.length === 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center py-12 text-slate-400">
                        <div className="text-lg mb-2">📧</div>
                        <div className="text-sm">Drag users here or use Add buttons</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Drop zone for email recipients - drag users from the left panel or use Add buttons</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="grid grid-cols-2 gap-3" onDrop={onDropRecipient} onDragOver={onDragOverRecipient}>
                    {recipients.map((u) => (
                      <div
                        key={u.id}
                        className="group rounded-lg p-3 bg-blue-900/80 border border-blue-700/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2">
                              <div className="text-sm font-medium text-white truncate">{u.name}</div>
                              <div className="text-xs text-slate-300 truncate">{u.email}</div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${titleColor[u.occupation] || titleColor["Other"]}`}>
                                {u.occupation}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${deptColor[u.department] || deptColor["General"]}`}>
                                {u.department}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${locColor[u.location] || locColor["Office"]}`}>
                                {u.location}
                              </span>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => removeRecipient(u.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full hover:bg-red-500/20 text-red-400 hover:text-red-300 flex-shrink-0 cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove recipient</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
        
        {/* Email Section - Outside the grid */}
        <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-600/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Compose Email</CardTitle>
            <CardDescription>Create and send your email message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Title</label>
              <input

                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all text-slate-100 cursor-text"
                placeholder="Internal title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Subject</label>
              <input

                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all text-slate-100 cursor-text"
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Content</label>
              <RichTextEditor value={contentHTML} onChange={setContentHTML} placeholder="Write rich content (text, images, links, lists, tables, emojis)..." />
              <p className="text-xs text-slate-400">Timestamp is added on send.</p>
            </div>
            <button
              disabled={sending || recipients.length === 0 || !subject.trim() || contentIsEmpty}
              onClick={handleSend}
              className="w-full rounded-lg px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white text-glow drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] font-semibold ring-1 ring-cyan-300 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-[0_10px_30px_-12px_rgba(16,185,129,.45)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? "Sending..." : `Send to ${recipients.length} recipient(s)`}
            </button>
            {status && (
              <div
                className={`text-sm mt-1 px-3 py-2 rounded-lg border ${
                  status.ok
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
                }`}
              >
                {status.msg}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
    </TooltipProvider>
  );
}