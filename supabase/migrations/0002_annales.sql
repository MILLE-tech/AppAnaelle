-- ============================================================================
-- Migration 0002 : onglet Annales (point 4)
-- ============================================================================
-- Deux tables :
--   - annales_years : les "années" affichées dans l'onglet. Persistées
--     séparément des dépôts eux-mêmes pour qu'une année tout juste ajoutée
--     reste visible même avant tout dépôt de PDF dedans (2025 et 2026 sont
--     toujours affichées par défaut côté app, sans avoir besoin d'exister
--     ici — cette table ne sert qu'aux années ajoutées en plus).
--   - annales : un PDF d'annale déposé pour une matière, une année donnée.
-- Bucket Storage privé dédié "annales" (distinct de "course-documents"),
-- avec accès par dossier utilisateur comme les autres buckets du projet.
-- ============================================================================

create table if not exists public.annales_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  created_at timestamptz not null default now(),
  unique (user_id, year)
);

alter table public.annales_years enable row level security;

drop policy if exists "annales_years_all_own" on public.annales_years;
create policy "annales_years_all_own" on public.annales_years
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.annales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  file_name text not null,
  file_path text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists annales_user_id_idx on public.annales(user_id);
create index if not exists annales_subject_id_idx on public.annales(subject_id);
create index if not exists annales_year_idx on public.annales(year);

alter table public.annales enable row level security;

drop policy if exists "annales_all_own" on public.annales;
create policy "annales_all_own" on public.annales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Bucket privé dédié, PDF uniquement (les annales ne passent jamais par
-- Groq, c'est du stockage/consultation simple).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('annales', 'annales', false, 26214400, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "annales_bucket_select_own" on storage.objects;
create policy "annales_bucket_select_own" on storage.objects
  for select using (
    bucket_id = 'annales' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "annales_bucket_insert_own" on storage.objects;
create policy "annales_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'annales' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "annales_bucket_delete_own" on storage.objects;
create policy "annales_bucket_delete_own" on storage.objects
  for delete using (
    bucket_id = 'annales' and auth.uid()::text = (storage.foldername(name))[1]
  );
