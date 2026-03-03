"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FlashcardList from "@/components/FlashcardList";
import MarkdownView from "@/components/MarkdownView";
import { supabase } from "@/lib/supabase";
import { API_BASE } from "@/lib/env";
import {
  generateDocumentQuiz,
  generateDocumentFlashcards,
  getDocumentStudyMaterials,
} from "@/lib/api";
import QuizQuestion from "@/components/QuizQuestion";
import type { MCQ } from "@/lib/types";

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

type QuizMeta = {
  id: string;
  title: string;
  num_questions: number;
  created_at: string;
};

export default function DocDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [summary, setSummary] = useState<string | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Study material generation state
  const [savedQuizzes, setSavedQuizzes] = useState<QuizMeta[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<{ title: string; questions: MCQ[] } | null>(null);
  const [quizPicked, setQuizPicked] = useState<number[]>([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingCards, setGeneratingCards] = useState(false);
  const [genError, setGenError] = useState("");

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

      // Load saved study materials
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const mats = await getDocumentStudyMaterials(id, session.access_token);
          setSavedQuizzes(mats.quizzes || []);
          if (mats.flashcards?.length && !data?.cards_json) {
            setCards(mats.flashcards as any[]);
          }
        }
      } catch {}

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

  async function handleGenerateQuiz() {
    setGenError("");
    setGeneratingQuiz(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const result = await generateDocumentQuiz(id, session.access_token);
      const parsed = typeof result.quiz_json === "string"
        ? JSON.parse(result.quiz_json)
        : result.quiz_json;
      const qs: MCQ[] = parsed.questions || [];
      setActiveQuiz({ title: result.title, questions: qs });
      setQuizPicked(new Array(qs.length).fill(-1));
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Failed to generate quiz.");
    } finally {
      setGeneratingQuiz(false);
    }
  }

  async function handleGenerateFlashcards() {
    setGenError("");
    setGeneratingCards(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const result = await generateDocumentFlashcards(id, session.access_token);
      setCards((result.flashcards || []) as any[]);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : "Failed to generate flashcards.");
    } finally {
      setGeneratingCards(false);
    }
  }

  async function openSavedQuiz(quizId: string) {
    const { data } = await supabase
      .from("quizzes")
      .select("title,quiz_json")
      .eq("id", quizId)
      .maybeSingle();
    if (!data) return;
    try {
      const parsed = typeof data.quiz_json === "string"
        ? JSON.parse(data.quiz_json)
        : data.quiz_json;
      const qs: MCQ[] = parsed.questions || [];
      setActiveQuiz({ title: data.title, questions: qs });
      setQuizPicked(new Array(qs.length).fill(-1));
    } catch {
      setGenError("Could not load quiz.");
    }
  }

  const answeredCount = quizPicked.filter((x) => x !== -1).length;
  const correctCount = quizPicked.reduce(
    (sum, p, i) => sum + (p === activeQuiz?.questions[i]?.answer_index ? 1 : 0),
    0,
  );

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-16">

      {/* STUDY TOOLS */}
      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm px-14 py-10">
        <h2 className="text-2xl font-bold tracking-tight mb-6">🚀 Study Tools</h2>

        {genError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {genError}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {/* Flashcards */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleGenerateFlashcards}
              disabled={generatingCards}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              🎴 {generatingCards ? "Generating…" : cards.length > 0 ? "Regenerate Flashcards" : "Generate Flashcards"}
            </button>
            {cards.length > 0 && (
              <span className="text-xs text-slate-500 text-center">{cards.length} cards ready</span>
            )}
          </div>

          {/* Quiz */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleGenerateQuiz}
              disabled={generatingQuiz}
              className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              📝 {generatingQuiz ? "Generating…" : "Generate Quiz"}
            </button>
          </div>

          {/* Export PDF */}
          {summary && (
            <button
              onClick={exportSummaryPdf}
              disabled={busy}
              className="px-5 py-3 text-sm font-medium rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition"
            >
              {busy ? "Exporting..." : "Export Summary PDF"}
            </button>
          )}
        </div>

        {/* Saved quizzes */}
        {savedQuizzes.length > 0 && !activeQuiz && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Saved Quizzes</p>
            <div className="flex flex-col gap-2">
              {savedQuizzes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => openSavedQuiz(q.id)}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition text-left"
                >
                  <span className="text-xl">📝</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 text-sm">{q.title}</div>
                    <div className="text-xs text-slate-500">{q.num_questions} questions · {new Date(q.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="text-slate-400">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ACTIVE QUIZ */}
      {activeQuiz && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm px-14 py-16 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-3xl font-bold tracking-tight">{activeQuiz.title}</h2>
            <div className="flex items-center gap-4">
              <span className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-sm">
                {answeredCount}/{activeQuiz.questions.length} answered · {correctCount} correct
              </span>
              <button
                onClick={() => setActiveQuiz(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕ Close
              </button>
            </div>
          </div>
          <ol className="space-y-4">
            {activeQuiz.questions.map((q, i) => (
              <QuizQuestion
                key={i}
                q={q}
                index={i}
                onAnswered={(choice) =>
                  setQuizPicked((prev) => (prev[i] !== -1 ? prev : prev.with(i, choice)))
                }
              />
            ))}
          </ol>
        </section>
      )}

      {/* SUMMARY */}
      {summary && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm px-14 py-16">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-bold tracking-tight">
              Summary
            </h2>
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