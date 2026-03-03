"use client";
import React from "react";

type Props = { accept?: string; onSelect: (file: File | null) => void; label?: string; };

export default function FileDrop({ accept = "application/pdf", onSelect, label }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
      <input
        type="file"
        accept={accept}
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-900 hover:file:bg-slate-300"
      />
      {label && <div className="mt-2 text-xs text-slate-500">{label}</div>}
    </div>
  );
}
