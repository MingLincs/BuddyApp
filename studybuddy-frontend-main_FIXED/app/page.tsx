"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import LandingPage from "@/components/LandingPage";

export default function Page() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const isAuthed = !!data.session;
      setAuthed(isAuthed);
      setLoading(false);
      
      // Redirect to home if logged in
      if (isAuthed) {
        router.push("/home");
      }
    });
  }, [supabase, router]);

  // Show loading spinner while checking auth - prevents flash
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        
        <style jsx>{`
          .loading-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

  // Show landing page for non-authenticated users
  if (!authed) {
    return <LandingPage />;
  }

  // Redirecting (shouldn't see this)
  return null;
}
