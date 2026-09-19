-- ============================================================================
-- Migration 0003 : Documents utiles (point 6, Bloc 3 de la page matière)
-- ============================================================================
-- Table séparée plutôt qu'une colonne "kind" sur documents — voir
-- l'explication donnée à l'utilisatrice en dehors de ce fichier. Résumé :
-- "documents" porte tout le pipeline d'extraction/Groq (status,
-- extraction_method, extracted_text, char_count...) qui n'a aucun sens
-- pour un fichier Word/Excel/PowerPoint jamais envoyé au modèle ; ça
-- aurait forcé soit des colonnes nullable partout, soit des contraintes
-- conditionnelles, pour un objet métier qui n'est en réalité pas un
-- "document de cours".
--
-- Réutilise le bucket Storage existant "course-documents" (même politique
-- de confidentialité par dossier utilisateur) : on élargit simplement la
-- liste des types MIME autorisés pour couvrir Word/Excel/PowerPoint.
-- ============================================================================

create table if not exists public.useful_documents (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_path text not null,
  file_size bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists useful_documents_subject_id_idx on public.useful_documents(subject_id);
create index if not exists useful_documents_user_id_idx on public.useful_documents(user_id);

alter table public.useful_documents enable row level security;

drop policy if exists "useful_documents_all_own" on public.useful_documents;
create policy "useful_documents_all_own" on public.useful_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
where id = 'course-documents';
