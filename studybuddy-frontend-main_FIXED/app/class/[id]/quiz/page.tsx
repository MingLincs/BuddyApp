"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { generateClassQuiz, getClassStudyMaterials } from "@/lib/api";
import QuizQuestion from "@/components/QuizQuestion";
import type { MCQ } from "@/lib/types";

type QuizMeta = {
  id: string;
  title: string;
  num_questions: number;
  created_at: string;
};

export default function ClassQuizPage() {
  const { id: classId } = useParams<{ id: string }>();
  const router = useRouter();

  const [className, setClassName] = useState("");
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<{ title: string; questions: MCQ[] } | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      // Load class name
      const { data: cls } = await supabase
        .from("classes")
        .select("name")
        .eq("id", classId)
        .maybeSingle();
      if (alive) setClassName(cls?.name || "Class");

      // Load saved quizzes
      try {
        const mats = await getClassStudyMaterials(classId, session.access_token);
        if (alive) setQuizzes(mats.quizzes || []);
      } catch {
        // ignore – quizzes may just be empty
      }

      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [classId, router]);

  const answered = useMemo(() => picked.filter((x) => x !== -1).length, [picked]);
  const correct = useMemo(
    () => picked.reduce((sum, p, i) => sum + (p === activeQuiz?.questions[i]?.answer_index ? 1 : 0), 0),
    [picked, activeQuiz],
  );

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const result = await generateClassQuiz(classId, session.access_token);
      const parsed = typeof result.quiz_json === "string"
        ? JSON.parse(result.quiz_json)
        : result.quiz_json;
      const qs: MCQ[] = parsed.questions || [];
      setActiveQuiz({ title: result.title, questions: qs });
      setPicked(new Array(qs.length).fill(-1));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz. Please try again.");
    } finally {
      setGenerating(false);
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
      setPicked(new Array(qs.length).fill(-1));
    } catch {
      setError("Could not load quiz.");
    }
  }

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="state-center">
          <div className="spinner" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="quiz-container">
        {/* Header */}
        <header className="quiz-header">
          <div>
            <Link href={`/class/${classId}`} className="back-link">← Back to {className}</Link>
            <h1>📝 Practice Quiz</h1>
            <p className="subtitle">Comprehensive quiz covering all class materials</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="generate-btn"
          >
            {generating ? (
              <><span className="btn-spinner" />Generating…</>
            ) : (
              "✨ Generate New Quiz"
            )}
          </button>
        </header>

        {error && (
          <div className="error-box">{error}</div>
        )}

        {/* Active quiz */}
        {activeQuiz && (
          <section className="active-quiz">
            <div className="quiz-meta">
              <h2>{activeQuiz.title}</h2>
              <span className="score-badge">
                {answered}/{activeQuiz.questions.length} answered · {correct} correct
              </span>
            </div>

            <ol className="questions-list">
              {activeQuiz.questions.map((q, i) => (
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
          </section>
        )}

        {/* Saved quizzes */}
        {!activeQuiz && quizzes.length > 0 && (
          <section className="saved-section">
            <h2 className="saved-title">Previously Generated Quizzes</h2>
            <div className="saved-list">
              {quizzes.map((q) => (
                <button
                  key={q.id}
                  onClick={() => openSavedQuiz(q.id)}
                  className="saved-card"
                >
                  <div className="saved-card-icon">📝</div>
                  <div className="saved-card-info">
                    <strong>{q.title}</strong>
                    <span>{q.num_questions} questions · {new Date(q.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="saved-card-arrow">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!activeQuiz && quizzes.length === 0 && !generating && (
          <div className="state-center empty">
            <div className="empty-icon">📝</div>
            <h2>No Quiz Yet</h2>
            <p>Generate a comprehensive quiz from all your class materials.</p>
            <button onClick={handleGenerate} className="generate-btn">
              ✨ Generate Class Quiz
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .quiz-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
        }

        .state-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 20px;
          text-align: center;
        }

        .spinner, .btn-spinner {
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner { width: 48px; height: 48px; }
        .btn-spinner { width: 16px; height: 16px; border-width: 2px; display: inline-block; }

        @keyframes spin { to { transform: rotate(360deg); } }

        .quiz-header {
          max-width: 900px;
          margin: 0 auto 32px;
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .back-link {
          display: inline-block;
          color: #64748b;
          text-decoration: none;
          margin-bottom: 12px;
          font-size: 14px;
          transition: color 0.2s;
        }
        .back-link:hover { color: #3b82f6; }

        .quiz-header h1 {
          margin: 0 0 8px;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 15px;
        }

        .generate-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(59,130,246,0.3);
        }

        .generate-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .error-box {
          max-width: 900px;
          margin: 0 auto 24px;
          padding: 16px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 12px;
          color: #dc2626;
          font-size: 14px;
        }

        .active-quiz {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .quiz-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .quiz-meta h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
        }

        .score-badge {
          padding: 8px 16px;
          background: #eff6ff;
          color: #2563eb;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
        }

        .questions-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .saved-section {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .saved-title {
          margin: 0 0 20px;
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }

        .saved-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .saved-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: #f8fafc;
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          width: 100%;
        }

        .saved-card:hover {
          background: #eff6ff;
          border-color: #3b82f6;
          transform: translateX(4px);
        }

        .saved-card-icon { font-size: 28px; }

        .saved-card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .saved-card-info strong {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
        }

        .saved-card-info span {
          font-size: 13px;
          color: #64748b;
        }

        .saved-card-arrow { color: #94a3b8; font-size: 18px; }

        .empty { padding: 60px 20px; }
        .empty-icon { font-size: 64px; }
        .empty h2 { margin: 0; font-size: 24px; font-weight: 700; color: #0f172a; }
        .empty p { margin: 8px 0 24px; color: #64748b; }

        @media (max-width: 768px) {
          .quiz-header { flex-direction: column; }
          .generate-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </>
  );
}
