-- StudyBuddy: AI Quiz + Flashcards migration
-- Run this in the Supabase SQL editor.
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$ guards).

-- -----------------------------------------------------------------------
-- Performance indexes
-- -----------------------------------------------------------------------

-- documents: fast lookup by class and user
create index if not exists documents_class_id_idx   on public.documents(class_id);
create index if not exists documents_user_id_idx    on public.documents(user_id);

-- quizzes: fast lookup by doc and user
-- NOTE: quizzes table has NO class_id column.
-- Class-level quizzes are stored in study_materials.quiz_questions.
create index if not exists quizzes_doc_id_idx       on public.quizzes(doc_id);
create index if not exists quizzes_user_id_idx      on public.quizzes(user_id);

-- concepts: fast class-scoped lookups (uses canonical_name, NOT name)
create index if not exists concepts_class_id_idx    on public.concepts(class_id);

-- study_materials: fast lookup by class+type and by document+type
create index if not exists study_materials_class_type_idx
  on public.study_materials(class_id, material_type);
create index if not exists study_materials_doc_type_idx
  on public.study_materials(document_id, material_type);

-- student_progress: fast lookup by class+concept
create index if not exists student_progress_class_concept_idx
  on public.student_progress(class_id, concept_id);

-- -----------------------------------------------------------------------
-- study_materials: ensure material_type values are consistent
-- Supported types: class_quiz, class_flashcards, document_flashcards,
--                  class_study_pack
-- No schema changes needed; these are enforced at the application layer.
-- -----------------------------------------------------------------------

-- -----------------------------------------------------------------------
-- NOTE: Do NOT add quizzes.class_id – it does not exist in the schema.
-- NOTE: Do NOT add concepts.name   – use canonical_name instead.
-- -----------------------------------------------------------------------
