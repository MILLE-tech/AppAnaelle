-- ============================================================================
-- AppAnaelle — schéma Supabase complet
-- ============================================================================
-- À exécuter dans Supabase Studio > SQL Editor (ou via `supabase db push`).
-- Idempotent : peut être rejoué sans dupliquer les objets.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Maintient updated_at à jour sur chaque UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TABLE: profiles
-- Un profil par utilisateur Supabase Auth, créé automatiquement à l'inscription.
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription d'un utilisateur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TABLE: subjects (matières)
-- ============================================================================

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#8b5cf6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subjects_user_id_idx on public.subjects(user_id);

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: documents (PDF / photos de cours uploadés par matière)
-- ============================================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_path text,
  keep_original boolean not null default false,
  status text not null default 'uploading'
    check (status in ('uploading', 'extracting', 'analyzing', 'ready', 'error')),
  error_message text,
  extraction_method text
    check (extraction_method in ('pdf_text', 'pdf_vision', 'image_vision')),
  extracted_text text,
  page_count integer,
  char_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_subject_id_idx on public.documents(subject_id);
create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_status_idx on public.documents(status);

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: revision_sheets (fiches de révision générées, une par document)
-- ============================================================================

create table if not exists public.revision_sheets (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content_markdown text not null,
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists revision_sheets_subject_id_idx on public.revision_sheets(subject_id);
create index if not exists revision_sheets_user_id_idx on public.revision_sheets(user_id);

drop trigger if exists set_revision_sheets_updated_at on public.revision_sheets;
create trigger set_revision_sheets_updated_at
  before update on public.revision_sheets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: question_sets (un lot de questions généré en un seul appel Gemini)
-- ============================================================================

create table if not exists public.question_sets (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_type text not null
    check (question_type in ('true_false', 'mcq', 'open')),
  requested_count integer not null check (requested_count in (5, 10, 20)),
  model_used text,
  created_at timestamptz not null default now()
);

create index if not exists question_sets_document_id_idx on public.question_sets(document_id);
create index if not exists question_sets_subject_id_idx on public.question_sets(subject_id);
create index if not exists question_sets_user_id_idx on public.question_sets(user_id);

-- ============================================================================
-- TABLE: questions
-- ============================================================================

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.question_sets(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_type text not null
    check (question_type in ('true_false', 'mcq', 'open')),
  prompt text not null,
  -- QCM: tableau de 4 propositions ["...", "...", "...", "..."] ; sinon null.
  options jsonb,
  -- QCM: index (0-3) de la bonne réponse ; Vrai/Faux: 'true'|'false' ; ouverte: null.
  correct_answer text,
  explanation text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists questions_question_set_id_idx on public.questions(question_set_id);
create index if not exists questions_subject_id_idx on public.questions(subject_id);
create index if not exists questions_user_id_idx on public.questions(user_id);

-- ============================================================================
-- TABLE: question_review_state (paquet "à revoir" par question)
-- ============================================================================

create table if not exists public.question_review_state (
  question_id uuid primary key references public.questions(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  in_review boolean not null default false,
  -- Nombre de bonnes réponses d'affilée ; une question sort du paquet à 2.
  consecutive_correct integer not null default 0,
  added_to_review_at timestamptz,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists question_review_state_user_subject_idx
  on public.question_review_state(user_id, subject_id) where in_review;

drop trigger if exists set_question_review_state_updated_at on public.question_review_state;
create trigger set_question_review_state_updated_at
  before update on public.question_review_state
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: review_sessions (une session de révision = un score)
-- ============================================================================

create table if not exists public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- null = toutes matières confondues (ex: session "réviser mes erreurs" globale).
  subject_id uuid references public.subjects(id) on delete cascade,
  session_type text not null default 'normal'
    check (session_type in ('normal', 'review_errors')),
  total_questions integer not null default 0,
  correct_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds integer
);

create index if not exists review_sessions_user_id_idx on public.review_sessions(user_id);
create index if not exists review_sessions_subject_id_idx on public.review_sessions(subject_id);

-- ============================================================================
-- TABLE: review_session_answers (réponses données pendant une session)
-- ============================================================================

create table if not exists public.review_session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_type text not null
    check (question_type in ('true_false', 'mcq', 'open')),
  user_answer text,
  is_correct boolean not null,
  -- Note /10 pour les questions ouvertes corrigées par Gemini ; null sinon.
  score numeric(4, 2),
  ai_feedback text,
  answered_at timestamptz not null default now()
);

create index if not exists review_session_answers_session_id_idx on public.review_session_answers(session_id);
create index if not exists review_session_answers_question_id_idx on public.review_session_answers(question_id);
create index if not exists review_session_answers_user_id_idx on public.review_session_answers(user_id);

-- ============================================================================
-- TABLE: calendar_events (évaluations à venir)
-- ============================================================================

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  event_date date not null,
  coefficient numeric(4, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_user_id_idx on public.calendar_events(user_id);
create index if not exists calendar_events_event_date_idx on public.calendar_events(event_date);

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Chaque utilisateur ne voit et ne modifie que ses propres données.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.documents enable row level security;
alter table public.revision_sheets enable row level security;
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.question_review_state enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_session_answers enable row level security;
alter table public.calendar_events enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- subjects
drop policy if exists "subjects_all_own" on public.subjects;
create policy "subjects_all_own" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- documents
drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- revision_sheets
drop policy if exists "revision_sheets_all_own" on public.revision_sheets;
create policy "revision_sheets_all_own" on public.revision_sheets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- question_sets
drop policy if exists "question_sets_all_own" on public.question_sets;
create policy "question_sets_all_own" on public.question_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- questions
drop policy if exists "questions_all_own" on public.questions;
create policy "questions_all_own" on public.questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- question_review_state
drop policy if exists "question_review_state_all_own" on public.question_review_state;
create policy "question_review_state_all_own" on public.question_review_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- review_sessions
drop policy if exists "review_sessions_all_own" on public.review_sessions;
create policy "review_sessions_all_own" on public.review_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- review_session_answers
drop policy if exists "review_session_answers_all_own" on public.review_session_answers;
create policy "review_session_answers_all_own" on public.review_session_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- calendar_events
drop policy if exists "calendar_events_all_own" on public.calendar_events;
create policy "calendar_events_all_own" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- STORAGE : bucket privé pour les documents de cours
-- Chemin de convention : {user_id}/{subject_id}/{document_id}/{nom_fichier}
-- Les fichiers sont supprimés après extraction du texte sauf si l'option
-- "conserver le document" est activée (documents.keep_original = true).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-documents',
  'course-documents',
  false,
  26214400, -- 25 Mo
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_documents_select_own" on storage.objects;
create policy "course_documents_select_own" on storage.objects
  for select using (
    bucket_id = 'course-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "course_documents_insert_own" on storage.objects;
create policy "course_documents_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'course-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "course_documents_update_own" on storage.objects;
create policy "course_documents_update_own" on storage.objects
  for update using (
    bucket_id = 'course-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "course_documents_delete_own" on storage.objects;
create policy "course_documents_delete_own" on storage.objects
  for delete using (
    bucket_id = 'course-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- Fin du schéma
-- ============================================================================
