"use client";

import { lazy, Suspense } from "react";

import { LoadingCard } from "@/components/ui/LoadingSpinner";

const Dashboard = lazy(() => import("@/components/Dashboard"));

export default function Home() {
  return (
    <Suspense fallback={<LoadingCard title="Loading Dashboard..." description="Please wait while we load your dashboard" />}>
      <Dashboard />
    </Suspense>
  );
}