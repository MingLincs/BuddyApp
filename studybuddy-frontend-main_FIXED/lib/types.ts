export type Card = { type?: string; front: string; back: string; source?: string | null };
export type UploadAPIResponse = { id: string; title: string; summary: string; cards_json: string; guide_json?: string };
export type MCQ = { question: string; choices: string[]; answer_index: number; explanation: string; source?: string | null };
export type QuizAPIResponse = { id: string; title: string; num_questions: number; quiz_json: string };


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
