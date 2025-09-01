"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import supabase from "@/lib/supabaseBrowserClient";

type AuthMode = "signin" | "signup";
type AuthMethod = "magic-link" | "password";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get('redirectTo');
  const [mode, setMode] = useState<AuthMode>("signin");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");

  // Predefined options
  const titleOptions = [
    "Manager",
    "Senior Officer", 
    "Team Leader",
    "Officer",
    "Assistant",
    "Coordinator",
    "Specialist",
    "Analyst",
    "Executive",
    "Other"
  ];

  const departmentOptions = [
    "Sales",
    "Marketing", 
    "Administration",
    "HR",
    "IT",
    "Finance",
    "Operations",
    "Customer Service"
  ];

  const locationOptions = [
    "SGI Coopers Plains",
    "SGI Brendale",
    "SGI Gold Coast", 
    "SGI Toowoomba",
    "SGI Melbourne",
    "KAYO Coopers Plains"
  ];
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle authentication state changes and redirect
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Redirect to stylish dashboard or specified redirect URL
        const targetUrl = redirectTo || '/';
        router.push(targetUrl);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, redirectTo]);

  const handleAuth = async () => {
    if (!email.trim()) return;
    if (mode === "signup" && (!fullName.trim() || !title.trim() || !department.trim() || !location.trim())) {
      setStatus({ ok: false, msg: "Please fill in all fields." });
      return;
    }
    if (authMethod === "password" && !password.trim()) {
      setStatus({ ok: false, msg: "Please enter a password." });
      return;
    }
    if (mode === "signup" && authMethod === "password" && password !== confirmPassword) {
      setStatus({ ok: false, msg: "Passwords do not match." });
      return;
    }
    if (authMethod === "password" && password.length < 6) {
      setStatus({ ok: false, msg: "Password must be at least 6 characters long." });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      if (authMethod === "magic-link") {
        // Magic link authentication
        const redirectUrl = redirectTo 
          ? `${window.location.origin}${redirectTo}`
          : `${window.location.origin}/`;
        
        if (mode === "signup") {
          // Store signup data in localStorage temporarily
          const signupData = { fullName, title, department, location };
          localStorage.setItem('pendingSignupData', JSON.stringify(signupData));
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        
        if (error) throw error;
        
        const message = mode === "signup" 
          ? "Check your email for the sign-up link. Your profile will be created after verification."
          : "Check your email for the sign-in link.";
        setStatus({ ok: true, msg: message });
      } else {
        // Password authentication
        if (mode === "signup") {
          // Sign up with email and password
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                title,
                department,
                location,
              },
            },
          });
          
          if (error) throw error;
          
          if (data.user && !data.session) {
            setStatus({ ok: true, msg: "Check your email to confirm your account." });
          } else {
            setStatus({ ok: true, msg: "Account created successfully! Redirecting..." });
            // Redirect will happen automatically via auth state change
          }
        } else {
          // Sign in with email and password
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) throw error;
          
          setStatus({ ok: true, msg: "Signed in successfully! Redirecting..." });
          // Redirect will happen automatically via auth state change
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to send magic link";
      setStatus({ ok: false, msg: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setTitle("");
    setDepartment("");
    setLocation("");
    setStatus(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 bg-card border border-border shadow-xl text-card-foreground">
        {/* Mode Toggle */}
        <div className="flex rounded-lg bg-muted border border-border mb-6">
          <button
            onClick={() => switchMode("signin")}
            className={`flex-1 px-4 py-2 rounded-l-lg font-medium transition-all ${
              mode === "signin"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 px-4 py-2 rounded-r-lg font-medium transition-all ${
              mode === "signup"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        <h1 className="text-xl font-semibold mb-4">
          {mode === "signin" ? "Sign in" : "Create Account"}
        </h1>
        
        {/* Authentication Method Toggle */}
        <div className="flex rounded-lg bg-muted border border-border mb-4">
          <button
            onClick={() => setAuthMethod("password")}
            className={`flex-1 px-3 py-2 rounded-l-lg text-sm font-medium transition-all ${
              authMethod === "password"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setAuthMethod("magic-link")}
            className={`flex-1 px-3 py-2 rounded-r-lg text-sm font-medium transition-all ${
              authMethod === "magic-link"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Magic Link
          </button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          {authMethod === "magic-link"
            ? mode === "signin"
              ? "Enter your email to receive a magic sign-in link."
              : "Fill in your details to create a new account via email link."
            : mode === "signin"
              ? "Enter your email and password to sign in."
              : "Fill in your details to create a new account."}
        </p>

        {/* Email Field */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg bg-input border border-border px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all mb-3 text-foreground placeholder:text-muted-foreground"
        />

        {/* Password Fields */}
        {authMethod === "password" && (
          <>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg bg-input border border-border px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all mb-3 text-foreground placeholder:text-muted-foreground"
            />
            {mode === "signup" && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full rounded-lg bg-input border border-border px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all mb-3 text-foreground placeholder:text-muted-foreground"
              />
            )}
          </>
        )}

        {/* Signup Fields */}
        {mode === "signup" && (
          <>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="w-full rounded-lg bg-input border border-border px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all mb-3 text-foreground placeholder:text-muted-foreground"
            />
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-3 py-2 pr-10 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all mb-3 text-foreground appearance-none cursor-pointer"
            >
              <option value="" disabled>Select your title</option>
              {titleOptions.map((titleOption) => (
                <option key={titleOption} value={titleOption}>
                  {titleOption}
                </option>
              ))}
            </select>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-3 py-2 pr-10 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all mb-3 text-foreground appearance-none cursor-pointer"
            >
              <option value="" disabled>Select your department</option>
              {departmentOptions.map((deptOption) => (
                <option key={deptOption} value={deptOption}>
                  {deptOption}
                </option>
              ))}
            </select>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg bg-input border border-border px-3 py-2 pr-10 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all mb-3 text-foreground appearance-none cursor-pointer"
            >
              <option value="" disabled>Select your location</option>
              {locationOptions.map((locOption) => (
                <option key={locOption} value={locOption}>
                  {locOption}
                </option>
              ))}
            </select>
          </>
        )}

        <button
          onClick={handleAuth}
          disabled={
            loading || 
            !email.trim() || 
            (authMethod === "password" && !password.trim()) ||
            (mode === "signup" && (!fullName.trim() || !title.trim() || !department.trim() || !location.trim())) ||
            (mode === "signup" && authMethod === "password" && password !== confirmPassword)
          }
          className="w-full rounded-lg px-4 py-2 bg-primary text-primary-foreground font-semibold border border-border hover:bg-primary/90 disabled:opacity-60 transition-all"
        >
          {loading 
            ? authMethod === "magic-link" ? "Sending..." : "Processing..."
            : authMethod === "magic-link"
              ? mode === "signin" ? "Send magic link" : "Create Account"
              : mode === "signin" ? "Sign In" : "Create Account"
          }
        </button>

        {status && (
          <div
            className={`mt-3 text-sm px-3 py-2 rounded-lg border ${
              status.ok
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}