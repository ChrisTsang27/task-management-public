"use client";

import React, { useState } from "react";
import supabase from "@/lib/supabaseBrowserClient";

export default function SignOutPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-xl text-slate-100">
        <h1 className="text-xl font-semibold mb-4">Sign out</h1>
        <button
          onClick={onSignOut}
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white font-semibold border border-cyan-400/50 hover:brightness-110 disabled:opacity-60 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Signing out..." : "Sign out"}
        </button>
        {done && <p className="text-sm text-slate-300 mt-3">Signed out. You can close this tab.</p>}
      </div>
    </div>
  );
}