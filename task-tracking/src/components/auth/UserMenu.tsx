"use client";

import Link from "next/link";

import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";

export default function UserMenu() {
  const enabled = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "1";
  const { user, profile, loading } = useSupabaseProfile();
  const role = profile?.role;
  
  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 z-[1200]">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-600/40 shadow-2xl px-4 py-3 text-sm text-slate-100 flex items-center gap-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="opacity-80">Authenticating...</span>
          </div>
        ) : user ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {(user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="max-w-[35ch] truncate font-medium" title={user.email ?? ""}>
                  {user.email}
                </span>
                <span className="text-xs text-slate-400">
                  Online
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-400/30 shadow-md">
              {String(role || "member")}
            </span>
            <Link
              href="/auth/sign-out"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border border-slate-500/50 transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              Sign out
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="opacity-80">Signed out</span>
            </div>
            <Link
              href="/auth/sign-in"
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-500/50 hover:from-emerald-500 hover:to-emerald-600 transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}