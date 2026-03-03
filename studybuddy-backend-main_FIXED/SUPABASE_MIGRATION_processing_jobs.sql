-- Document processing jobs table
-- Tracks background processing status for uploaded documents

create table if not exists public.document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  user_id uuid not null,
  class_id uuid not null,
  status text not null default 'queued',  -- queued | processing | completed | failed
  stage text,                              -- queued | extracting | classifying | building | finalizing
  error text,
  document_type text,                      -- document | syllabus
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dpj_document_id_idx on public.document_processing_jobs(document_id);
create index if not exists dpj_user_id_idx on public.document_processing_jobs(user_id);
