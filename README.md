# AppAnaelle — révisions BTS SAM

Application web de révision pour le BTS Support à l'Action Managériale (SAM) :
fiches de synthèse, quiz et suivi de progression générés à partir des cours
(PDF ou photos), avec un paquet "à revoir" pour retravailler les erreurs et un
calendrier des évaluations.

Conçue pour tourner intégralement sur des offres **gratuites, sans carte
bancaire** : Vercel (Hobby), Supabase (Free) et l'API Gemini via Google AI
Studio (palier gratuit).

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS 4
- [Supabase](https://supabase.com) : Auth, Postgres, Row Level Security, Storage
- [Google Gemini](https://ai.google.dev) (modèle du palier gratuit, appelé
  uniquement depuis des routes API serveur — la clé n'est jamais exposée au
  client)

## Avancement

- [x] Étape 1 — Auth + schéma Supabase
- [x] Étape 2 — Upload de documents + extraction de texte
- [ ] Étape 3 — Génération de fiches de révision
- [ ] Étape 4 — Questions, score et reprise des erreurs
- [ ] Étape 5 — Calendrier et tableau de bord

## 1. Créer le projet Supabase

1. Crée un compte gratuit sur [supabase.com](https://supabase.com) (aucune
   carte bancaire requise pour le plan Free) et crée un nouveau projet.
2. Ouvre **SQL Editor** dans le tableau de bord du projet, colle le contenu de
   [`supabase/schema.sql`](./supabase/schema.sql) et exécute-le. Ce script
   crée toutes les tables, active la Row Level Security (chaque utilisatrice
   ne voit que ses propres données) et crée le bucket Storage privé
   `course-documents` avec ses policies.
3. Dans **Project Settings > API**, récupère :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secrète, jamais
     exposée au client — elle sert uniquement à supprimer les fichiers du
     Storage après extraction du texte)
4. Dans **Authentication > Emails**, le template "Confirm signup" par défaut
   convient. Vérifie dans **Authentication > URL Configuration** que la
   **Site URL** correspond à ton domaine (`http://localhost:3000` en local,
   ton URL Vercel en production) pour que les liens de confirmation d'email
   fonctionnent.

## 2. Obtenir une clé Gemini gratuite (Google AI Studio)

1. Va sur [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   et connecte-toi avec un compte Google (aucune carte bancaire requise pour
   le palier gratuit).
2. Clique sur **Create API key**, choisis ou crée un projet Google Cloud, puis
   copie la clé générée → `GEMINI_API_KEY`.
3. Le palier gratuit limite le nombre de requêtes par minute et par jour selon
   le modèle. Le nom du modèle est configurable via `GEMINI_MODEL` (par
   défaut `gemini-2.5-flash`) car l'offre gratuite de Google évolue
   régulièrement — vérifie les modèles disponibles sur
   [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)
   et mets à jour cette variable si besoin, sans toucher au code.

## 3. Installation locale

```bash
npm install
cp .env.example .env.local
# puis renseigne les valeurs Supabase et Gemini dans .env.local
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Crée un compte via
`/signup`, confirme l'adresse email (lien envoyé par Supabase), puis
connecte-toi.

## 4. Déploiement gratuit sur Vercel

1. Pousse le dépôt sur GitHub (ou GitLab/Bitbucket).
2. Sur [vercel.com](https://vercel.com), crée un compte gratuit (plan
   **Hobby**, sans carte bancaire) et importe le dépôt.
3. Dans les réglages du projet Vercel, ajoute les mêmes variables
   d'environnement que dans `.env.local` (Project Settings > Environment
   Variables) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, et
   `NEXT_PUBLIC_SITE_URL` (mets l'URL Vercel finale, ex.
   `https://appanaelle.vercel.app`).
4. Déploie. Mets ensuite à jour la **Site URL** et les **Redirect URLs** dans
   Supabase (Authentication > URL Configuration) avec l'URL Vercel, pour que
   les emails de confirmation redirigent au bon endroit.
5. Le plan Hobby de Vercel impose une limite de ~4,5 Mo par requête vers une
   route API — c'est pourquoi les documents sont uploadés **directement**
   depuis le navigateur vers Supabase Storage (jamais via une route API
   Vercel).

## Architecture (aperçu)

```
src/
  app/
    (auth)/           pages login / signup (non protégées)
    (app)/             pages protégées (dashboard, matières, calendrier, ...)
    auth/confirm/      confirmation d'email (lien Supabase)
  components/
    ui/                composants de base (bouton, input, carte)
    auth/               formulaires de connexion / inscription
    layout/             coquille de l'application (nav mobile + desktop)
  lib/
    supabase/           clients Supabase (navigateur, serveur, middleware)
    actions/             Server Actions
  middleware.ts          rafraîchit la session et protège les routes privées
supabase/
  schema.sql              schéma complet (tables, RLS, bucket Storage)
```

## Économie de quota Gemini

- Les PDF sont analysés côté client (`pdfjs-dist`) : seul le **texte extrait**
  est envoyé à Gemini. Le PDF brut n'est envoyé (en vision) que si
  l'extraction ne donne rien (PDF scanné).
- Les photos de cours sont redimensionnées à 1600 px de large maximum avant
  envoi en base64.
- Toute fiche ou lot de questions généré est **mis en cache en base** : il
  n'est jamais régénéré automatiquement.
- Une seule génération à la fois, avec indicateur de progression.
- Les erreurs 429 (quota atteint) sont gérées avec un retry exponentiel puis
  un message clair invitant à réessayer le lendemain.
- Le fichier original est supprimé du Storage après extraction du texte
  (sauf option "conserver le document", désactivée par défaut), pour rester
  sous la limite de 1 Go du plan gratuit Supabase.
