-- ============================================================================
-- Migration 0005 : nouveaux paliers de nombre de questions (point 6)
-- ============================================================================
-- Remplace 5/10/20 par 10/20/40/50/80/100. Les lots existants avec
-- requested_count = 5 restent en base (aucune donnée supprimée) mais ne
-- seront plus proposés à la génération.
-- ============================================================================

alter table public.question_sets
  drop constraint if exists question_sets_requested_count_check;

alter table public.question_sets
  add constraint question_sets_requested_count_check
  check (requested_count in (5, 10, 20, 40, 50, 80, 100));
