# AppAnaelle — révisions BTS SAM

Application web de révision pour le BTS Support à l'Action Managériale (SAM) :
fiches de synthèse, quiz et suivi de progression générés à partir des cours
(PDF ou photos), avec un paquet "à revoir" pour retravailler les erreurs et un
calendrier des évaluations.

Conçue pour tourner intégralement sur des offres **gratuites, sans carte
bancaire** : Vercel (Hobby), Supabase (Free) et l'API Groq (palier gratuit).

## Stack

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS 4
- [Supabase](https://supabase.com) : Auth, Postgres, Row Level Security, Storage
- [Groq](https://groq.com) (modèles open-weight du palier gratuit, appelés
  uniquement depuis des routes API serveur — la clé n'est jamais exposée au
  client). Le projet utilisait initialement Gemini (Google AI Studio) ; le
  palier gratuit de Gemini s'est révélé trop restrictif en pratique (20
  requêtes/jour sur les modèles Flash), d'où la bascule vers Groq, dont le
  palier gratuit est nettement plus généreux sans carte bancaire.

## Avancement

- [x] Étape 1 — Auth + schéma Supabase
- [x] Étape 2 — Upload de documents + extraction de texte
- [x] Étape 3 — Génération de fiches de révision
- [x] Étape 4 — Questions, score et reprise des erreurs
- [x] Étape 5 — Calendrier et tableau de bord

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
   fonctionnent, et ajoute ce domaine (avec `/**`) dans **Redirect URLs**.
5. Toujours dans **Authentication > Emails**, ouvre le template **"Reset
   Password"** et remplace son lien par défaut (qui utilise
   `{{ .ConfirmationURL }}`, un lien vers le serveur Supabase lui-même) par
   un lien direct vers l'application avec `{{ .TokenHash }}` :

   ```html
   <a href="{{ .SiteURL }}/reinitialiser-mot-de-passe?token_hash={{ .TokenHash }}&type=recovery">
     Réinitialiser mon mot de passe
   </a>
   ```

   C'est nécessaire car `{{ .ConfirmationURL }}` fait vérifier le lien à
   usage unique par le serveur Supabase **avant** qu'il n'atteigne
   l'application — hors, de nombreux clients mail (Gmail, Outlook...)
   pré-visitent automatiquement les liens reçus pour les scanner, ce qui
   consomme le token avant que l'utilisatrice ne clique elle-même, et le
   lien paraît alors "invalide" à l'usage. En passant directement le
   `token_hash` en paramètre vers `/reinitialiser-mot-de-passe`, la
   vérification n'a lieu qu'à la soumission du formulaire par
   l'utilisatrice (voir `src/components/auth/reset-password-form.tsx`),
   pas au simple chargement de la page.

   ⚠️ Sur les projets Supabase récents, le bouton **"Source"** du template
   (qui permet d'éditer le HTML brut) est verrouillé tant qu'aucun SMTP
   personnalisé n'est configuré. Il faut donc brancher un service SMTP
   gratuit avant de pouvoir faire cette modification :
   1. Crée un compte gratuit sur [Brevo](https://www.brevo.com) (ex-Sendinblue,
      300 emails/jour gratuits à vie, aucune carte bancaire requise).
   2. Dans Brevo, **Settings > Senders, Domains & Dedicated IPs > Senders** :
      ajoute et valide une adresse email d'expédition (le lien de validation
      part sur cette adresse).
   3. Dans Brevo, **SMTP & API > SMTP** : note l'hôte
      (`smtp-relay.brevo.com`), le port (`587`), l'identifiant (ton email de
      compte Brevo) et génère une clé SMTP.
   4. Dans Supabase, **Authentication > Emails**, clique sur **"Set up
      SMTP"** et renseigne ces informations (sender email = l'adresse
      validée à l'étape 2, sender name = `AppAnaelle`).
   5. Une fois le SMTP enregistré, le bouton **"Source"** du template
      devient éditable — reviens alors modifier le lien du template "Reset
      Password" comme indiqué ci-dessus.

## 2. Obtenir une clé Groq gratuite

1. Va sur [console.groq.com](https://console.groq.com) et crée un compte
   gratuit (aucune carte bancaire requise).
2. Dans le menu, va sur **API Keys → Create API Key**, donne-lui un nom (ex.
   `AppAnaelle`) et copie la clé générée (commence par `gsk_...`) →
   `GROQ_API_KEY`.
3. Le projet utilise deux modèles différents, configurables sans toucher au
   code :
   - `GROQ_TEXT_MODEL` (fiches, questions, correction) — par défaut
     `openai/gpt-oss-120b`.
   - `GROQ_VISION_MODEL` (lecture des photos de cours et PDF scannés) — par
     défaut `meta-llama/llama-4-scout-17b-16e-instruct`. Ce modèle doit
     obligatoirement supporter les entrées image ; si tu changes de modèle
     vision, vérifie sur [console.groq.com/docs/rate-limits](https://console.groq.com/docs/rate-limits)
     qu'il accepte bien les images et combien il en accepte par requête (5
     maximum pour Llama 4 Scout — voir `MAX_IMAGES_PER_VISION_CALL` dans
     `src/lib/documents/pipeline.ts` si ça change).
4. Les quotas gratuits évoluent régulièrement : vérifie-les sur
   **console.groq.com → Limite de débit** avant de partir sur un modèle en
   particulier, surtout la colonne RPD (requêtes par jour).

## 3. Installation locale

```bash
npm install
cp .env.example .env.local
# puis renseigne les valeurs Supabase et Groq dans .env.local
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
   `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `GROQ_TEXT_MODEL`,
   `GROQ_VISION_MODEL`, et `NEXT_PUBLIC_SITE_URL` (mets l'URL Vercel finale,
   ex. `https://appanaelle.vercel.app`).
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

## Économie de quota Groq

- Les PDF sont analysés côté client (`pdfjs-dist`) : seul le **texte extrait**
  est envoyé au modèle texte. Le PDF brut n'est envoyé (en vision, par lots
  de 5 pages max) que si l'extraction ne donne rien (PDF scanné).
- Les photos de cours sont redimensionnées à 1600 px de large maximum avant
  envoi en base64.
- Toute fiche ou lot de questions généré est **mis en cache en base** : il
  n'est jamais régénéré automatiquement.
- Une seule génération à la fois, avec indicateur de progression.
- Les erreurs 429 (quota atteint) sont gérées avec un retry exponentiel puis
  un message clair invitant à réessayer plus tard ; les 5xx (modèle
  momentanément indisponible) sont retentés de la même façon.
- Le fichier original est supprimé du Storage après extraction du texte
  (sauf option "conserver le document", désactivée par défaut), pour rester
  sous la limite de 1 Go du plan gratuit Supabase.
