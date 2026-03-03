"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

/** Match GoTrue's "already registered" variants */
function isAlreadyRegisteredErr(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const maybeErr = err as {
    message?: string;
    code?: string;
    status?: number | string;
  };

  const msg = (maybeErr.message ?? "").toLowerCase();
  const code = (maybeErr.code ?? "").toLowerCase();
  const status = String(maybeErr.status ?? "");

  return (
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already exists") ||
    msg.includes("email exists") ||
    code === "user_already_exists" ||
    code === "email_exists" ||
    code === "email_address_already_exists" ||
    status === "422"
  );
}

function normalizeAuthError(err: unknown): string {
  const msg =
    err instanceof Error && typeof err.message === "string"
      ? err.message.toLowerCase()
      : "";

  if (isAlreadyRegisteredErr(err)) {
    return "This email is already registered. Please sign in (or continue with Google if you used it before).";
  }
  if (msg.includes("invalid login credentials")) {
    return "Invalid email or password. Try again — or use Google if you registered with it.";
  }
  if (msg.includes("rate limit")) {
    return "Too many attempts. Please try again in a minute.";
  }
  if (err instanceof Error) return err.message;
  return "Authentication failed. Please try again.";
}

export default function AuthGate() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [authed, setAuthed] = useState(false);

  const [open, setOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isMounted = useRef(true);
  const emailRef = useRef<HTMLInputElement | null>(null);

  // Session / auth state
  useEffect(() => {
    isMounted.current = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted.current) return;
      setAuthed(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!isMounted.current) return;
      setAuthed(!!session);
    });

    return () => {
      isMounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
  const openSignup = () => {
    setIsRegister(true);   // switch to signup mode
    setOpen(true);         // open modal
  };

  window.addEventListener("open-signup", openSignup);

  return () => {
    window.removeEventListener("open-signup", openSignup);
  };
}, []);

  // ESC to close, focus email input
  useEffect(() => {
    if (!open) return;

    const t = window.setTimeout(() => emailRef.current?.focus(), 50);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    if (typeof window !== "undefined") window.location.reload();
  }

  async function signInGoogle() {
    setBusy(true);
    setError(null);
    setInfo(null);

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/upload` : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setError(normalizeAuthError(error));
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (isRegister) {
        const redirectTo =
          typeof window !== "undefined" ? `${window.location.origin}/upload` : undefined;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });

        if (error) {
          if (isAlreadyRegisteredErr(error)) {
            setIsRegister(false);
            setError(
              "This email is already registered. Please sign in (or continue with Google if you used it before)."
            );
            return;
          }
          throw error;
        }

        // Supabase nuance: success but identities = [] → already exists
        const identities =
          (data?.user as { identities?: unknown[] } | null)?.identities ?? [];
        if (Array.isArray(identities) && identities.length === 0) {
          setIsRegister(false);
          setError(
            "This email is already registered. Please sign in (or continue with Google if you used it before)."
          );
          return;
        }

        // Email confirmation required
        if (!data.session) {
          setInfo("Check your email to confirm your account, then sign in.");
          return;
        }

        // Auto-signed in
        setOpen(false);
        if (typeof window !== "undefined") window.location.replace("/upload");
        return;
      }

      // Sign in
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(normalizeAuthError(error));
        return;
      }

      setOpen(false);
      if (typeof window !== "undefined") window.location.replace("/upload");
    } catch (err: unknown) {
      setError(normalizeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const title = isRegister ? "Create your StudyBuddy account" : "Welcome back";
  const subtitle = isRegister
    ? "Start studying smarter in seconds."
    : "Sign in to continue your learning journey.";

  return (
    <>
      {/* Fancy auth button */}
      {!authed ? (
        <button
          onClick={() => setOpen(true)}
          className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <span className="relative z-10">Sign in</span>
          <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        </button>
      ) : (
        <button
          onClick={signOut}
          disabled={busy}
          className="rounded-full border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-50"
        >
          {busy ? "…" : "Sign out"}
        </button>
      )}

      {/* Split-screen glass modal */}
      {open && (
        <div
  className="fixed inset-0 z-[1000] flex min-h-screen items-center justify-center"
  role="dialog"
  aria-modal="true"
  onMouseDown={() => setOpen(false)}
>
          {/* Background: gradient + blur + floating shapes */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/70 via-purple-950/70 to-sky-950/70" />
          <div className="absolute inset-0 bg-black/60" />

          {/* Floating shapes */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="sb-float sb-blob sb-blob-1" />
            <div className="sb-float sb-blob sb-blob-2" />
            <div className="sb-float sb-blob sb-blob-3" />
            <div className="sb-float sb-ring sb-ring-1" />
            <div className="sb-float sb-ring sb-ring-2" />
          </div>

          {/* Modal card */}
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-[0_30px_120px_-40px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* top-right close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-white/10 p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* LEFT: Brand panel */}
              <div className="relative hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/25 to-cyan-500/25" />
                <div className="absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_20%_20%,black,transparent_55%)] bg-white" />

                <div className="relative flex h-full flex-col justify-between p-10">
                  <div className="sb-pop">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.65)]" />
                      AI study tools • flashcards • concept maps
                    </div>

                    <h3 className="mt-6 text-4xl font-extrabold leading-tight text-white">
                      Study smarter,
                      <span className="block bg-gradient-to-r from-cyan-200 via-white to-indigo-200 bg-clip-text text-transparent">
                        not harder.
                      </span>
                    </h3>

                    <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
                      Upload notes → get clean summaries, flashcards, and concept maps that actually help.
                      Keep everything organized by class and crush your next exam.
                    </p>

                    <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <div className="text-xs font-semibold text-white/70">Fast</div>
                        <div className="mt-1 text-sm font-bold text-white">1-click study set</div>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <div className="text-xs font-semibold text-white/70">Clean</div>
                        <div className="mt-1 text-sm font-bold text-white">Readable outputs</div>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <div className="text-xs font-semibold text-white/70">Smart</div>
                        <div className="mt-1 text-sm font-bold text-white">Key concept focus</div>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <div className="text-xs font-semibold text-white/70">Organized</div>
                        <div className="mt-1 text-sm font-bold text-white">By class + folders</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 text-xs text-white/50">
                    Tip: If you signed up with Google before, use “Continue with Google”.
                  </div>
                </div>
              </div>

              {/* RIGHT: Auth panel */}
              <div className="relative">
                <div className="absolute inset-0 bg-white/5" />

                <div className="relative p-6 sm:p-10">
                  {/* Header */}
                  <div className="sb-pop text-center">
                    <h2 className="text-2xl font-extrabold tracking-tight text-white">
                      <span className="bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                        {title}
                      </span>
                    </h2>
                    <p className="mt-2 text-sm text-white/70">{subtitle}</p>
                  </div>

                  {/* Tabs */}
                  <div className="sb-pop mt-6 flex justify-center">
                    <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegister(false);
                          setError(null);
                          setInfo(null);
                        }}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-semibold transition",
                          !isRegister
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-white/80 hover:text-white",
                        ].join(" ")}
                      >
                        Log in
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegister(true);
                          setError(null);
                          setInfo(null);
                        }}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-semibold transition",
                          isRegister
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-white/80 hover:text-white",
                        ].join(" ")}
                      >
                        Sign up
                      </button>
                    </div>
                  </div>

                  {/* Social */}
                  {!isRegister && (
                    <div className="sb-pop mt-6">
                      <button
                        onClick={signInGoogle}
                        disabled={busy}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                          <path
                            d="M12 10.2v3.6h5.1c-.22 1.3-.92 2.4-1.97 3.15l3.19 2.48C20.5 17.9 21.5 15.2 21.5 12c0-.9-.1-1.8-.3-2.6H12z"
                            fill="#4285F4"
                          />
                          <path
                            d="M6.54 13.79a5.99 5.99 0 010-3.58L3.17 7.58a9.01 9.01 0 000 8.84l3.37-2.63z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 21c2.43 0 4.47-.8 5.96-2.17l-3.19-2.48c-.88.6-2.01.96-2.77.96-2.13 0-3.94-1.44-4.58-3.38l-3.4 2.64C5.51 19.98 8.55 21 12 21z"
                            fill="#34A853"
                          />
                          <path
                            d="M12 3c1.49 0 2.84.51 3.9 1.52l2.93-2.93C16.46.98 14.42 0 12 0 8.55 0 5.51 2.02 4.02 5.02l3.4 2.64C8.06 5.72 9.87 4.28 12 4.28z"
                            fill="#EA4335"
                          />
                        </svg>
                        Continue with Google
                      </button>

                      <div className="mt-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/15" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
                          or with email
                        </span>
                        <div className="h-px flex-1 bg-white/15" />
                      </div>
                    </div>
                  )}

                  {/* Alerts */}
                  {info && (
                    <div className="sb-pop mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
                      {info}
                    </div>
                  )}
                  {error && (
                    <div className="sb-pop mt-5 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
                      {error}
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={onSubmit} className="sb-pop mt-5 space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-white/70">
                        Email
                      </label>
                      <input
                        ref={emailRef}
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-sm outline-none transition focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-white/70">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 shadow-sm outline-none transition focus:border-indigo-300/50 focus:ring-4 focus:ring-indigo-300/20"
                      />
                      <div className="mt-2 text-[12px] text-white/45">
                        {isRegister ? "Use 8+ characters for a stronger password." : " "}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-4 py-3 text-sm font-extrabold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="relative z-10">
                        {busy
                          ? isRegister
                            ? "Creating account..."
                            : "Signing in..."
                          : isRegister
                          ? "Create account"
                          : "Log in"}
                      </span>
                      <span className="absolute inset-0 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 bg-white/20" />
                    </button>
                  </form>

                  {/* Footer toggle */}
                  <div className="sb-pop mt-5 text-center text-sm text-white/70">
                    {isRegister ? (
                      <>
                        Already have an account?{" "}
                        <button
                          onClick={() => {
                            setIsRegister(false);
                            setError(null);
                            setInfo(null);
                          }}
                          className="font-semibold text-cyan-200 hover:text-white hover:underline"
                          type="button"
                        >
                          Log in
                        </button>
                      </>
                    ) : (
                      <>
                        New here?{" "}
                        <button
                          onClick={() => {
                            setIsRegister(true);
                            setError(null);
                            setInfo(null);
                          }}
                          className="font-semibold text-cyan-200 hover:text-white hover:underline"
                          type="button"
                        >
                          Create an account
                        </button>
                      </>
                    )}
                  </div>

                  <div className="sb-pop mt-6 text-center text-[11px] text-white/45">
                    By continuing, you agree to our Terms and Privacy Policy.
                  </div>
                </div>
              </div>
            </div>

            {/* Local styles: floating shapes + subtle motion */}
            <style>{`
              @keyframes sbFloat {
                0% { transform: translate3d(0, 0, 0) scale(1); }
                50% { transform: translate3d(0, -18px, 0) scale(1.02); }
                100% { transform: translate3d(0, 0, 0) scale(1); }
              }
              @keyframes sbDrift {
                0% { transform: translate3d(0, 0, 0); }
                50% { transform: translate3d(22px, -12px, 0); }
                100% { transform: translate3d(0, 0, 0); }
              }
              @keyframes sbPop {
                0% { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.985); }
                100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
              }
              .sb-float { animation: sbFloat 6.5s ease-in-out infinite; }
              .sb-pop { animation: sbPop 420ms ease-out both; }
              .sb-blob {
                position: absolute;
                filter: blur(12px);
                opacity: 0.65;
                border-radius: 9999px;
                mix-blend-mode: screen;
                animation: sbDrift 10s ease-in-out infinite;
              }
              .sb-blob-1 {
                width: 420px; height: 420px;
                left: -140px; top: -160px;
                background: radial-gradient(circle at 30% 30%, rgba(34,211,238,0.9), rgba(99,102,241,0.35), transparent 70%);
              }
              .sb-blob-2 {
                width: 520px; height: 520px;
                right: -220px; top: 120px;
                background: radial-gradient(circle at 30% 30%, rgba(168,85,247,0.85), rgba(14,165,233,0.35), transparent 70%);
                animation-duration: 12s;
              }
              .sb-blob-3 {
                width: 440px; height: 440px;
                left: 20%; bottom: -220px;
                background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.8), rgba(34,211,238,0.28), transparent 70%);
                animation-duration: 11s;
              }
              .sb-ring {
                position: absolute;
                border-radius: 9999px;
                border: 1px solid rgba(255,255,255,0.14);
                box-shadow: 0 0 50px rgba(34,211,238,0.10) inset;
                opacity: 0.55;
                animation: sbDrift 14s ease-in-out infinite;
              }
              .sb-ring-1 { width: 520px; height: 520px; left: -120px; bottom: -220px; }
              .sb-ring-2 { width: 360px; height: 360px; right: 6%; top: -120px; animation-duration: 16s; }
              @media (prefers-reduced-motion: reduce) {
                .sb-float, .sb-blob, .sb-ring, .sb-pop { animation: none !important; }
              }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
}