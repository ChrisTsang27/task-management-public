"use client";

import React, { useCallback, useMemo, useReducer, useEffect, lazy, Suspense } from "react";

import { LoadingCard } from "@/components/ui/LoadingSpinner";

// Lazy load heavy components
const RichTextEditor = lazy(() => import("@/components/email/RichTextEditor"));
const EmailTemplate = lazy(() => import("@/components/email/EmailTemplate"));
// UnifiedTemplateCustomizer removed - now only used in EmailTemplate
import RdxSelect from "@/components/ui/RdxSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import supabase from "@/lib/supabaseBrowserClient";


type User = {
  id: string;
  name: string;
  email: string;
  occupation: string;
  department: string;
  location: string;
};



// Title/Role colors - glass effect like Admin Panel button with unique color palette
const titleColor: Record<string, string> = {
  "Manager": "bg-gradient-to-r from-red-600/20 to-red-500/20 border-red-500/50 text-red-200 backdrop-blur-xl border",
  "Senior Officer": "bg-gradient-to-r from-indigo-600/20 to-indigo-500/20 border-indigo-500/50 text-indigo-200 backdrop-blur-xl border", 
  "Team Leader": "bg-gradient-to-r from-purple-600/20 to-purple-500/20 border-purple-500/50 text-purple-200 backdrop-blur-xl border",
  "Officer": "bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 border-emerald-500/50 text-emerald-200 backdrop-blur-xl border",
  "Assistant": "bg-gradient-to-r from-fuchsia-600/20 to-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200 backdrop-blur-xl border",
  "Coordinator": "bg-gradient-to-r from-teal-600/20 to-teal-500/20 border-teal-500/50 text-teal-200 backdrop-blur-xl border",
  "Specialist": "bg-gradient-to-r from-cyan-600/20 to-cyan-500/20 border-cyan-500/50 text-cyan-200 backdrop-blur-xl border",
  "Analyst": "bg-gradient-to-r from-lime-600/20 to-lime-500/20 border-lime-500/50 text-lime-200 backdrop-blur-xl border",
  "Executive": "bg-gradient-to-r from-amber-600/20 to-amber-500/20 border-amber-500/50 text-amber-200 backdrop-blur-xl border",
  "Other": "bg-gradient-to-r from-stone-600/20 to-stone-500/20 border-stone-500/50 text-stone-200 backdrop-blur-xl border",
  // Legacy role mappings for backward compatibility
  "member": "bg-gradient-to-r from-blue-600/20 to-blue-500/20 border-blue-500/50 text-blue-200 backdrop-blur-xl border",
  "manager": "bg-gradient-to-r from-red-600/20 to-red-500/20 border-red-500/50 text-red-200 backdrop-blur-xl border",
  "lead": "bg-gradient-to-r from-purple-600/20 to-purple-500/20 border-purple-500/50 text-purple-200 backdrop-blur-xl border",
  "admin": "bg-gradient-to-r from-slate-600/20 to-slate-500/20 border-slate-500/50 text-slate-200 backdrop-blur-xl border",
};

