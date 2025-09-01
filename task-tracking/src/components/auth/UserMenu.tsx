"use client";

import Link from "next/link";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";

export default function UserMenu() {
  const enabled = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "1";
  const { user, profile, loading } = useSupabaseProfile();
  const role = profile?.role;
  
  if (!enabled) return null;

  return (
    <div className="fixed top-3 right-3 z-[1200]">
      <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-xl px-3 py-2 text-xs text-slate-100 flex items-center gap-2">
        {loading ? (
          <span className="opacity-80">Auth…</span>
        ) : user ? (
          <>
            <span className="max-w-[40ch] truncate" title={user.email ?? ""}>
              {user.email}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-700 text-white border border-cyan-500/50">
              {String(role || "member")}
            </span>
            <Link
              href="/auth/sign-out"
              className="ml-1 px-2 py-1 rounded-md bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border border-slate-500/50 transition-all"
            >
              Sign out
            </Link>
          </>
        ) : (
          <>
            <span className="opacity-80">Signed out</span>
            <Link
              href="/auth/sign-in"
              className="ml-1 px-2 py-1 rounded-md bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-500/50 hover:from-emerald-500 hover:to-emerald-600 transition-all"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}