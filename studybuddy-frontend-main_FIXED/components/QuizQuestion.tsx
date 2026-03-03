"use client";
import React, { useState } from "react";
import type { MCQ } from "@/lib/types";

export default function QuizQuestion({ q, index, onAnswered }: {
  q: MCQ; index: number; onAnswered?: (pickedIndex: number, correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number>(-1);
  const answered = picked !== -1;

  const pick = (ci: number) => {
    if (answered) return;
    setPicked(ci);
    onAnswered?.(ci, ci === q.answer_index);
  };

  return (
    <li className="rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="mb-2 font-medium">{index + 1}. {q.question}</div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {q.choices.map((c, ci) => {
          const correct = ci === q.answer_index;
          const isPicked = ci === picked;

          let cls = "rounded-md border p-2 cursor-pointer transition-colors ";
          if (!answered) cls += "border-slate-200 hover:bg-slate-50";
          else if (isPicked && correct) cls += "border-green-400 bg-green-50";
          else if (isPicked && !correct) cls += "border-red-400 bg-red-50";
          else if (correct) cls += "border-green-200";
          else cls += "border-slate-200";

          return (
            <li key={ci} className={cls} onClick={() => pick(ci)}>
              <span className="mr-2 font-medium">{String.fromCharCode(65 + ci)}.</span>
              {c}
            </li>
          );
        })}
      </ul>
      {answered && (
        <div className="mt-3 text-sm text-slate-700">
          <div><span className="font-semibold">Answer:</span> {String.fromCharCode(65 + q.answer_index)}</div>
          <div><span className="font-semibold">Why:</span> {q.explanation}</div>
          {q.source && <div className="text-slate-500">Source: {q.source}</div>}
        </div>
      )}
    </li>
  );
}
