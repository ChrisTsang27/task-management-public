import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SupabaseAuthInit from "@/components/auth/SupabaseAuthInit";
import ErrorBoundary from "@/components/ErrorBoundary";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "Task Management",
  description: "Task Management Dashboard - Manage tasks, announcements, and team communications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased dark`}
      >
        <ErrorBoundary>
          <SupabaseAuthInit />
          <ServiceWorkerRegistration />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
