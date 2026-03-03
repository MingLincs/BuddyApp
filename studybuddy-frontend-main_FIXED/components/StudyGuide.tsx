"use client";

import React, { useMemo, useState } from "react";

export type StudyGuideConcept = {
  id: string;
  name: string;
  importance: "core" | "important" | "advanced";
  difficulty: "easy" | "medium" | "hard";
  prerequisites?: string[];
  simple: string;
  detailed: string;
  technical: string;
  example: string;
  common_mistake: string;
};

export type StudyGuide = {
  chapter_title?: string;
  estimated_study_minutes?: number;
  concepts: StudyGuideConcept[];
};

function badgeClasses(kind: "core" | "important" | "advanced") {
  switch (kind) {
    case "core": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "important": return "bg-blue-100 text-blue-800 border-blue-200";
    case "advanced": return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function difficultyLabel(d: "easy" | "medium" | "hard") {
  if (d === "hard") return "⚠️ Tricky";
  if (d === "medium") return "Medium";
  return "Easy";
}

export default function StudyGuideView({ guide }: { guide: StudyGuide }) {
  const [selectedId, setSelectedId] = useState<string>(() => guide.concepts?.[0]?.id ?? "");
  const [level, setLevel] = useState<"simple" | "detailed" | "technical">("simple");

  const byId = useMemo(() => {
    const map = new Map<string, StudyGuideConcept>();
    (guide.concepts || []).forEach((c) => map.set(c.id, c));
    return map;
  }, [guide]);

  const selected = byId.get(selectedId) ?? guide.concepts?.[0];

  const levelText = selected ? selected[level] : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-900">
            {guide.chapter_title || "Study Guide"}
          </h2>
          <p className="text-sm text-slate-600">
            Found {guide.concepts?.length ?? 0} key concepts
            {typeof guide.estimated_study_minutes === "number" ? ` • Estimated study time: ${guide.estimated_study_minutes} min` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[320px_1fr]">
        {/* Concept list */}
        <div className="border-b border-slate-200 md:border-b-0 md:border-r md:border-slate-200">
          <div className="p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Concepts</div>
          </div>
          <div className="max-h-[520px] overflow-auto">
            {(guide.concepts || []).map((c, idx) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={[
                    "w-full text-left px-4 py-3 border-t border-slate-100 hover:bg-slate-50",
                    active ? "bg-slate-50" : "bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {idx + 1}. {c.name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-xs", badgeClasses(c.importance)].join(" ")}>
                          {c.importance === "core" ? "Core ⭐" : c.importance === "important" ? "Important" : "Advanced"}
                        </span>
                        <span className="text-xs text-slate-600">{difficultyLabel(c.difficulty)}</span>
                      </div>
                    </div>
                    <div className="text-slate-400">{active ? "›" : ""}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Concept detail */}
        <div className="p-5">
          {!selected ? (
            <div className="text-slate-600">Select a concept to view it.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{selected.name}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-xs", badgeClasses(selected.importance)].join(" ")}>
                      {selected.importance === "core" ? "Core ⭐" : selected.importance === "important" ? "Important" : "Advanced"}
                    </span>
                    <span className="text-xs text-slate-600">{difficultyLabel(selected.difficulty)}</span>
                    {selected.prerequisites && selected.prerequisites.length > 0 && (
                      <span className="text-xs text-slate-600">
                        • Prereqs: {selected.prerequisites.map((id) => byId.get(id)?.name || id).join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {(["simple", "detailed", "technical"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLevel(k)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-sm font-medium",
                        level === k ? "bg-white shadow-sm border border-slate-200 text-slate-900" : "text-slate-600 hover:text-slate-900",
                      ].join(" ")}
                    >
                      {k === "simple" ? "Simple" : k === "detailed" ? "Detailed" : "Technical"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm leading-7 text-slate-800 whitespace-pre-wrap">{levelText}</div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example</div>
                  <div className="mt-2 text-sm leading-7 text-slate-800 whitespace-pre-wrap">{selected.example}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Common mistake</div>
                  <div className="mt-2 text-sm leading-7 text-slate-800 whitespace-pre-wrap">{selected.common_mistake}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