// Department colors - glass effect like Admin Panel button with unique color palette
const deptColor: Record<string, string> = {
  "Sales": "bg-gradient-to-r from-green-600/20 to-green-500/20 border-green-500/50 text-green-200 backdrop-blur-xl border",
  "Marketing": "bg-gradient-to-r from-pink-600/20 to-pink-500/20 border-pink-500/50 text-pink-200 backdrop-blur-xl border",
  "Administration": "bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border-yellow-500/50 text-yellow-200 backdrop-blur-xl border",
  "HR": "bg-gradient-to-r from-rose-600/20 to-rose-500/20 border-rose-500/50 text-rose-200 backdrop-blur-xl border",
  "IT": "bg-gradient-to-r from-violet-600/20 to-violet-500/20 border-violet-500/50 text-violet-200 backdrop-blur-xl border",
  "Finance": "bg-gradient-to-r from-sky-600/20 to-sky-500/20 border-sky-500/50 text-sky-200 backdrop-blur-xl border",
  "Operations": "bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-orange-500/50 text-orange-200 backdrop-blur-xl border",
  "Customer Service": "bg-gradient-to-r from-zinc-600/20 to-zinc-500/20 border-zinc-500/50 text-zinc-200 backdrop-blur-xl border",
  // Legacy mappings for backward compatibility
  "sales": "bg-gradient-to-r from-green-600/20 to-green-500/20 border-green-500/50 text-green-200 backdrop-blur-xl border",
  "marketing": "bg-gradient-to-r from-pink-600/20 to-pink-500/20 border-pink-500/50 text-pink-200 backdrop-blur-xl border",
  "it": "bg-gradient-to-r from-violet-600/20 to-violet-500/20 border-violet-500/50 text-violet-200 backdrop-blur-xl border",
  "hr": "bg-gradient-to-r from-rose-600/20 to-rose-500/20 border-rose-500/50 text-rose-200 backdrop-blur-xl border",
  "ops": "bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-orange-500/50 text-orange-200 backdrop-blur-xl border",
  "General": "bg-gradient-to-r from-gray-600/20 to-gray-500/20 border-gray-500/50 text-gray-200 backdrop-blur-xl border",
};

// Location colors - glass effect like Admin Panel button with unique color palette
const locColor: Record<string, string> = {
  "SGI Gold Coast": "bg-gradient-to-r from-amber-500/20 to-amber-400/20 border-amber-400/50 text-amber-200 backdrop-blur-xl border",
  "SGI Melbourne": "bg-gradient-to-r from-purple-700/20 to-purple-600/20 border-purple-600/50 text-purple-200 backdrop-blur-xl border",
  "KAYO Coopers Plains": "bg-gradient-to-r from-red-700/20 to-red-600/20 border-red-600/50 text-red-200 backdrop-blur-xl border",
  "KAYO Underwood": "bg-gradient-to-r from-blue-700/20 to-blue-600/20 border-blue-600/50 text-blue-200 backdrop-blur-xl border",
  "KAYO Brendale": "bg-gradient-to-r from-emerald-700/20 to-emerald-600/20 border-emerald-600/50 text-emerald-200 backdrop-blur-xl border",
  "KAYO Yatala": "bg-gradient-to-r from-indigo-700/20 to-indigo-600/20 border-indigo-600/50 text-indigo-200 backdrop-blur-xl border",
  // Additional SGI locations with unique colors
  "SGI Coopers Plains": "bg-gradient-to-r from-orange-700/20 to-orange-600/20 border-orange-600/50 text-orange-200 backdrop-blur-xl border",
  "SGI Brendale": "bg-gradient-to-r from-teal-700/20 to-teal-600/20 border-teal-600/50 text-teal-200 backdrop-blur-xl border",
  "SGI Toowoomba": "bg-gradient-to-r from-fuchsia-700/20 to-fuchsia-600/20 border-fuchsia-600/50 text-fuchsia-200 backdrop-blur-xl border",
  "Office": "bg-gradient-to-r from-neutral-600/20 to-neutral-500/20 border-neutral-500/50 text-neutral-200 backdrop-blur-xl border",
};

// State management with useReducer for better performance
type EmailState = {
  users: User[];
  loading: boolean;
  recipients: User[];
  title: string;
  subject: string;
  contentHTML: string;
  sending: boolean;
  status: null | { ok: boolean; msg: string };
  isDragging: boolean;
  occFilter: string;
  deptFilter: string;
  locFilter: string;
  userQuery: string;
  appliedTemplate: string | null;
};

