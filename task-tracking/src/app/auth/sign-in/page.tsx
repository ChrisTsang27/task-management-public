"use client";

import React, { useState } from "react";
import supabase from "@/lib/supabaseBrowserClient";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Configure this in Supabase Auth → URL configuration
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
      setStatus({ ok: true, msg: "Check your email for the sign-in link." });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to send magic link";
      setStatus({ ok: false, msg: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-xl text-slate-100">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>
        <p className="text-sm text-slate-300 mb-4">Enter your email to receive a magic sign-in link.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all mb-3"
        />
        <button
          onClick={sendMagicLink}
          disabled={loading || !email.trim()}
          className="w-full rounded-lg px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white font-semibold border border-cyan-400/50 hover:brightness-110 disabled:opacity-60 transition-all"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
        {status && (
          <div
            className={`mt-3 text-sm px-3 py-2 rounded-lg border ${
              status.ok
                ? "bg-gradient-to-r from-emerald-700 to-emerald-800 text-emerald-200 border-emerald-500/50"
                : "bg-gradient-to-r from-rose-700 to-rose-800 text-rose-200 border-rose-500/50"
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}