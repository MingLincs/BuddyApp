"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import type { MCQ } from "@/lib/types";
import QuizQuestion from "@/components/QuizQuestion";

type Row = {
  id: string;
  title: string;
  quiz_json: {
    questions: MCQ[];
  } | null;
};

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<Row | null>(null);
  const [qs, setQs] = useState<MCQ[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("quizzes")
        .select("id,title,quiz_json")
        .eq("id", id)
        .maybeSingle();
      if (!mounted) return;
      setRow(data ?? null);

      try {
        const parsed = data?.quiz_json ? (typeof data.quiz_json === "string" ? JSON.parse(data.quiz_json) : data.quiz_json) : { questions: [] };
        const arr = (parsed.questions || []) as MCQ[];
        setQs(arr);
        setPicked(new Array(arr.length).fill(-1));
      } catch {
        setQs([]);
        setPicked([]);
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const answered = useMemo(() => picked.filter((x) => x !== -1).length, [picked]);
  const correct = useMemo(
    () => picked.reduce((sum, p, i) => sum + (p === qs[i]?.answer_index ? 1 : 0), 0),
    [picked, qs]
  );

  if (loading) {
    return <section className="mx-auto max-w-5xl p-6">Loading…</section>;
  }
  if (!row) {
    return <section className="mx-auto max-w-5xl p-6">Not found.</section>;
  }

  return (
    <section className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{row.title || "Untitled quiz"}</h1>
        <div className="text-sm text-slate-600">
          {answered}/{qs.length} answered · {correct} correct
        </div>
      </div>

      {qs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
          No questions found for this quiz.
        </div>
      ) : (
        <ol className="space-y-4">
          {qs.map((q, i) => (
            <QuizQuestion
              key={i}
              q={q}
              index={i}
              onAnswered={(choice) =>
                setPicked((prev) => (prev[i] !== -1 ? prev : prev.with(i, choice)))
              }
            />
          ))}
        </ol>
      )}
    </section>
  );
}
