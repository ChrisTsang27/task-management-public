"use client";

import { useEffect } from "react";
import supabase from "@/lib/supabaseBrowserClient";
import type { User } from "@supabase/supabase-js";

// Runs once on load to ensure the auth session from the URL hash is captured,
// then cleans the hash (?/#access_token=...) from the address bar.
// Also handles automatic profile creation for new signups.
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

    const createProfileIfNeeded = async (user: User) => {
      if (!user) return;

      // Check for pending signup data (magic link) or user metadata (password signup)
      const pendingDataStr = localStorage.getItem('pendingSignupData');
      let signupData = null;
      
      if (pendingDataStr) {
        // Magic link signup data from localStorage
        signupData = JSON.parse(pendingDataStr);
      } else if (user.user_metadata && user.user_metadata.full_name) {
        // Password signup data from user metadata
        signupData = {
          fullName: user.user_metadata.full_name,
          title: user.user_metadata.title,
          department: user.user_metadata.department,
          location: user.user_metadata.location
        };
      }

      try {
        // Check if profile already exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (existingProfile) {
          // Profile exists, clean up any pending signup data
          localStorage.removeItem('pendingSignupData');
          return;
        }
        
        if (!signupData) {
          // No signup data, create basic profile
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            full_name: user.email?.split('@')[0] || 'User',
            role: 'member'
          });
          
          if (insertError) {
            console.error('Profile creation failed (basic):', insertError);
            throw insertError;
          }
          return;
        }

        // Use signup data to create profile
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          full_name: signupData.fullName,
          title: signupData.title,
          role: 'member',
          department: signupData.department,
          location: signupData.location
        });
        
        if (insertError) {
          console.error('Profile creation failed (with data):', insertError);
          throw insertError;
        }

        // Clean up the temporary data if it came from localStorage
        if (pendingDataStr) {
          localStorage.removeItem('pendingSignupData');
        }
      } catch (error) {
        console.error('Error creating profile with client:', error);
        
        // Fallback: Use API endpoint with service role
        try {
          const response = await fetch('/api/profiles/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              userData: signupData || {
                full_name: user.email?.split('@')[0] || 'User'
              }
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('API profile creation failed:', errorData);
          } else {
            const result = await response.json();
            console.log('Profile created via API:', result);
          }
        } catch (apiError) {
          console.error('API fallback failed:', apiError);
        }
      }
    };

    // Touch the session; detectSessionInUrl=true will parse the hash automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        createProfileIfNeeded(session.user);
      }
      // Give the client a tick to persist the session before cleaning
      setTimeout(cleanupHash, 0);
    });

    // Also listen for auth state changes triggered by hash parsing
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cleaned) cleanupHash();
      
      // Handle profile creation on sign in and sign up
      if (event === 'SIGNED_IN' && session?.user) {
        createProfileIfNeeded(session.user);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}