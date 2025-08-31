"use client";

import React, { useCallback, useMemo, useState } from "react";
import RichTextEditor from "@/components/email/RichTextEditor";
import RdxSelect from "@/components/ui/RdxSelect";

type User = {
  id: string;
  name: string;
  email: string;
  occupation: "member" | "manager" | "lead" | "admin" | string;
  department: "sales" | "marketing" | "it" | "hr" | "ops" | string;
  location:
    | "SGI Coopers Plains"
    | "SGI Brendale"
    | "SGI Gold Coast"
    | "SGI Toowoomba"
    | "SGI Melbourne"
    | "KAYO Coopers Plains"
    | string;
};

const USERS: User[] = [
  { id: "u1", name: "Alice Johnson", email: "alice@corp.com", occupation: "member", department: "sales", location: "SGI Coopers Plains" },
  { id: "u2", name: "Bob Smith", email: "bob@corp.com", occupation: "manager", department: "marketing", location: "SGI Brendale" },
  { id: "u3", name: "Carol Lee", email: "carol@corp.com", occupation: "lead", department: "it", location: "SGI Gold Coast" },
  { id: "u4", name: "David Kim", email: "david@corp.com", occupation: "member", department: "it", location: "SGI Toowoomba" },
  { id: "u5", name: "Eva Green", email: "eva@corp.com", occupation: "member", department: "hr", location: "SGI Melbourne" },
  { id: "u6", name: "Frank Moore", email: "frank@corp.com", occupation: "manager", department: "ops", location: "KAYO Coopers Plains" },
  { id: "u7", name: "Grace Liu", email: "grace@corp.com", occupation: "admin", department: "it", location: "SGI Coopers Plains" },
  { id: "u8", name: "Henry Zhao", email: "henry@corp.com", occupation: "member", department: "marketing", location: "SGI Gold Coast" },
];

const badgeClx = "px-2 py-0.5 rounded-full text-xs";
const occColor: Record<string, string> = {
  member: "bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/50",
  manager: "bg-gradient-to-r from-amber-600 to-amber-700 text-white border border-amber-500/50",
  lead: "bg-gradient-to-r from-purple-600 to-purple-700 text-white border border-purple-500/50",
  admin: "bg-gradient-to-r from-rose-600 to-rose-700 text-white border border-rose-500/50",
};
const deptColor: Record<string, string> = {
  sales: "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-500/50",
  marketing: "bg-gradient-to-r from-pink-600 to-pink-700 text-white border border-pink-500/50",
  it: "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white border border-cyan-500/50",
  hr: "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border border-indigo-500/50",
  ops: "bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 text-white border border-fuchsia-500/50",
};
const locColor = "bg-gradient-to-r from-slate-600 to-slate-700 text-white border border-slate-500/50";

