"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Props = {
  kind: "document" | "quiz";
  id: string;
  title?: string | null;
  onDeleted?: () => void;
};

export default function DeleteButton({ kind, id, title, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!confirm(`Delete this ${kind}${title ? `: "${title}"` : ""}?`)) return;
    setBusy(true);
    try {
      // 1) Build an absolute base at runtime (even if env was not inlined)
      const envBase = process.env.NEXT_PUBLIC_API_URL;
      const runtimeFallback =
        typeof window !== "undefined" ? "http://127.0.0.1:8000" : "";
      const base = envBase && envBase.startsWith("http")
        ? envBase
        : runtimeFallback;

      // 2) Build absolute URL safely
      const endpoint = new URL(
        kind === "document"
          ? `/library/document/${id}`
          : `/library/quiz/${id}`,
        base
      ).toString();

      // 3) Log once to confirm it’s NOT hitting :3000
      console.log("[DeleteButton] DELETE", endpoint);

      // 4) Get Supabase JWT (robust)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: true, autoRefreshToken: true } }
      );
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const r = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.detail || j?.error || "Delete failed");

      onDeleted?.();
    } catch (e: unknown) {
  if (e instanceof Error) {
    alert(e.message);
  } else {
    alert("Delete failed");
  }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="text-xs px-2 py-1 rounded-md border border-red-300 hover:bg-red-50 disabled:opacity-50"
      title="Delete"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