type EmailAction = 
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_RECIPIENT'; payload: User }
  | { type: 'REMOVE_RECIPIENT'; payload: string }
  | { type: 'SET_RECIPIENTS'; payload: User[] }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_SUBJECT'; payload: string }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_SENDING'; payload: boolean }
  | { type: 'SET_STATUS'; payload: null | { ok: boolean; msg: string } }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_OCC_FILTER'; payload: string }
  | { type: 'SET_DEPT_FILTER'; payload: string }
  | { type: 'SET_LOC_FILTER'; payload: string }
  | { type: 'SET_USER_QUERY'; payload: string }
  | { type: 'SET_APPLIED_TEMPLATE'; payload: string | null }
  | { type: 'RESET_FILTERS' };

const initialState: EmailState = {
  users: [],
  loading: true,
  recipients: [],
  title: "",
  subject: "",
  contentHTML: "",
  sending: false,
  status: null,
  isDragging: false,
  occFilter: "all",
  deptFilter: "all",
  locFilter: "all",
  userQuery: "",
  appliedTemplate: null
};

function emailReducer(state: EmailState, action: EmailAction): EmailState {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_RECIPIENT':
      return {
        ...state,
        recipients: state.recipients.find(u => u.id === action.payload.id) 
          ? state.recipients 
          : [...state.recipients, action.payload]
      };
    case 'REMOVE_RECIPIENT':
      return {
        ...state,
        recipients: state.recipients.filter(u => u.id !== action.payload)
      };
    case 'SET_RECIPIENTS':
      return { ...state, recipients: action.payload };
    case 'SET_TITLE':
      return { ...state, title: action.payload };
    case 'SET_SUBJECT':
      return { ...state, subject: action.payload };
    case 'SET_CONTENT':
      return { ...state, contentHTML: action.payload };
    case 'SET_SENDING':
      return { ...state, sending: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.payload };
    case 'SET_OCC_FILTER':
      return { ...state, occFilter: action.payload };
    case 'SET_DEPT_FILTER':
      return { ...state, deptFilter: action.payload };
    case 'SET_LOC_FILTER':
      return { ...state, locFilter: action.payload };
    case 'SET_USER_QUERY':
      return { ...state, userQuery: action.payload };
    case 'SET_APPLIED_TEMPLATE':
      return { ...state, appliedTemplate: action.payload };
    case 'RESET_FILTERS':
      return { 
        ...state, 
        occFilter: "all", 
        deptFilter: "all", 
        locFilter: "all", 
        userQuery: "" 
      };
    default:
      return state;
  }
}

