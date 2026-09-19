-- ============================================================================
-- Migration 0004 : rattache une session de révision à son lot de questions
-- ============================================================================
-- Point 5, Bloc 2 de la page matière : "meilleur score obtenu" par lot de
-- questions. review_sessions ne savait pas, jusqu'ici, de quel lot
-- (question_set) une session provenait — impossible donc de calculer un
-- meilleur score par lot. Colonne nullable : les sessions "réviser mes
-- erreurs" (toutes matières ou multi-lots) n'y sont pas rattachées.
-- ============================================================================

alter table public.review_sessions
  add column if not exists question_set_id uuid references public.question_sets(id) on delete cascade;

create index if not exists review_sessions_question_set_id_idx
  on public.review_sessions(question_set_id);
