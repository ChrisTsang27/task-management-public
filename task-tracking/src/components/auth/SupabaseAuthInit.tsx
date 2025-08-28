"use client";

import { useEffect } from "react";
import supabase from "@/lib/supabaseBrowserClient";

// Runs once on load to ensure the auth session from the URL hash is captured,
// then cleans the hash (?/#access_token=...) from the address bar.
export default function SupabaseAuthInit() {
  useEffect(() => {
    let cleaned = false;

    const cleanupHash = () => {
      if (typeof window === "undefined") return;
      // If URL contains Supabase auth params, remove them after session is processed
      const h = window.location.hash || "";
      if (/access_token=|refresh_token=|type=/.test(h)) {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, document.title, url.toString());
        cleaned = true;
      }
    };

    // Touch the session; detectSessionInUrl=true will parse the hash automatically
    supabase.auth.getSession().finally(() => {
      // Give the client a tick to persist the session before cleaning
      setTimeout(cleanupHash, 0);
    });

    // Also listen for auth state changes triggered by hash parsing
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (!cleaned) cleanupHash();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}