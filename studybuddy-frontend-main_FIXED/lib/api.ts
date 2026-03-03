import { z } from "zod";
import { API_BASE } from "./env";
import { Card, UploadAPIResponse, QuizAPIResponse, MCQ } from "./types";
import { fetchJson } from "./utils";

const CardSchema = z.object({
  type: z.string().optional(),
  front: z.string(),
  back: z.string(),
  source: z.string().nullable().optional(),
});
const CardsPayloadSchema = z.object({ cards: z.array(CardSchema) });

const MCQSchema = z.object({
  question: z.string(),
  choices: z.array(z.string()).length(4),
  answer_index: z.number().int().min(0).max(3),
  explanation: z.string(),
  source: z.string().nullable().optional(),
});
const QuizPayloadSchema = z.object({ questions: z.array(MCQSchema) });

export async function uploadSlides(
  opts: { file: File; title?: string; makeSummary?: boolean; makeCards?: boolean },
  accessToken?: string
): Promise<{ id: string; title: string; summary: string; cards: Card[] }> {
  const fd = new FormData();
  fd.append("file", opts.file);
  fd.append("title", opts.title ?? opts.file.name);
  fd.append("make_summary", opts.makeSummary !== false ? "1" : "0");
  fd.append("make_cards", opts.makeCards !== false ? "1" : "0");

  const data = await fetchJson<UploadAPIResponse>(`${API_BASE}/upload`, {
    method: "POST",
    body: fd,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  let cards: Card[] = [];
  if (opts.makeCards !== false) {
    const cleaned = (data.cards_json ?? "").replace(/```(\w+)?/g, "");
    const parsed = JSON.parse(cleaned || '{"cards": []}');
    const safe = CardsPayloadSchema.parse(parsed);
    cards = safe.cards as Card[];
  }
  return { id: data.id, title: data.title, summary: data.summary ?? "", cards };
}

export async function buildQuiz(
  opts: { file: File; title?: string; numQuestions?: number },
  accessToken?: string
): Promise<{ id: string; title: string; questions: MCQ[] }> {
  const fd = new FormData();
  fd.append("file", opts.file);
  fd.append("title", opts.title ?? opts.file.name);
  fd.append("num_questions", String(opts.numQuestions ?? 18));

  const data = await fetchJson<QuizAPIResponse>(`${API_BASE}/quiz`, {
    method: "POST",
    body: fd,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  const cleaned = (data.quiz_json ?? "").replace(/```(\w+)?/g, "");
  const parsed = JSON.parse(cleaned || '{"questions": []}');
  const safe = QuizPayloadSchema.parse(parsed);
  return { id: data.id, title: data.title, questions: safe.questions as MCQ[] };
}

// ── Study-material helpers ──────────────────────────────────────────────────

export async function generateClassQuiz(
  classId: string,
  accessToken?: string,
): Promise<{ id: string; title: string; num_questions: number; quiz_json: string }> {
  return fetchJson(`${API_BASE}/classes/${classId}/generate-quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

export async function generateClassFlashcards(
  classId: string,
  accessToken?: string,
): Promise<{ flashcards: unknown[]; count: number; class_name: string }> {
  return fetchJson(`${API_BASE}/classes/${classId}/generate-flashcards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

export async function getClassStudyMaterials(
  classId: string,
  accessToken?: string,
): Promise<{
  quizzes: { id: string; title: string; num_questions: number; created_at: string; quiz_json?: string }[];
  flashcard_count: number;
  has_quizzes: boolean;
  has_flashcards: boolean;
}> {
  return fetchJson(`${API_BASE}/classes/${classId}/study-materials`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function generateDocumentQuiz(
  docId: string,
  accessToken?: string,
): Promise<{ id: string; title: string; num_questions: number; quiz_json: string }> {
  return fetchJson(`${API_BASE}/documents/${docId}/generate-quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

export async function generateDocumentFlashcards(
  docId: string,
  accessToken?: string,
): Promise<{ flashcards: unknown[]; count: number }> {
  return fetchJson(`${API_BASE}/documents/${docId}/generate-flashcards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

export async function getDocumentStudyMaterials(
  docId: string,
  accessToken?: string,
): Promise<{
  flashcards: unknown[];
  flashcard_count: number;
  quizzes: { id: string; title: string; num_questions: number; created_at: string }[];
  has_flashcards: boolean;
  has_quizzes: boolean;
}> {
  return fetchJson(`${API_BASE}/documents/${docId}/study-materials`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function getClassQuizzes(
  classId: string,
  accessToken?: string,
): Promise<{ id: string; title: string; num_questions: number; created_at: string; doc_id: string; doc_title: string }[]> {
  return fetchJson(`${API_BASE}/classes/${classId}/quizzes`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function getQuizById(
  quizId: string,
  accessToken?: string,
): Promise<{ id: string; title: string; num_questions: number; created_at: string; quiz_json: string; doc_id: string }> {
  return fetchJson(`${API_BASE}/quizzes/${quizId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// CSV/Anki exports removed
