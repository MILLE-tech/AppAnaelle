-- ============================================================================
-- Migration 0001 : détail des évaluations (heure + description)
-- ============================================================================
-- Point 2 de la demande : ajoute une heure facultative et une description
-- libre à un événement de calendrier, pour alimenter le panneau de détail
-- (point 1).
-- ============================================================================

alter table public.calendar_events
  add column if not exists time time,
  add column if not exists description text;
