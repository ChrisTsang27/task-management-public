import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SupabaseAuthInit from "@/components/auth/SupabaseAuthInit";
import ErrorBoundary from "@/components/ErrorBoundary";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <ErrorBoundary>
          <SupabaseAuthInit />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
