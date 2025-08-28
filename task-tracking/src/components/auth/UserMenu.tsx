"use client";

import Link from "next/link";
import { useSupabaseProfile } from "@/lib/useSupabaseProfile";

export default function UserMenu() {
  const enabled = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "1";
  if (!enabled) return null;

  const { user, role, loading } = useSupabaseProfile(true);

  return (
    <div className="fixed top-3 right-3 z-[1200]">
      <div className="rounded-xl bg-black/50 ring-1 ring-white/15 backdrop-blur px-3 py-2 text-xs text-slate-100 flex items-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        {loading ? (
          <span className="opacity-80">Auth…</span>
        ) : user ? (
          <>
            <span className="max-w-[40ch] truncate" title={user.email ?? ""}>
              {user.email}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/30">
              {String(role || "member")}
            </span>
            <Link
              href="/auth/sign-out"
              className="ml-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 ring-1 ring-white/10"
            >
              Sign out
            </Link>
          </>
        ) : (
          <>
            <span className="opacity-80">Signed out</span>
            <Link
              href="/auth/sign-in"
              className="ml-1 px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}