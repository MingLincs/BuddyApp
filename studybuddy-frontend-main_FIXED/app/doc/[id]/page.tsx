"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FlashcardList from "@/components/FlashcardList";
import MarkdownView from "@/components/MarkdownView";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/env";

type Concept = {
  name: string;
  importance: string;
  difficulty: string;
  simple: string;
  detailed: string;
  technical: string;
  example: string;
  common_mistake: string;
};

export default function DocDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [summary, setSummary] = useState<string | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("documents")
        .select("summary,cards_json,guide_json,title")
        .eq("id", id)
        .maybeSingle();

      setSummary(data?.summary || null);

      if (data?.cards_json) {
        try {
          const parsed =
            typeof data.cards_json === "string"
              ? JSON.parse(data.cards_json)
              : data.cards_json;
          setCards(parsed.cards || []);
        } catch {}
      }

      if (data?.guide_json) {
        try {
          const parsed =
            typeof data.guide_json === "string"
              ? JSON.parse(data.guide_json)
              : data.guide_json;
          setConcepts(parsed.concepts || []);
        } catch {}
      }

      setLoading(false);
    })();
  }, [id]);

  const exportSummaryPdf = async () => {
    try {
      setBusy(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      const res = await fetch(
        `${API_BASE}/library/document/${id}/summary-pdf`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (!res.ok) throw new Error("Failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "summary.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export PDF");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-16">

      {/* SUMMARY */}
      {summary && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm px-14 py-16">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">
              Summary
            </h2>

            <button
              onClick={exportSummaryPdf}
              disabled={busy}
              className="px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {busy ? "Exporting..." : "Export PDF"}
            </button>
          </div>

          <div className="max-w-4xl mx-auto">
            <MarkdownView content={summary} />
          </div>
        </section>
      )}

      {/* CONCEPTS */}
      {concepts.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm px-14 py-16 space-y-10">
          <h2 className="text-3xl font-bold tracking-tight">
            Study Concepts
          </h2>

          {concepts.map((c, i) => (
            <div
              key={i}
              className="border border-slate-200 rounded-2xl p-8 bg-slate-50 space-y-6"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-semibold">{c.name}</h3>

                <div className="flex gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                    {c.importance}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                    {c.difficulty}
                  </span>
                </div>
              </div>

              <p className="text-lg leading-relaxed text-slate-700">
                {c.detailed}
              </p>

              <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                <strong className="block mb-2 text-blue-700 text-sm uppercase tracking-wide">
                  Example
                </strong>
                <p className="text-slate-700">{c.example}</p>
              </div>

              <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
                <strong className="block mb-2 text-red-700 text-sm uppercase tracking-wide">
                  Common Mistake
                </strong>
                <p className="text-slate-700">{c.common_mistake}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* FLASHCARDS */}
      {cards.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm px-14 py-16">
          <h2 className="text-3xl font-bold tracking-tight mb-8">
            Flashcards
          </h2>
          <FlashcardList cards={cards} />
        </section>
      )}
    </div>
  );
}