const EmailComposer = React.memo(function EmailComposer() {
  const [state, dispatch] = useReducer(emailReducer, initialState);
  const {
    users,
    loading,
    recipients,
    title,
    subject,
    contentHTML,
    sending,
    status,
    isDragging,
    occFilter,
    deptFilter,
    locFilter,
    userQuery,
    appliedTemplate
  } = state;
  
  // Template customizer state - removed as we now use unified customization



  // Fetch users from database with cleanup
  useEffect(() => {
    let isMounted = true;
    
    const fetchUsers = async () => {
      try {
        // First check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (isMounted) {
            dispatch({ type: 'SET_USERS', payload: [] });
            dispatch({ type: 'SET_LOADING', payload: false });
          }
          return;
        }
        
        // Fetch users with real emails from our API endpoint
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        
        const { users } = await response.json();
        if (isMounted) {
          dispatch({ type: 'SET_USERS', payload: users || [] });
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        // Fallback to empty array if fetch fails
        if (isMounted) {
          dispatch({ type: 'SET_USERS', payload: [] });
        }
      } finally {
        if (isMounted) {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    fetchUsers();
    
    return () => {
      isMounted = false;
    };
  }, []);

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
    dispatch({ type: 'ADD_RECIPIENT', payload: user });
  }, []);

  const removeRecipient = useCallback((userId: string) => {
    dispatch({ type: 'REMOVE_RECIPIENT', payload: userId });
  }, []);

  const addAll = useCallback(() => {
    const merged: Record<string, User> = {};
    [...recipients, ...availableUsers].forEach((u) => (merged[u.id] = u));
    dispatch({ type: 'SET_RECIPIENTS', payload: Object.values(merged) });
  }, [recipients, availableUsers]);

  const removeAll = useCallback(() => {
    dispatch({ type: 'SET_RECIPIENTS', payload: [] });
  }, []);

  // Drag & Drop
  const onUserDragStart = useCallback((e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData("text/plain", userId);
    e.dataTransfer.effectAllowed = "copyMove";
    dispatch({ type: 'SET_DRAGGING', payload: true });
  }, []);
  
  const onUserDragEnd = useCallback(() => {
    dispatch({ type: 'SET_DRAGGING', payload: false });
  }, []);
  
  const onDropRecipient = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const userId = e.dataTransfer.getData("text/plain");
    const user = users.find((u) => u.id === userId);
    if (user && !recipientIds.has(user.id)) addRecipient(user);
  }, [users, recipientIds, addRecipient]);
  
  const onDragOverRecipient = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const contentIsEmpty = useMemo(() => {
     if (!contentHTML) return true;
     
     // Remove HTML tags and check for actual text content
     const textContent = contentHTML.replace(/<[^>]+>/g, "").trim();
     
     // If there's text content, it's not empty
     if (textContent) return false;
     
     // If no text but has meaningful HTML structure (like templates), consider it not empty
     // Check for common template elements that indicate content structure
     const hasTemplateStructure = /(<div|<p|<table|<img|<h[1-6])/i.test(contentHTML);
     
     return !hasTemplateStructure;
   }, [contentHTML]);

  const contentTooLong = useMemo(() => {
    return contentHTML.length > 900000; // Warn at 90% of limit
  }, [contentHTML]);

  const handleSend = useCallback(async () => {
    if (recipients.length === 0 || !subject.trim() || contentIsEmpty || contentTooLong) return;
    
    dispatch({ type: 'SET_SENDING', payload: true });
    dispatch({ type: 'SET_STATUS', payload: null });
    
    try {
      const payload = {
        recipients: recipients.map(r => ({ name: r.name, email: r.email })),
        title,
        subject,
        content: contentHTML,
        timestamp: new Date().toISOString(),
      };
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      // Show detailed validation errors if available
      let errorMessage = data.message || (res.ok ? "Sent" : "Failed");
      if (!res.ok && data.issues) {
        const fieldErrors = data.issues.fieldErrors;
        if (fieldErrors) {
          const errors = [];
          if (fieldErrors.subject) errors.push(`Subject: ${fieldErrors.subject.join(', ')}`);
          if (fieldErrors.content) errors.push(`Content: ${fieldErrors.content.join(', ')}`);
          if (fieldErrors.recipients) errors.push(`Recipients: ${fieldErrors.recipients.join(', ')}`);
          if (fieldErrors.title) errors.push(`Title: ${fieldErrors.title.join(', ')}`);
          if (errors.length > 0) {
            errorMessage = `Validation errors: ${errors.join('; ')}`;
          }
        }
      }
      
      dispatch({ type: 'SET_STATUS', payload: { ok: res.ok, msg: errorMessage } });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Send failed";
      dispatch({ type: 'SET_STATUS', payload: { ok: false, msg: errorMessage } });
    } finally {
      dispatch({ type: 'SET_SENDING', payload: false });
    }
  }, [title, subject, contentHTML, recipients, contentIsEmpty, contentTooLong]);

  // Helper function to replace placeholders with actual data
  const replacePlaceholders = useCallback((html: string) => {
    let processedHtml = html;
    
    // Replace common placeholders with recipient data if available
    if (recipients.length > 0) {
      const firstRecipient = recipients[0];
      processedHtml = processedHtml
        .replace(/\[Your Name\]/g, firstRecipient.name || '[Your Name]')
        .replace(/\[Your Position\]/g, firstRecipient.occupation || '[Your Position]')
        .replace(/\[Your Department\]/g, firstRecipient.department || '[Your Department]')
        .replace(/\[Your Location\]/g, firstRecipient.location || '[Your Location]');
    }
    
    // Replace company placeholders
    processedHtml = processedHtml
      .replace(/\[Your Company\]/g, 'Stonegate Industries')
      .replace(/Your Company/g, 'Stonegate Industries')
      .replace(/\[email@company\.com\]/g, 'info@stonegateindustries.com')
      .replace(/\[website\.com\]/g, 'stonegateindustries.com')
      .replace(/\[phone\]/g, '+61 7 3000 0000');
    
    return processedHtml;
  }, [recipients]);

  const handleApplyTemplate = useCallback((templateHtml: string, templateName?: string) => {
    const processedTemplate = replacePlaceholders(templateHtml);
    
    // With simplified approach, templates always replace content since they contain the full structure
    // Preserve the CONTENT HERE placeholder so the RichTextEditor can handle it appropriately
    // This allows the editor to show a prompt for user input where the content should go
    
    dispatch({ type: 'SET_CONTENT', payload: processedTemplate });
    
    // Track applied template
    dispatch({ type: 'SET_APPLIED_TEMPLATE', payload: templateName || 'Unknown Template' });
  }, [replacePlaceholders]);

  // Removed handleCustomizerUpdate and handleCustomizerClose as we now use unified customization

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
    <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto space-y-4 text-white bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 shadow-xl p-4 sm:p-6 rounded-xl overflow-visible">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Email Composer</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Users Pool */}
          <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-600/50 shadow-xl overflow-visible relative z-50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Users Pool</CardTitle>
                <div className="flex items-center gap-2">

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => dispatch({ type: 'RESET_FILTERS' })}
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
                      className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                    >
                      Add all
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[99999]" side="top" sideOffset={8}>
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
                onChange={(e) => dispatch({ type: 'SET_USER_QUERY', payload: e.target.value })}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all text-slate-100 cursor-text"
                placeholder="Search users (name, email, title, department, location)"
                aria-label="Search users"
              />
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
              <RdxSelect
                value={occFilter}
                onValueChange={(value) => dispatch({ type: 'SET_OCC_FILTER', payload: value })}
                ariaLabel="Filter by title"
                placeholder="All titles"
                items={[{ value: 'all', label: 'All titles' }, ...titleOptions.map(t => ({ value: t, label: t }))]}
              />
              <RdxSelect
                value={deptFilter}
                onValueChange={(value) => dispatch({ type: 'SET_DEPT_FILTER', payload: value })}
                ariaLabel="Filter by department"
                placeholder="All departments"
                items={[{ value: 'all', label: 'All departments' }, ...departmentOptions.map(d => ({ value: d, label: d }))]}
              />
              <RdxSelect
                value={locFilter}
                onValueChange={(value) => dispatch({ type: 'SET_LOC_FILTER', payload: value })}
                ariaLabel="Filter by location"
                placeholder="All locations"
                items={[{ value: 'all', label: 'All locations' }, ...locationOptions.map(l => ({ value: l, label: l }))]}
              />
            </div>

            <div className="max-h-[58vh] overflow-auto pr-1 custom-scrollbar">
              {loading && (
                <div className="text-sm text-slate-300 flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  Loading users...
                </div>
              )}
              {!loading && availableUsers.length === 0 && (
                <div className="text-sm text-slate-300 mb-3">No users match filters (or already in recipients).</div>
              )}
              {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {availableUsers.map((u) => (
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
                        <Button
                          onClick={() => addRecipient(u)}
                          size="sm"
                          variant="outline"
                          className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm border-0"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add
                        </Button>
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
              )}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={removeAll}
                        disabled={recipients.length === 0}
                        className={`text-sm px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border border-rose-500/60 transition-all shadow-md hover:shadow-lg ring-1 ring-rose-400/20 text-white font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          recipients.length === 0 ? 'hidden' : ''
                        }`}
                      >
                        Remove All
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove all recipients</p>
                    </TooltipContent>
                  </Tooltip>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" onDrop={onDropRecipient} onDragOver={onDragOverRecipient}>
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
        
        {/* Email Templates Section */}
        <Suspense fallback={<LoadingCard />}>
          <EmailTemplate 
            onApplyTemplate={handleApplyTemplate}
            currentContent={contentHTML}
          />
        </Suspense>
        
        {/* Email Section - Outside the grid */}
        <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-600/50 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Compose Email</CardTitle>
                <CardDescription>Create and send your email message</CardDescription>
              </div>
              {appliedTemplate && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-300">Template: {appliedTemplate}</span>
                  <button
                    onClick={() => dispatch({ type: 'SET_APPLIED_TEMPLATE', payload: null })}
                    className="text-green-300 hover:text-green-200 ml-1"
                    title="Clear template"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Title</label>
              <input

                value={title}
                onChange={(e) => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all text-slate-100 cursor-text"
                placeholder="Internal title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Subject</label>
              <input

                value={subject}
                onChange={(e) => dispatch({ type: 'SET_SUBJECT', payload: e.target.value })}
                className="w-full rounded-lg bg-slate-900/80 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all text-slate-100 cursor-text"
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200">Content</label>
                {appliedTemplate && (
                  <button
                    onClick={() => {
                      const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
                      if (previewWindow) {
                        // Get the current template HTML and replace CONTENT HERE with editor content
                        let previewContent = contentHTML;
                        
                        // If we have a template applied, we need to reconstruct the full email
                        // by finding the template structure and showing the CONTENT HERE placeholder
                        // This helps users understand where their content will appear in the template
                        if (appliedTemplate && contentHTML.includes('CONTENT HERE')) {
                          // Keep the CONTENT HERE placeholder for preview to show structure
                          previewContent = contentHTML;
                        } else if (appliedTemplate) {
                          // Legacy content - show as is
                          previewContent = contentHTML;
                        }
                        
                        previewWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Email Preview - ${appliedTemplate}</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
                                .preview-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                                .preview-header { background: #1e40af; color: white; padding: 10px 20px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
                              </style>
                            </head>
                            <body>
                              <div class="preview-container">
                                <div class="preview-header">
                                  <h2 style="margin: 0;">📧 Email Preview: ${appliedTemplate}</h2>
                                  <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Subject: ${subject || 'No subject'}</p>
                                </div>
                                ${previewContent}
                              </div>
                            </body>
                          </html>
                        `);
                        previewWindow.document.close();
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 hover:bg-blue-600/30 transition-all"
                  >
                    📧 Preview Email
                  </button>
                )}
              </div>
              <Suspense fallback={<LoadingCard title="Loading Editor..." description="Please wait while we load the rich text editor" />}>
                <RichTextEditor value={contentHTML} onChange={(value) => dispatch({ type: 'SET_CONTENT', payload: value })} placeholder="Write rich content (text, images, links, lists, tables, emojis)..." />
              </Suspense>
              <p className="text-xs text-slate-400">Timestamp is added on send. {appliedTemplate && `Template "${appliedTemplate}" is active.`}</p>
            </div>
            {contentTooLong && (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-2">
                ⚠️ Content is too long ({contentHTML.length.toLocaleString()} characters). Please reduce content size.
              </div>
            )}
            <button
              disabled={sending || recipients.length === 0 || !subject.trim() || contentIsEmpty || contentTooLong}
              onClick={handleSend}
              className="w-full rounded-lg px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
        
        {/* Template Customizer Modal removed - now using unified customization in template selection */}
    </div>
    </TooltipProvider>
  );
});

export default EmailComposer;