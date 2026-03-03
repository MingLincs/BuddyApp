"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import Sidebar from "@/components/SideBar";
import Nav from "@/components/Nav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setLoading(false);
    });
    
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // CRITICAL: Show loading screen UNTIL auth is fully checked
  // This prevents ANY flash of content
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        
        <style jsx>{`
          .auth-loading {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            z-index: 9999;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show landing page layout for non-authenticated users on root
  if (!authed && pathname === "/") {
    return (
      <>
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
          <Nav />
        </header>
        <main>{children}</main>
        <footer className="border-t border-slate-200 bg-white/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} StudyBuddy</span>
            <span className="hidden sm:block">Transform your study materials with AI</span>
          </div>
        </footer>
      </>
    );
  }

  // Show sidebar layout for ALL OTHER PAGES
  return (
    <>
      <Sidebar />
      <div className="app-container">
        <main className="main-content">
          {children}
        </main>
      </div>

      <style jsx>{`
        .app-container {
          margin-left: 280px;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          background: #f8fafc;
        }

        .main-content {
          width: 100%;
          max-width: 1400px;
          padding: 32px 40px;
        }

        @media (max-width: 768px) {
          .app-container {
            margin-left: 0;
          }

          .main-content {
            padding: 80px 16px 24px;
          }
        }

        @media (min-width: 1920px) {
          .main-content {
            max-width: 1600px;
          }
        }
      `}</style>
    </>
  );
}
