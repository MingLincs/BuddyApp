"use client";

import React, { useState } from "react";
import FileDrop from "@/components/FileDrop";
import { buildQuiz } from "@/lib/api";
import type { MCQ } from "@/lib/types";
import { API_BASE } from "@/lib/env";
import QuizQuestion from "@/components/QuizQuestion";
import { supabase } from "@/lib/supabase";

export default function QuizPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qs, setQs] = useState<MCQ[]>([]);
  const [picked, setPicked] = useState<number[]>([]);

  const answeredCount = picked.filter((x) => x !== -1).length;
  const correctCount = picked.reduce((sum, p, i) => sum + (p === qs[i]?.answer_index ? 1 : 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setQs([]); setPicked([]);
    if (!file) return setError("Choose a PDF first.");

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await buildQuiz({ file, title: file.name, numQuestions: 18 }, token);
      setQs(res.questions);
      setPicked(new Array(res.questions.length).fill(-1));
    } catch (err: unknown) {
  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError("Error generating quiz.");
  }
    } finally {
      setLoading(false);
    }
  }

  const onAnswered = (qi: number, choice: number) => {
    setPicked((prev) => (prev[qi] !== -1 ? prev : prev.with(qi, choice)));
  };

  return (
    <section className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generate quiz</h1>
        <p className="mt-1 text-slate-600">Click an option to check your answer instantly.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={submit} className="space-y-4">
          <FileDrop onSelect={setFile} label={`API: ${API_BASE}`} />
          <div className="flex items-center gap-3">
            <button
              disabled={!file || loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate quiz"}
            </button>
            {file && <span className="text-sm text-slate-600">Selected: <strong>{file.name}</strong></span>}
          </div>
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </form>
      </div>

      {qs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quiz</div>
              <div className="text-slate-600">
                {answeredCount}/{qs.length} answered · {correctCount} correct
              </div>
            </div>
          </div>

          <ol className="space-y-4">
            {qs.map((q, i) => (
              <QuizQuestion key={i} q={q} index={i} onAnswered={(picked) => onAnswered(i, picked)} />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
