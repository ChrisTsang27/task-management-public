"use client";

import React, { useState, useEffect, Suspense, lazy } from "react";

import { useSearchParams, useRouter } from "next/navigation";

import { LoadingCard } from "@/components/ui/LoadingSpinner";
import supabase from "@/lib/supabaseBrowserClient";

// Lazy load heavy components
const RdxSelect = lazy(() => import("@/components/ui/RdxSelect"));

type AuthMode = "signin" | "signup";
type AuthMethod = "magic-link" | "password";

function SignInContent() {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-slate-800/80 via-slate-700/80 to-slate-800/80 border border-slate-600/50 shadow-2xl backdrop-blur-xl text-slate-100 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          {/* App Logo/Title */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 mb-4 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Task Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">Welcome back! Please sign in to continue</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-slate-800/60 border border-slate-600/50 mb-6 p-1">
            <button
               onClick={() => switchMode("signin")}
               className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                 mode === "signin"
                   ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                   : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
               }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In
              </div>
            </button>
            <button
               onClick={() => switchMode("signup")}
               className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                 mode === "signup"
                   ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg"
                   : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
               }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Sign Up
              </div>
            </button>
          </div>

          {/* Authentication Method Toggle */}
          <div className="flex rounded-lg bg-slate-800/40 border border-slate-600/30 mb-6 p-1">
            <button
               onClick={() => setAuthMethod("password")}
               className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                 authMethod === "password"
                   ? "bg-slate-700 text-slate-100 shadow-md"
                   : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
               }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Password
              </div>
            </button>
            <button
               onClick={() => setAuthMethod("magic-link")}
               className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                 authMethod === "magic-link"
                   ? "bg-slate-700 text-slate-100 shadow-md"
                   : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
               }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Magic Link
              </div>
            </button>
          </div>
        
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-slate-400">
              {authMethod === "magic-link"
                ? mode === "signin"
                  ? "Enter your email to receive a magic sign-in link."
                  : "Fill in your details to create a new account via email link."
                : mode === "signin"
                  ? "Enter your email and password to sign in."
                  : "Fill in your details to create a new account."}
            </p>
          </div>

          {/* Email Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-slate-800/50 border border-slate-600/50 pl-10 pr-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Password Fields */}
          {authMethod === "password" && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl bg-slate-800/50 border border-slate-600/50 pl-10 pr-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>
              {mode === "signup" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full rounded-xl bg-slate-800/50 border border-slate-600/50 pl-10 pr-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-slate-100 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Signup Fields */}
          {mode === "signup" && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl bg-slate-800/50 border border-slate-600/50 pl-10 pr-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Job Title
                  </label>
                  <Suspense fallback={<LoadingCard />}>
                    <RdxSelect
                      value={title}
                      onValueChange={setTitle}
                      ariaLabel="Select your job title"
                      placeholder="Select your title"
                      items={titleOptions.map(option => ({ value: option, label: option }))}
                      className="w-full"
                    />
                  </Suspense>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Department
                  </label>
                  <Suspense fallback={<LoadingCard />}>
                    <RdxSelect
                      value={department}
                      onValueChange={setDepartment}
                      ariaLabel="Select your department"
                      placeholder="Select your department"
                      items={departmentOptions.map(option => ({ value: option, label: option }))}
                      className="w-full"
                    />
                  </Suspense>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location
                  </label>
                  <Suspense fallback={<LoadingCard />}>
                    <RdxSelect
                      value={location}
                      onValueChange={setLocation}
                      ariaLabel="Select your location"
                      placeholder="Select your location"
                      items={locationOptions.map(option => ({ value: option, label: option }))}
                      className="w-full"
                    />
                  </Suspense>
                </div>
              </div>
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
             className="w-full rounded-xl px-6 py-4 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {authMethod === "magic-link" ? "Sending..." : "Processing..."}
                </>
              ) : (
                <>
                  {authMethod === "magic-link" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {authMethod === "magic-link"
                    ? mode === "signin" ? "Send Magic Link" : "Create Account"
                    : mode === "signin" ? "Sign In" : "Create Account"
                  }
                </>
              )}
            </div>
          </button>

          {status && (
            <div
              className={`mt-4 text-sm px-4 py-3 rounded-xl border backdrop-blur-sm ${
                status.ok
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {status.ok ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {status.msg}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}