"use client";

import React, { useState } from "react";
import EmailComposer from "@/components/email/EmailComposer";

export default function Dashboard() {
  const tabs = ["Email", "Announcements", "Tasks"] as const;
  type Tab = typeof tabs[number];
  const [tab, setTab] = useState<Tab>("Email");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-900 to-black text-slate-100">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 ring-1 ring-white/10">
        <div className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Task Tracking Dashboard</div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map((t) => (
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
          </nav>
        </div>
      </header>

      <main className="w-full max-w-[1800px] 2xl:max-w-[2000px] mx-auto px-4 py-6">
        {tab === "Email" && <EmailComposer />}
        {tab === "Announcements" && (
          <div className="rounded-2xl p-6 backdrop-blur-xl bg-white/5 ring-1 ring-white/10">
            <h2 className="text-xl font-medium mb-2">Announcements</h2>
            <p className="text-slate-300 text-sm">Placeholder – CRUD implementation next.</p>
          </div>
        )}
        {tab === "Tasks" && (
          <div className="rounded-2xl p-6 backdrop-blur-xl bg-white/5 ring-1 ring-white/10">
            <h2 className="text-xl font-medium mb-2">Task Board</h2>
            <p className="text-slate-300 text-sm">Placeholder – Kanban with assistance requests next.</p>
          </div>
        )}
      </main>
    </div>
  );
}