"use client";
import React, { useState } from "react";
import type { Card } from "@/lib/types";

export default function FlashcardList({ cards }: { cards: Card[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? cards : cards.slice(0, 10);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Flashcards
          </div>
          <div className="text-slate-600">
            {showAll
              ? `Showing all ${cards.length}`
              : `Showing first ${Math.min(10, cards.length)} of ${cards.length}`}
          </div>
        </div>
        {cards.length > 10 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            {showAll ? "Show less" : "Show all"}
          </button>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {visible.map((c, i) => (
          <li key={i} className="rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="mb-2 text-xs uppercase text-slate-500">
              {(c.type || "card")}{c.source ? ` • ${c.source}` : ""}
            </div>
            <div className="font-medium">Q: {c.front}</div>
            <div className="mt-1 text-slate-700">A: {c.back}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
