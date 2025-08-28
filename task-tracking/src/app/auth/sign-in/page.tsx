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
    } catch (e: any) {
      setStatus({ ok: false, msg: e?.message || "Failed to send magic link" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 bg-white/5 ring-1 ring-white/10 text-slate-100">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>
        <p className="text-sm text-slate-300 mb-4">Enter your email to receive a magic sign-in link.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30 mb-3"
        />
        <button
          onClick={sendMagicLink}
          disabled={loading || !email.trim()}
          className="w-full rounded-lg px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-600 text-white font-semibold ring-1 ring-cyan-300 hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send magic link"}
        </button>
        {status && (
          <div
            className={`mt-3 text-sm px-3 py-2 rounded-lg ring-1 ${
              status.ok
                ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
                : "bg-rose-500/15 text-rose-200 ring-rose-500/30"
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}