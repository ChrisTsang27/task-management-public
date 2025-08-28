"use client";

import React, { useEffect, useMemo, useState } from "react";
import EmailComposer from "@/components/email/EmailComposer";

type Role = "admin" | "user";
type Tab = "Email" | "Announcements" | "Tasks";

export default function Dashboard() {
  const [role, setRole] = useState<Role>("admin");

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

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-900 to-black text-slate-100">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 ring-1 ring-white/10">
        <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Task Tracking Dashboard</div>
          {/* Role switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">Role:</span>
            <div className="inline-flex rounded-lg bg-white/10 ring-1 ring-white/10 p-0.5">
              <button
                onClick={() => setRole("user")}
                className={`px-2 py-1 text-xs rounded-md ${role === "user" ? "bg-white/20" : "hover:bg-white/10"}`}
              >
                User
              </button>
              <button
                onClick={() => setRole("admin")}
                className={`px-2 py-1 text-xs rounded-md ${role === "admin" ? "bg-white/20" : "hover:bg-white/10"}`}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-4">
            <section className="rounded-2xl p-4 backdrop-blur-xl bg-white/5 ring-1 ring-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
              <h2 className="text-sm font-medium mb-2">Overview</h2>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>Role: <span className="text-slate-200">{role}</span></li>
                <li>Tabs: <span className="text-slate-200">{availableTabs.join(" • ")}</span></li>
              </ul>
            </section>

            <section className="rounded-2xl p-4 backdrop-blur-xl bg-white/5 ring-1 ring-white/10">
              <h2 className="text-sm font-medium mb-2">Navigation</h2>
              <nav className="flex flex-col gap-2">
                {availableTabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`text-left px-3 py-2 rounded-lg text-sm ring-1 transition ${
                      tab === t ? "bg-white/20 ring-white/30" : "bg-white/10 hover:bg-white/15 ring-white/10"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            </section>

            <section className="rounded-2xl p-4 backdrop-blur-xl bg-white/5 ring-1 ring-white/10">
              <h2 className="text-sm font-medium mb-2">Quick Actions</h2>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30">
                  New Task
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/30 hover:bg-sky-500/30">
                  New Announcement
                </button>
              </div>
            </section>
          </aside>

          {/* Main content */}
          <section className="lg:col-span-9">
            <div className="rounded-2xl p-4 backdrop-blur-xl bg-white/5 ring-1 ring-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">{tab}</h2>
                {/* Top tab buttons for small screens */}
                <div className="flex lg:hidden flex-wrap gap-2">
                  {availableTabs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm ring-1 transition ${
                        tab === t ? "bg-white/20 ring-white/30" : "bg-white/10 hover:bg-white/15 ring-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {tab === "Email" && role === "admin" && <EmailComposer />}

              {tab === "Announcements" && (
                <div className="space-y-3">
                  <div className="rounded-2xl p-6 backdrop-blur-xl bg-white/5 ring-1 ring-white/10">
                    <h3 className="text-lg font-medium mb-2">Announcements</h3>
                    <p className="text-slate-300 text-sm">Placeholder – CRUD implementation next.</p>
                  </div>
                </div>
              )}

              {tab === "Tasks" && (
                <div className="space-y-3">
                  <div className="rounded-2xl p-6 backdrop-blur-xl bg-white/5 ring-1 ring-white/10">
                    <h3 className="text-lg font-medium mb-2">Task Board</h3>
                    <p className="text-slate-300 text-sm">Placeholder – Kanban with assistance workflow next.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}