# LCBconnect - Guide Projet

## Description
Application communautaire pour l'association "La Cerise sur le Bateau" (batellerie fluviale).
Stack: **Next.js 16 App Router** + **Supabase self-hosted** + **Tailwind CSS** + **shadcn/ui**.

## Deploiement
- **URL** : https://lcbconnect.swipego.app
- **Coolify UUID** : `jgkgcgwsosoos00ocogkwss8`
- **Deployer** : `curl -s "http://217.182.89.133:8000/api/v1/deploy?uuid=jgkgcgwsosoos00ocogkwss8&force=true" -H "Authorization: Bearer 1|FNcssp3CipkrPNVSQyv3IboYwGsP8sjPskoBG3ux98e5a576"`
- **Build** : `npm run build` puis `git push origin main` + deploy Coolify

## Supabase
- **API** : https://supabase-api.swipego.app
- **Dashboard** : https://supabase.swipego.app
- **Clefs dans** `.env.local` (PAS celles du CLAUDE.md global qui sont differentes)
- **SQL direct** : `POST https://supabase-api.swipego.app/pg/query` avec service role key en apikey + Authorization
- **Tables** : prefixe `lcb_` (lcb_profiles, lcb_posts, lcb_conversations, lcb_messages, etc.)
- **RLS** : active sur toutes les tables, policies dans `sql/002-rls-policies.sql`
- **Trigger** : `lcb_on_auth_user_created` cree automatiquement un lcb_profiles a l'inscription

## Structure
```
src/
  app/
    (app)/          # Pages authentifiees (feed, messages, carte, avis-batellerie, etc.)
    (auth)/         # Login, signup
    api/            # Routes API (auth, admin, nts, ais, members, weather)
  components/       # Composants par domaine (feed, messages, carte, avis, admin, etc.)
  lib/
    ais/manager.ts  # Singleton AIS avec 8 WebSocket paralleles
    supabase/       # Client, server, middleware, types
    constants.ts    # ROLES, role hierarchy
sql/                # Schema (001), RLS (002), triggers (003), storage (004)
```

## Roles utilisateur
- `membre` (niveau 0) - membre standard
- `ca` (niveau 1) - conseil d'administration
- `bureau` (niveau 2) - bureau, acces admin complet
- Statuts : `pending`, `approved`, `rejected`, `suspended`

## Fonctionnalites implementees

### Feed / Fil d'actualite
- Posts, commentaires, likes, signalements
- Types : standard, officiel_bureau, avis_batellerie

### Messagerie
- Conversations 1:1 et groupes
- Endpoint `/api/members` pour lister les membres (server-side, bypass RLS)
- Temps reel via Supabase Realtime

### Carte AIS (navires)
- Carte Leaflet/OpenStreetMap plein ecran
- AIS via `wss://stream.aisstream.io/v0/stream` (cle: `2be1c5db740b0c94f6db08696ed8cf6c1e748bec`)
- Proxy SSE server-side (`/api/ais/stream`) car AISStream bloque les WebSocket navigateur (Origin)
- Singleton `AISManager` (`src/lib/ais/manager.ts`) : 8 connexions paralleles par zone, cache memoire, auto-purge >10min
- Zones : Seine, Nord, Rhone-Saone, Rhin, Moselle, Oise-Aisne, Marne, Yonne-Bourgogne

### Avis a la batellerie
- API EuRIS NTS : `https://www.eurisportal.eu/api/v3/nts` (OData V4 : `$filter`, `$orderby`, `$top`)
- Filtrage Ile-de-France : fairways seine, marne, oise, val de loire - seine
- Cartes expandables avec details, badges couleur par limitation
- Lien direct EuRIS : `/nts-detail?ntsnumber={number}&organisation={organisation}`

### Admin
- Gestion membres (approuver, rejeter, suspendre, changer role, supprimer)
- Endpoint `/api/admin/members` (PATCH)

### Autres
- Evenements, documents, annuaire, plaintes, services, notifications
- Navigation sidebar + mobile bottom nav

## Conventions
- Composants client : `"use client"` en haut du fichier
- Pages serveur dans `src/app/(app)/` avec auth check + redirect
- Supabase client-side : `createClient()` depuis `@/lib/supabase/client`
- Supabase server-side : `createClient()` depuis `@/lib/supabase/server`
- Service role : `createServiceClient()` depuis `@/lib/supabase/server`
- Icones : lucide-react
- Dates : date-fns avec locale `fr`
- Toasts : sonner

## Points d'attention
- Les clefs Supabase dans `.env.local` sont DIFFERENTES de celles du CLAUDE.md global
- Le port PostgreSQL n'est PAS expose (Docker interne) → utiliser l'endpoint `/pg/query` pour les migrations
- `output: "standalone"` dans next.config pour le deploiement Coolify
- Leaflet necessite `{ ssr: false }` pour les imports dynamiques
- AISStream.io rejette les WebSocket avec header Origin → toujours passer par le proxy SSE serveur
