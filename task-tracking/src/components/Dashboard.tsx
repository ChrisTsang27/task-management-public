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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-slate-800/95 to-slate-700/95 border-b border-slate-600/50 shadow-lg">
        <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Task Tracking Dashboard</div>
          {/* Role switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">Role:</span>
            <div className="inline-flex rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 border border-slate-500/50 p-0.5">
              <button
                onClick={() => setRole("user")}
                className={`px-2 py-1 text-xs rounded-md transition-all ${role === "user" ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "hover:bg-gradient-to-r hover:from-slate-500 hover:to-slate-600"}`}
              >
                User
              </button>
              <button
                onClick={() => setRole("admin")}
                className={`px-2 py-1 text-xs rounded-md transition-all ${role === "admin" ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md" : "hover:bg-gradient-to-r hover:from-slate-500 hover:to-slate-600"}`}
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
            <section className="rounded-2xl p-4 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-xl">
              <h2 className="text-sm font-medium mb-2">Overview</h2>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>Role: <span className="text-slate-200">{role}</span></li>
                <li>Tabs: <span className="text-slate-200">{availableTabs.join(" • ")}</span></li>
              </ul>
            </section>

            <section className="rounded-2xl p-4 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-lg">
              <h2 className="text-sm font-medium mb-2">Navigation</h2>
              <nav className="flex flex-col gap-2">
                {availableTabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      tab === t ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border border-blue-500/50" : "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border border-slate-500/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            </section>

            <section className="rounded-2xl p-4 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-lg">
              <h2 className="text-sm font-medium mb-2">Quick Actions</h2>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-500/50 hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-md">
                  New Task
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-sky-700 text-white border border-sky-500/50 hover:from-sky-500 hover:to-sky-600 transition-all shadow-md">
                  New Announcement
                </button>
              </div>
            </section>
          </aside>

          {/* Main content */}
          <section className="lg:col-span-9">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                {tab !== "Email" && <h2 className="text-xl font-medium">{tab}</h2>}
                {/* Top tab buttons for small screens */}
                <div className="flex lg:hidden flex-wrap gap-2">
                  {availableTabs.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        tab === t ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border border-blue-500/50" : "bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border border-slate-500/50"
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
                  <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-lg">
                    <h3 className="text-lg font-medium mb-2">Announcements</h3>
                    <p className="text-slate-300 text-sm">Placeholder – CRUD implementation next.</p>
                  </div>
                </div>
              )}

              {tab === "Tasks" && (
                <div className="space-y-3">
                  <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-lg">
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