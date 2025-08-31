"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabaseBrowserClient";

type Profile = {
  id: string;
  full_name: string | null;
  role: "admin" | "manager" | "lead" | "member" | string | null;
} | null;

export function useSupabaseProfile(enabled = true) {
  const [user, setUser] = useState<import("@supabase/supabase-js").User | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const u = sessionData?.session?.user ?? null;
      if (!active) return;
      setUser(u);

      if (u) {
        // Try read profile (no insert here; profiles table RLS insert isn't open)
        const { data, error: err } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", u.id)
          .maybeSingle();

        if (!active) return;

        if (err) {
          setError(err.message);
          setProfile(null);
        } else {
          setProfile(data ?? null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Re-run on changes
      load();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  const role = profile?.role ?? "member";

  return { user, profile, role, loading, error };
}