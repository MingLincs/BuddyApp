-- StudyBuddy Concept Engine v2 fields
-- Run in Supabase SQL editor

-- Concepts: add definition/example/application if missing
alter table public.concepts
  add column if not exists definition text,
  add column if not exists example text,
  add column if not exists application text;

-- Edges: add label + definition/example/application if missing
alter table public.concept_edges
  add column if not exists label text,
  add column if not exists definition text,
  add column if not exists example text,
  add column if not exists application text;

-- Mentions: ensure mention_count exists and defaults to 1 (optional but recommended)
alter table public.concept_doc_mentions
  add column if not exists mention_count int not null default 1;
