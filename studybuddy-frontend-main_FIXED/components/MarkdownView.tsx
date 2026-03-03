"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Props = {
  content: string;
  className?: string;
};

function normalizeLatexDelimiters(src: string) {
  // Convert \( \) -> $ $
  let out = src.replace(/\\\(/g, "$").replace(/\\\)/g, "$");

  // Convert \[ \] -> $$ $$
  out = out.replace(/\\\[/g, "$$").replace(/\\\]/g, "$$");

  return out;
}

export default function MarkdownView({ content, className }: Props) {
  const normalized = normalizeLatexDelimiters(content || "");

  return (
    <div className={className ?? ""}>
      <div className="prose prose-zinc max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          skipHtml
        >
          {normalized}
        </ReactMarkdown>
      </div>
    </div>
  );
}