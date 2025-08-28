"use client";

import React, { useCallback, useMemo, useState } from "react";
import RichTextEditor from "@/components/email/RichTextEditor";

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
  member: "bg-blue-500/20 text-blue-300 ring-1 ring-inset ring-blue-500/30",
  manager: "bg-amber-500/20 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  lead: "bg-purple-500/20 text-purple-300 ring-1 ring-inset ring-purple-500/30",
  admin: "bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-500/30",
};
const deptColor: Record<string, string> = {
  sales: "bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  marketing: "bg-pink-500/20 text-pink-300 ring-1 ring-inset ring-pink-500/30",
  it: "bg-cyan-500/20 text-cyan-300 ring-1 ring-inset ring-cyan-500/30",
  hr: "bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/30",
  ops: "bg-fuchsia-500/20 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-500/30",
};
const locColor = "bg-slate-500/20 text-slate-200 ring-1 ring-inset ring-slate-400/30";

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

  const recipientIds = useMemo(() => new Set(recipients.map((r) => r.id)), [recipients]);

  // Available users = USERS - recipients - not matching filters
  const availableUsers = useMemo(() => {
    return USERS.filter((u) => {
      if (recipientIds.has(u.id)) return false;
      if (occFilter !== "all" && String(u.occupation) !== occFilter) return false;
      if (deptFilter !== "all" && String(u.department) !== deptFilter) return false;
      if (locFilter !== "all" && String(u.location) !== locFilter) return false;
      return true;
    });
  }, [recipientIds, occFilter, deptFilter, locFilter]);

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
    } catch (err: any) {
      setStatus({ ok: false, msg: err?.message || "Send failed" });
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
    <div className="min-h-[calc(100vh-6rem)] p-4 md:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-900 to-black text-slate-100">
      <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto space-y-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Email Composer</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users Pool */}
          <section className="rounded-2xl p-4 backdrop-blur-xl bg-white/5 ring-1 ring-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="font-medium">Users Pool</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setOccFilter("all"); setDeptFilter("all"); setLocFilter("all");
                  }}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/10"
                >
                  Clear filters
                </button>
                <button
                  onClick={addAll}
                  className="text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/10"
                >
                  Add all
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <select
                className="rounded-lg bg-black/30 ring-1 ring-white/10 px-2 py-2 text-sm"
                value={occFilter}
                onChange={(e) => setOccFilter(e.target.value)}
              >
                <option value="all">All roles</option>
                {occupations.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <select
                className="rounded-lg bg-black/30 ring-1 ring-white/10 px-2 py-2 text-sm"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="all">All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                className="rounded-lg bg-black/30 ring-1 ring-white/10 px-2 py-2 text-sm"
                value={locFilter}
                onChange={(e) => setLocFilter(e.target.value)}
              >
                <option value="all">All locations</option>
                {locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3 max-h-[58vh] overflow-auto pr-1">
              {availableUsers.length === 0 && (
                <div className="text-sm text-slate-300">No users match filters (or already in recipients).</div>
              )}
              {availableUsers.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl p-3 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition flex flex-col gap-2"
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
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30"
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
            className="rounded-2xl p-4 backdrop-blur-xl bg-white/5 ring-1 ring-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            onDrop={onDropRecipient}
            onDragOver={onDragOverRecipient}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Recipients</h2>
              {recipients.length > 0 && (
                <button
                  onClick={removeAll}
                  className="text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 ring-1 ring-white/10"
                >
                  Remove all
                </button>
              )}
            </div>
            <div
              className={`min-h-[260px] rounded-xl p-3 ring-1 transition ${
                recipients.length === 0
                  ? "ring-dashed ring-white/20 bg-white/5 text-slate-400 flex items-center justify-center"
                  : "ring-white/10 bg-white/5"
              }`}
            >
              {recipients.length === 0 ? (
                <div>Drag users here or use Add buttons</div>
              ) : (
                <div className="space-y-2" onDrop={onDropRecipient} onDragOver={onDragOverRecipient}>
                  {recipients.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white/5 ring-1 ring-white/10 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-slate-300">{u.email}</div>
                      </div>
                      <button
                        onClick={() => removeRecipient(u.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Email */}
          <section className="rounded-2xl p-4 backdrop-blur-xl bg-white/5 ring-1 ring-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)] space-y-3">
            <h2 className="font-medium">Email</h2>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30"
                placeholder="Internal title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30"
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
              className="w-full rounded-lg px-4 py-2 bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {sending ? "Sending..." : `Send to ${recipients.length} recipient(s)`}
            </button>
            {status && (
              <div
                className={`text-sm mt-1 px-3 py-2 rounded-lg ring-1 ${
                  status.ok
                    ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
                    : "bg-rose-500/15 text-rose-200 ring-rose-500/30"
                }`}
              >
                {status.msg}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}