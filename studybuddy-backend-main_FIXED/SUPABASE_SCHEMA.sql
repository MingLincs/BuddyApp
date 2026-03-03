-- Run this in Supabase SQL editor

-- 1) Classes
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists classes_user_id_idx on public.classes(user_id);

-- 2) Add class_id to documents (nullable for existing rows)
alter table public.documents add column if not exists class_id uuid;
create index if not exists documents_class_id_idx on public.documents(class_id);

-- 3) Concept graph tables
create table if not exists public.class_concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  class_id uuid not null,
  doc_id uuid,
  name text not null,
  importance text,
  difficulty text,
  created_at timestamptz not null default now(),
  unique(user_id, class_id, name)
);
create index if not exists class_concepts_class_idx on public.class_concepts(class_id);

create table if not exists public.class_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  class_id uuid not null,
  src_name text not null,
  dst_name text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(user_id, class_id, src_name, dst_name)
);
create index if not exists class_edges_class_idx on public.class_edges(class_id);

-- NOTE: Enable RLS & policies if you use anon client for reads/writes.
-- For quick dev: you can keep RLS off, or create policies per user_id.