export default function EmailComposer() {
  const [recipients, setRecipients] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [contentHTML, setContentHTML] = useState("");

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);

  // Filters
  const [occFilter, setOccFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [locFilter, setLocFilter] = useState<string>("all");
  const [userQuery, setUserQuery] = useState("");

  const recipientIds = useMemo(() => new Set(recipients.map((r) => r.id)), [recipients]);

  // Available users = USERS - recipients - not matching filters
  const availableUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return USERS.filter((u) => {
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
  }, [recipientIds, occFilter, deptFilter, locFilter, userQuery]);

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
  };
  const onDropRecipient = (e: React.DragEvent) => {
    e.preventDefault();
    const userId = e.dataTransfer.getData("text/plain");
    const user = USERS.find((u) => u.id === userId);
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

  const occupations = useMemo(() => ["member", "manager", "lead", "admin"], []);
  const departments = useMemo(() => ["sales", "marketing", "it", "hr", "ops"], []);
  const locations = useMemo(
    () => [
      "SGI Coopers Plains",
      "SGI Brendale",
      "SGI Gold Coast",
      "SGI Toowoomba",
      "SGI Melbourne",
      "KAYO Coopers Plains",
    ],
    []
  );

  return (
    <div className="min-h-[calc(100vh-6rem)] p-4 md:p-6 text-white">
      <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto space-y-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Email Composer</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Users Pool */}
          <section className="rounded-2xl p-6 bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500/60 shadow-2xl ring-1 ring-slate-400/20">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="font-medium">Users Pool</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setOccFilter("all"); setDeptFilter("all"); setLocFilter("all");
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-400 hover:to-slate-500 border border-slate-400/60 transition-all shadow-md hover:shadow-lg ring-1 ring-slate-300/10"
                >
                  Clear filters
                </button>
                <button
                  onClick={addAll}
                  className="text-sm px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-blue-500/60 transition-all shadow-md hover:shadow-lg ring-1 ring-blue-400/20 text-white font-medium"
                >
                  Add all
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-3">
              <input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all"
                placeholder="Search users (name, email, role, department, location)"
                aria-label="Search users"
              />
            </div>
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <RdxSelect
                value={occFilter}
                onValueChange={setOccFilter}
                ariaLabel="Filter by role"
                placeholder="All roles"
                items={[{ value: 'all', label: 'All roles' }, ...occupations.map(o => ({ value: o, label: o }))]}
              />
              <RdxSelect
                value={deptFilter}
                onValueChange={setDeptFilter}
                ariaLabel="Filter by department"
                placeholder="All departments"
                items={[{ value: 'all', label: 'All departments' }, ...departments.map(d => ({ value: d, label: d }))]}
              />
              <RdxSelect
                value={locFilter}
                onValueChange={setLocFilter}
                ariaLabel="Filter by location"
                placeholder="All locations"
                items={[{ value: 'all', label: 'All locations' }, ...locations.map(l => ({ value: l, label: l }))]}
              />
            </div>

            <div className="space-y-3 max-h-[58vh] overflow-auto pr-1">
              {availableUsers.length === 0 && (
                <div className="text-sm text-slate-300">No users match filters (or already in recipients).</div>
              )}
              {availableUsers.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl p-4 bg-gradient-to-br from-slate-500 to-slate-700 border border-slate-400/60 hover:from-slate-400 hover:to-slate-600 transition-all flex flex-col gap-2 shadow-lg hover:shadow-xl ring-1 ring-slate-300/10 hover:ring-slate-300/20 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={(e) => onUserDragStart(e, u.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-slate-300">{u.email}</div>
                    </div>
                    <button
                      onClick={() => addRecipient(u)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-500/60 hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg ring-1 ring-emerald-400/20 font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`${badgeClx} ${occColor[u.occupation] || occColor.member}`}>{u.occupation}</span>
                    <span className={`${badgeClx} ${deptColor[u.department] || deptColor.it}`}>{u.department}</span>
                    <span className={`${badgeClx} ${locColor}`}>{u.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recipients */}
          <section
            className="rounded-2xl p-6 bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500/60 shadow-2xl ring-1 ring-slate-400/20"
            onDrop={onDropRecipient}
            onDragOver={onDragOverRecipient}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Recipients</h2>
              {recipients.length > 0 && (
                <button
                  onClick={removeAll}
                  className="text-sm px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 border border-rose-500/60 transition-all shadow-md hover:shadow-lg ring-1 ring-rose-400/20 text-white font-medium"
                >
                  Remove all
                </button>
              )}
            </div>
            <div
              className={`min-h-[260px] rounded-xl p-4 border transition-all ${
                recipients.length === 0
                  ? "border-dashed border-slate-400/60 bg-gradient-to-br from-slate-500 to-slate-700 text-slate-300 flex items-center justify-center shadow-inner ring-1 ring-slate-400/10"
                  : "border-slate-400/60 bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner ring-1 ring-slate-400/10"
              }`}
            >
              {recipients.length === 0 ? (
                <div>Drag users here or use Add buttons</div>
              ) : (
                <div className="space-y-2" onDrop={onDropRecipient} onDragOver={onDragOverRecipient}>
                  {recipients.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-gradient-to-r from-slate-400 to-slate-600 border border-slate-300/60 px-4 py-3 shadow-md hover:shadow-lg transition-all ring-1 ring-slate-300/10"
                    >
                      <div>
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-slate-300">{u.email}</div>
                      </div>
                      <button
                          onClick={() => removeRecipient(u.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 text-white border border-rose-500/60 hover:from-rose-500 hover:to-rose-600 transition-all shadow-md hover:shadow-lg ring-1 ring-rose-400/20 font-medium"
                        >
                          Remove
                        </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
        
        {/* Email Section - Outside the grid */}
        <section className="rounded-2xl p-6 bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500/60 shadow-2xl ring-1 ring-slate-400/20 space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all"
                placeholder="Internal title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all"
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Content</label>
              <RichTextEditor value={contentHTML} onChange={setContentHTML} placeholder="Write rich content (text, images, links, lists, tables, emojis)..." />
              <p className="text-xs text-slate-400">Timestamp is added on send.</p>
            </div>
            <button
              disabled={sending || recipients.length === 0 || !subject.trim() || contentIsEmpty}
              onClick={handleSend}
              className="w-full rounded-lg px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white text-glow drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] font-semibold ring-1 ring-cyan-300 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-[0_10px_30px_-12px_rgba(16,185,129,.45)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : `Send to ${recipients.length} recipient(s)`}
            </button>
            {status && (
              <div
                className={`text-sm mt-1 px-3 py-2 rounded-lg border ${
                  status.ok
                    ? "bg-gradient-to-r from-emerald-700 to-emerald-800 text-emerald-200 border-emerald-500/50"
                    : "bg-gradient-to-r from-rose-700 to-rose-800 text-rose-200 border-rose-500/50"
                }`}
              >
                {status.msg}
              </div>
            )}
        </section>
      </div>
    </div>
  );
}