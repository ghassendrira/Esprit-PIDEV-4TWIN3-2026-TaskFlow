# CLAUDE.md — Mémoire Technique Permanente
## TaskFlow — Business Management Platform

> Ce fichier est la mémoire technique de référence pour tout agent IA (Claude, Copilot, etc.).
> Il décrit l'architecture réelle, les règles, les commandes et les zones protégées du projet.
> **Ne jamais modifier ce fichier sans mettre à jour son contenu en conséquence.**

---

## 1. Project Overview

**Nom du projet :** TaskFlow  
**Type :** Application SaaS web full-stack multi-tenant  
**Contexte académique :** PIDEV — 4ème année ingénierie, Esprit School of Engineering, Tunis (2025–2026)  
**Équipe :** Nour Hasni, Ghassen Drira, Aziz Douagi, Med Karim Kebaili

### Objectif
TaskFlow est une plateforme de gestion d'entreprise destinée aux PME tunisiennes. Elle permet de gérer les factures, les dépenses, les clients, les équipes, et d'obtenir des analyses financières propulsées par l'IA.

### Grandes fonctionnalités
- Authentification JWT avec 2FA, RBAC (rôles & permissions)
- Architecture multi-tenant (isolation par `tenantId` + `businessId`)
- Gestion des factures (CRUD, statuts, PDF, envoi)
- Gestion des dépenses avec OCR et catégorisation IA
- Portail client
- Collaboration d'équipe (chat en temps réel via WebSocket)
- Onboarding entreprise
- Rapports et prédictions IA (segmentation, cashflow, anomalies, fraude, risque)
- Assistant IA financier (chatbot RAG + LLM)
- Notifications (email, in-app)
- Administration (gestion des utilisateurs, rôles, inscriptions, comptes bloqués)

---

## 2. Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular 21)                    │
│                  http://localhost:4200                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / REST
┌────────────────────────▼────────────────────────────────────┐
│              API GATEWAY (NestJS — port 3000)               │
│         Point d'entrée unique — proxy vers services         │
└──┬────────┬────────┬────────┬────────┬────────┬────────┬────┘
   │        │        │        │        │        │        │
 3001     3002     3003     3004     3005     3006     3008
auth-   tenant-  biz-    notif-  invoice- expense- audit-
service service  service  service  service  service  service
   │        │        │        │        │        │        │
   └────────┴────────┴────────┴────────┴────────┴────────┘
                         │
                  PostgreSQL 15
               (docker — port 5432)
                  7 bases séparées

 ML Service (Python/FastAPI — port 8000)
   └── Modèles : segmentation, cashflow, anomalies, fraude, risque
       (accès direct depuis frontend ou via gateway)

 Chatbot Finance (Python/FastAPI — port 8001 ou 8000)
   └── RAG + Qdrant Cloud + SentenceTransformers + Ollama (llama3)
       ZONE PROTÉGÉE — NE JAMAIS MODIFIER
```

### Composants
| Composant | Technologie | Port | Rôle |
|---|---|---|---|
| Frontend | Angular 21, TypeScript, TailwindCSS | 4200 | UI SaaS |
| API Gateway | NestJS (Node.js) | 3000 | Proxy central + module IA embarqué |
| auth-service | NestJS + Prisma | 3001 | Auth, users, rôles, 2FA, RBAC |
| tenant-service | NestJS + Prisma | 3002 | Tenants, abonnements |
| business-service | NestJS + Prisma | 3003 | Businesses, clients |
| notification-service | NestJS + Prisma + Socket.io | 3004 | Notifications, chat, PDF |
| invoice-service | NestJS + Prisma | 3005 | Factures, prédictions paiement |
| expense-service | NestJS + Prisma | 3006 | Dépenses, catégories |
| audit-service | NestJS + Prisma | 3008 | Journaux d'audit |
| ml-service | Python, FastAPI, scikit-learn | 8000 | ML : segmentation, cashflow, anomalies, fraude |
| chatbot-finance | Python, FastAPI, Qdrant, Ollama | 8001 | Assistant RAG finance — PROTÉGÉ |
| PostgreSQL | Docker (postgres:15) | 5432 | Base relationnelle principale |
| PgAdmin | Docker | 5050 | Interface admin DB |

### Services externes
- **Qdrant Cloud** — base vectorielle pour le chatbot RAG (`sa-east-1`, AWS)
- **Ollama** — LLM local (`llama3`) pour le chatbot et la génération de contenu
- **SentenceTransformers** — embeddings multilingues (`paraphrase-multilingual-MiniLM-L12-v2`)

---

## 3. Folder Structure

```
/                                   ← Racine du projet
├── CLAUDE.md                       ← CE FICHIER — mémoire technique de l'agent IA
├── docker-compose.yml              ← PROTÉGÉ — orchestration Docker complète
├── package.json                    ← Scripts de lancement racine (concurrently)
├── start-all.sh                    ← Script de démarrage complet (tous services)
├── kill-servers.sh                 ← Script d'arrêt de tous les services
├── architecture_projet.txt         ← Arbre de fichiers complet du projet
├── runtime-logs/                   ← Logs de chaque service (ne pas modifier)
│
├── backend/                        ← MODIFIABLE — microservices NestJS + services Python
│   ├── api-gateway/                ← Proxy central, module IA embarqué
│   │   └── src/
│   │       ├── ai/                 ← Module IA intégré (classifieur, prédiction délai)
│   │       ├── proxy.controller.ts ← Routes proxifiées vers les services
│   │       └── auth.proxy.controller.ts ← Proxy spécifique auth/admin/roles
│   ├── auth-service/               ← Auth, users, rôles, permissions, 2FA
│   ├── tenant-service/             ← Multi-tenant, abonnements
│   ├── business-service/           ← Businesses, clients, communications
│   ├── notification-service/       ← Notifications, chat WebSocket, PDF
│   ├── invoice-service/            ← Factures, statuts, prédictions
│   ├── expense-service/            ← Dépenses, catégories, approbation
│   ├── audit-service/              ← Journaux d'audit
│   ├── ml-service/                 ← Service ML Python (FastAPI)
│   │   ├── main.py                 ← API ML principale
│   │   ├── main_ai.py              ← API prédictions IA (fraude, anomalie, risque)
│   │   ├── database.py             ← Connexion PostgreSQL
│   │   ├── models/                 ← Modèles ML sérialisés (.pkl)
│   │   ├── Dockerfile              ← Image Docker ml-service
│   │   └── requirements.txt        ← Dépendances Python ML
│   ├── multi-tenant-design/        ← Référence de conception multi-tenant (non déployé)
│   └── seed-all.mjs                ← Script de seed toutes bases
│
├── frontend/
│   └── taskflow-web/               ← Application Angular 21
│       ├── src/app/
│       │   ├── core/               ← Guards, intercepteurs, services globaux, modèles
│       │   │   ├── guards/         ← auth.guard.ts, role.guard.ts
│       │   │   ├── interceptors/   ← jwt.interceptor.ts, tenant.interceptor.ts
│       │   │   └── services/       ← api.service.ts, auth.service.ts, etc.
│       │   ├── features/           ← Pages fonctionnelles (lazy-loaded)
│       │   │   ├── admin/          ← Gestion utilisateurs, rôles, inscriptions
│       │   │   ├── ai/             ← Classifieur dépenses, risque délai facture
│       │   │   ├── ai-assistant/   ← Interface chatbot finance
│       │   │   ├── auth/           ← Login, register, forgot/reset password
│       │   │   ├── chat/           ← Support chat, team chat
│       │   │   ├── clients/        ← Gestion clients
│       │   │   ├── dashboard/      ← Tableau de bord
│       │   │   ├── employees/      ← Gestion employés
│       │   │   ├── expenses/       ← Gestion dépenses
│       │   │   ├── invoices/       ← Gestion factures + détail
│       │   │   ├── ml/             ← Pages ML (segmentation, cashflow, anomalies, risque)
│       │   │   ├── onboarding/     ← Onboarding entreprise
│       │   │   ├── settings/       ← Paramètres
│       │   │   └── team/           ← Équipe
│       │   ├── shared/             ← Composants réutilisables (layout, navbar, sidebar, modal, UI)
│       │   ├── app.routes.ts       ← Routes Angular (lazy loading)
│       │   └── app.config.ts       ← Configuration de l'application
│       ├── angular.json            ← Configuration Angular CLI
│       ├── tailwind.config.js      ← Configuration TailwindCSS
│       └── package.json
│
└── chatbot-finance/                ← ZONE PROTÉGÉE — NE JAMAIS MODIFIER
    ├── app/
    │   └── main.py                 ← API FastAPI du chatbot RAG
    ├── data/                       ← Données RAG (chunks, embeddings, cleaned)
    │   ├── embeddings/             ← Embeddings pré-calculés
    │   ├── cleaned_final_v2/       ← Données nettoyées finales
    │   └── raw/                    ← Données brutes sources
    └── scripts/                    ← Scripts de préparation des données RAG
```

> **RÈGLE ABSOLUE :** `chatbot-finance/` est une zone protégée. Ne jamais modifier ce dossier sans demande explicite de l'utilisateur.

---

## 4. Protected Areas

Les zones suivantes ne doivent **jamais** être modifiées sans justification explicite et validation :

### Zone absolument protégée
| Zone | Raison |
|---|---|
| `chatbot-finance/` | Chatbot RAG production — pipeline fragile, embeddings précalculés |
| `chatbot-finance/data/` | Données vectorielles — toute modification invalide les embeddings |
| `chatbot-finance/app/main.py` | Logique RAG complète avec outils DB intégrés |

### Fichiers de configuration sensibles
| Fichier | Raison |
|---|---|
| `docker-compose.yml` | Orchestration complète — modifier un port casse tout |
| `backend/*/.env` | Variables d'environnement (JWT_SECRET, DATABASE_URL, etc.) |
| `backend/*/prisma/schema.prisma` | Schéma DB — toute modification = migration obligatoire |
| `backend/auth-service/prisma/migrations/` | Migrations existantes — ne jamais supprimer |
| `backend/ml-service/models/*.pkl` | Modèles ML sérialisés — ne pas écraser sans ré-entraînement |
| `backend/api-gateway/src/ai/*.dataset.ts` | Données d'entraînement IA embarquée |

### Fichiers de sécurité
| Fichier | Raison |
|---|---|
| `backend/auth-service/src/auth/` | Logique JWT, hachage, 2FA |
| `backend/auth-service/src/roles/rbac.guard.ts` | Guard RBAC global |
| `backend/expense-service/src/expenses/guards/expense-ownership.guard.ts` | Guard propriété |
| `frontend/taskflow-web/src/app/core/guards/` | Guards Angular |
| `frontend/taskflow-web/src/app/core/interceptors/jwt.interceptor.ts` | Injection JWT |

### Variables critiques (ne jamais committer en clair)
- `JWT_SECRET` (actuellement `change-me` → à changer en production)
- `QDRANT_API_KEY`
- `POSTGRES_PASSWORD` (`taskflow2026`)
- `PGADMIN_DEFAULT_PASSWORD`

---

## 5. Development Rules

### Règles générales
1. **Ne jamais casser l'existant.** Toute modification doit être rétrocompatible.
2. **Ne jamais supprimer une fonctionnalité existante** sans validation explicite.
3. **Comparer avant de remplacer** — lire le fichier source avant de le modifier.
4. **Fusionner proprement** — ne jamais écraser un contrôleur sans fusionner les routes.
5. **Éviter les doublons** — vérifier si un service, module ou DTO existe déjà.
6. **Respecter l'architecture actuelle** — chaque service a son rôle précis, ne pas les mélanger.
7. **Ne pas modifier les ports sans justification** — un changement de port casse le proxy gateway et le frontend.
8. **Ne pas modifier la base de données sans vérifier l'impact** — chaque schema.prisma est utilisé par plusieurs endpoints.
9. **Ne jamais toucher à `chatbot-finance/`** sauf demande explicite.
10. **Tester après chaque modification importante** (voir Testing Checklist section 14).

### Règles de nommage (NestJS)
- Controllers : `<feature>.controller.ts`
- Services : `<feature>.service.ts`
- Modules : `<feature>.module.ts`
- DTOs : `<action>-<feature>.dto.ts` ou regroupés dans `dto.ts`
- Guards : `<feature>.guard.ts`

### Règles de nommage (Angular)
- Composants : `<feature>.component.ts` (standalone, pas de NgModule)
- Services : `<feature>.service.ts` dans `core/services/`
- Guards : `<feature>.guard.ts` dans `core/guards/`
- Pages lazy-loaded : dans `features/<feature>/`
- Composants réutilisables : dans `shared/components/` ou `shared/ui/`

### Règles multi-tenant
- Tout appel API métier doit inclure les headers : `x-tenant-id`, `x-user-id`, `x-user-role`
- Ces headers sont injectés automatiquement depuis le JWT par le proxy controller
- Ne jamais bypasser le `TenantGuard` sans raison documentée

### Règles pour les appels cross-service (service-to-service)
- Les microservices NestJS qui appellent d'autres microservices **ne doivent pas** passer par l'API Gateway
- Les appels internes se font directement sur le port du service cible (ex: `http://localhost:3003/clients/internal/:id`)
- Les routes internes (`/internal/`) sont déclarées dans un contrôleur **séparé sans guards** (`ClientsInternalController`)
- **Jamais** passer un JWT dans les appels service-to-service — utiliser les routes `/internal/` dédiées
- Pattern : déclarer `XxxInternalController` (sans `@UseGuards`) AVANT `XxxController` (avec guards) dans `app.module.ts`
- Variable d'env recommandée : `BUSINESS_SERVICE_URL=http://localhost:3003` dans le `.env` de chaque service consommateur

### Règles SUPER_ADMIN
- Le rôle `ROLE_SUPER_ADMIN` a accès à **toutes** les données de tous les tenants
- Routes dédiées : `GET /clients/all`, `GET /businesses/all`, `GET /users/list`
- Le frontend détecte ce rôle via `AuthService.hasRole('ROLE_SUPER_ADMIN')` et adapte les appels API
- JWT contient les rôles avec le préfixe `ROLE_` (ex: `ROLE_SUPER_ADMIN`, `ROLE_BUSINESS_OWNER`)
- `JWT_EXPIRES_IN=604800` (7 jours en secondes) — **NE PAS** utiliser la chaîne `"7d"`

---

## 6. Integration Rules

Lors de l'intégration d'un projet ou dossier externe dans TaskFlow :

1. **Analyser avant d'intégrer** — lire la totalité du dossier source avant de copier quoi que ce soit.
2. **Ne pas copier-coller aveuglément** — vérifier les conflits de noms, de routes et de schémas DB.
3. **Répartir selon le rôle logique :**
   - Code backend NestJS → dans le microservice concerné (`backend/<service>/src/`)
   - Entités/modèles Prisma → dans `backend/<service>/prisma/schema.prisma` (avec migration)
   - DTOs → dans `backend/<service>/src/<feature>/dto/`
   - Controllers → dans `backend/<service>/src/<feature>/<feature>.controller.ts`
   - Services → dans `backend/<service>/src/<feature>/<feature>.service.ts`
   - Composants Angular → dans `frontend/taskflow-web/src/app/features/<feature>/`
   - Services Angular → dans `frontend/taskflow-web/src/app/core/services/`
   - Assets / images → dans `frontend/taskflow-web/public/`
   - Tests → dans `backend/<service>/test/` ou `frontend/taskflow-web/src/`
4. **Vérifier les routes** — s'assurer que la nouvelle route est proxifiée dans `proxy.controller.ts` si elle doit être accessible via le gateway.
5. **Vérifier les ports** — ne pas ajouter un service sur un port déjà utilisé.
6. **Ne supprimer le dossier source qu'après intégration vérifiée et testée.**
7. **Ne jamais intégrer du code dans `chatbot-finance/`** sauf demande explicite.

---

## 7. Backend Guide

### Stack
- **Langage :** TypeScript (Node.js 20)
- **Framework :** NestJS (architecture modulaire)
- **ORM :** Prisma (par service)
- **Base de données :** PostgreSQL 15
- **Authentification :** JWT (passport-jwt), bcrypt, 2FA (OTP)
- **Temps réel :** Socket.io (notification-service)
- **PDF :** PDFKit ou Puppeteer (notification-service)
- **ML/IA embarqué :** Naive Bayes, Random Forest (api-gateway/src/ai/)
- **Runtime ML :** Python + FastAPI (ml-service)

### Structure type d'un microservice NestJS
```
backend/<service>/
├── src/
│   ├── main.ts                  ← Bootstrap NestJS, port d'écoute
│   ├── app.module.ts            ← Module racine, imports
│   ├── app.controller.ts        ← Health check /
│   ├── app.service.ts           ← Service racine
│   ├── prisma.service.ts        ← Wrapper Prisma injectable
│   └── <feature>/
│       ├── <feature>.module.ts
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       ├── dto/
│       │   ├── create-<feature>.dto.ts
│       │   └── update-<feature>.dto.ts
│       └── guards/
│           └── <feature>.guard.ts
├── prisma/
│   ├── schema.prisma            ← Modèle de données
│   └── migrations/              ← Migrations (auth-service uniquement)
├── .env                         ← Variables d'environnement (PROTÉGÉ)
├── package.json
└── tsconfig.json
```

### Ports des services
| Service | Port |
|---|---|
| api-gateway | 3000 |
| auth-service | 3001 |
| tenant-service | 3002 |
| business-service | 3003 |
| notification-service | 3004 |
| invoice-service | 3005 |
| expense-service | 3006 |
| audit-service | 3008 |
| ml-service | 8000 |

### Commandes backend (par service)
```bash
# Installer les dépendances d'un service
cd backend/<service> && npm install

# Lancer un service en mode dev
cd backend/<service> && npm run start:dev

# Build d'un service
cd backend/<service> && npm run build

# Générer le client Prisma
cd backend/<service> && npx prisma generate

# Pousser le schéma Prisma (sans migration)
cd backend/<service> && npx prisma db push

# Créer une migration Prisma
cd backend/<service> && npx prisma migrate dev --name <nom>

# Tests d'un service
cd backend/<service> && npm run test
cd backend/<service> && npm run test:e2e

# Lancer le ml-service Python
cd backend/ml-service && pip install -r requirements.txt
cd backend/ml-service && uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# ou pour le service IA avancé :
cd backend/ml-service && uvicorn main_ai:app --host 0.0.0.0 --port 8002 --reload
```

### Sécurité backend
- JWT extrait et propagé automatiquement par le proxy controller (gateway)
- Headers propagés : `Authorization`, `x-tenant-id`, `x-user-id`, `x-user-role`
- Guard RBAC : `RbacGuard` dans auth-service
- Guard tenant : `TenantGuard` dans invoice-service, expense-service
- Guard propriété : `ExpenseOwnershipGuard` dans expense-service
- Soft delete sur toutes les entités (champ `deletedAt`)

### Routes internes (cross-service sans JWT)
Pattern établi pour les appels service-to-service :

| Route interne | Service | Accès | Usage |
|---|---|---|---|
| `GET /clients/internal/:id` | business-service:3003 | Sans JWT | Récupérer un client par ID |
| `GET /clients/internal-by-business/:businessId` | business-service:3003 | Sans JWT | Tous les clients d'un business (batch) |

**Implémentation dans le service consommateur (ex: invoice-service) :**
```typescript
private get businessServiceUrl() {
  return process.env.BUSINESS_SERVICE_URL || 'http://localhost:3003';
}

private async fetchClient(clientId: string): Promise<ClientRecord | null> {
  const response = await fetch(`${this.businessServiceUrl}/clients/internal/${encodeURIComponent(clientId)}`);
  if (!response.ok) return null;
  return (await response.json()) as ClientRecord;
}

private async fetchClientsByBusiness(businessId: string): Promise<Record<string, ClientRecord>> {
  const response = await fetch(`${this.businessServiceUrl}/clients/internal-by-business/${encodeURIComponent(businessId)}`);
  if (!response.ok) return {};
  const list = await response.json() as ClientRecord[];
  const map: Record<string, ClientRecord> = {};
  for (const c of list) { if (c?.id) map[c.id] = c; }
  return map;
}
```

**Implémentation dans le service fournisseur (business-service) :**
```typescript
// ClientsInternalController — SANS @UseGuards — pour usage interne uniquement
@Controller('clients')
export class ClientsInternalController {
  @Get('internal/:id')
  internalGetById(@Param('id') id: string) { return this.service.get(id); }

  @Get('internal-by-business/:businessId')
  internalByBusiness(@Param('businessId') bid: string) { return this.service.listByBusiness(bid); }
}

// Dans app.module.ts : déclarer ClientsInternalController AVANT ClientsController
controllers: [AppController, BusinessController, ClientsInternalController, ClientsController],
```

---

## 8. Frontend Guide

### Stack
- **Framework :** Angular 21 (standalone components, signal-based)
- **Langage :** TypeScript
- **CSS :** TailwindCSS + SCSS global
- **Icônes :** Font Awesome
- **HTTP :** Angular HttpClient via `ApiService` (base URL configurable)
- **Temps réel :** Socket.io-client (chat)
- **Package manager :** npm 11.6.1

### Structure
```
frontend/taskflow-web/src/app/
├── core/
│   ├── guards/           ← auth.guard.ts (guestMatch / loggedInMatch), role.guard.ts
│   ├── interceptors/     ← jwt.interceptor.ts, tenant.interceptor.ts
│   ├── models/           ← index.ts (types TypeScript)
│   └── services/         ← Services Angular (API, auth, chat, invoices, etc.)
├── features/             ← Pages lazy-loaded par route
│   ├── admin/            ← /admin/registrations, /admin/password-requests, /admin/blocked-accounts, /admin/roles
│   ├── ai/               ← /ai/expense-classifier, /ai/invoice-delay-risk
│   ├── ai-assistant/     ← /ai-assistant (chatbot interface)
│   ├── auth/             ← /auth/login, /auth/register, /forgot-password, /reset-password
│   ├── chat/             ← /support, /team (chat temps réel)
│   ├── clients/          ← /clients
│   ├── dashboard/        ← /dashboard
│   ├── employees/        ← /employees, /employees/create
│   ├── expenses/         ← /expenses
│   ├── invoices/         ← /invoices, /invoices/:id
│   ├── ml/               ← /ml/segmentation, /ml/cashflow, /ml/anomalies, /ml/risk
│   ├── onboarding/       ← /onboarding/*
│   ├── security/         ← /security-questions
│   ├── settings/         ← /settings
│   └── team/             ← /team
└── shared/
    ├── components/       ← layout, navbar, sidebar, modal, loader
    └── ui/               ← tf-badge, tf-button, tf-card, tf-table
```

### Routes principales
| Route | Composant | Auth requise |
|---|---|---|
| `/home` | HomeComponent | Non |
| `/auth/login` | LoginComponent | Invité seulement |
| `/auth/register` | RegisterComponent | Invité seulement |
| `/dashboard` | DashboardComponent | Oui |
| `/invoices` | InvoicesComponent | Oui |
| `/invoices/:id` | InvoiceDetailComponent | Oui |
| `/expenses` | ExpensesComponent | Oui |
| `/clients` | ClientsComponent | Oui |
| `/ml/segmentation` | SegmentationComponent | Oui |
| `/ml/cashflow` | CashflowComponent | Oui |
| `/ml/anomalies` | AnomaliesComponent | Oui |
| `/ml/risk` | RiskComponent (payment-risk) | Oui |
| `/ai-assistant` | AiAssistantComponent | Oui |
| `/support` | SupportChatComponent | Oui |
| `/admin/roles` | RolesPermissionsComponent | Oui + Admin |

### Service API central
- **Fichier :** `core/services/api.service.ts`
- **Base URL :** `http://localhost:3000` (API Gateway)
- Toutes les requêtes HTTP passent par `ApiService.get/post/put/patch/delete`
- Le `JwtInterceptor` injecte automatiquement le token `Authorization: Bearer <token>`
- Le `TenantInterceptor` injecte `x-tenant-id` depuis le profil utilisateur

### Commandes frontend
```bash
cd frontend/taskflow-web

# Installer les dépendances
npm install

# Lancer en mode dev (port 4200)
npm start
# ou
ng serve --port 4200 --no-open

# Build de production
npm run build

# Tests unitaires
npm test

# Build watch (dev)
npm run watch
```

---

## 9. Chatbot Guide

> **RÈGLE ABSOLUE : Toute modification du dossier `chatbot-finance/` est INTERDITE sauf demande explicite de l'utilisateur.**

### Emplacement
```
chatbot-finance/
├── app/
│   └── main.py          ← API FastAPI complète du chatbot RAG
├── data/
│   ├── raw/             ← Documents sources (PDF, DOCX, CSV, etc.)
│   ├── text/            ← Textes extraits
│   ├── cleaned/         ← Textes nettoyés
│   ├── cleaned_final/   ← Première version nettoyée finale
│   ├── cleaned_final_v2/← Version finale v2 (production)
│   ├── chunks/          ← Chunks découpés pour RAG
│   └── embeddings/      ← Embeddings vectoriels pré-calculés
└── scripts/             ← Pipeline de préparation des données
    ├── pdf_to_text.py
    ├── docx_to_text.py
    ├── csv_to_text.py
    ├── jsonl_to_text.py
    ├── clean_texts.py
    ├── clean_formulas.py
    ├── structure_formulas.py
    ├── fix_and_deduplicate.py
    ├── final_dedup_pass.py
    └── create_embeddings.py
```

### Rôle
Chatbot RAG (Retrieval-Augmented Generation) spécialisé en finance pour les utilisateurs de TaskFlow. Répond aux questions sur la comptabilité, les ratios financiers, les formules de gestion, etc. Intègre également des outils pour appeler les APIs du backend (données réelles de l'entreprise).

### Technologies détectées
| Technologie | Rôle |
|---|---|
| FastAPI | Framework web Python |
| Qdrant Cloud | Base vectorielle hébergée (embeddings) |
| SentenceTransformers | Modèle d'embedding (`paraphrase-multilingual-MiniLM-L12-v2`) |
| Ollama + llama3 | LLM local pour la génération de réponses |
| NumPy | Calcul des scores de similarité |
| httpx | Appels HTTP vers les APIs backend (outils) |
| pydantic | Validation des modèles de données |

### Configuration (variables d'environnement)
```
QDRANT_URL=https://3a4bb531-ece8-4692-be46-503e6d16a10a.sa-east-1-0.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=<clé JWT — NE PAS COMMITTER>
QDRANT_COLLECTION=finance_chatbot
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
EMBED_MODEL=paraphrase-multilingual-MiniLM-L12-v2
TOP_K=5
GATEWAY_URL=http://localhost:3000
```

### Dépendances visibles (à installer)
```
fastapi
uvicorn
qdrant-client
sentence-transformers
numpy
httpx
pydantic
```

### Commandes utiles (consultation seulement — ne pas modifier)
```bash
# Lancer le chatbot (depuis start-all.sh — ne pas modifier)
cd chatbot-finance
pip install fastapi uvicorn qdrant-client sentence-transformers numpy httpx pydantic
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Vérifier que le chatbot tourne
curl http://localhost:8001/health

# Régénérer les embeddings (pipeline complet — NE PAS lancer sans validation)
# python scripts/pdf_to_text.py && python scripts/clean_texts.py && python scripts/create_embeddings.py
```

### Interface frontend
Le composant `AiAssistantComponent` (`features/ai-assistant/ai-assistant.component.ts`) appelle le chatbot via `AiChatService` (`core/services/ai-chat.service.ts`). La route proxy correspondante dans l'API Gateway doit exister (vérifier `proxy.controller.ts` avant tout changement de route).

---

## 10. Database Guide

### Type
**PostgreSQL 15** — hébergé en local via Docker

### Architecture multi-base
Chaque microservice possède sa propre base de données (isolation par service) :

| Service | Base de données | URL |
|---|---|---|
| auth-service | `taskflow_auth` | `postgresql://postgres:taskflow2026@localhost:5432/taskflow_auth` |
| tenant-service | `taskflow_tenant` | `postgresql://postgres:taskflow2026@localhost:5432/taskflow_tenant` |
| business-service | `taskflow_business` | `postgresql://postgres:taskflow2026@localhost:5432/taskflow_business` |
| notification-service | `taskflow_notification` | `postgresql://postgres:taskflow2026@localhost:5432/taskflow_notification` |
| invoice-service | `taskflow_invoice` | `postgresql://postgres:taskflow2026@localhost:5432/taskflow_invoice` |
| expense-service | `taskflow_expense` | `postgresql://postgres:taskflow2026@localhost:5432/taskflow_expense` |
| audit-service | `taskflow_audit` | `postgresql://postgres:taskflow2026@localhost:5432/taskflow_audit` |

### ORM : Prisma
Chaque service contient : `backend/<service>/prisma/schema.prisma`

### Entités principales par service

**auth-service :** `User`, `Role`, `Permission`, `UserTenantMembership`, `SecurityQuestion`, `PasswordResetRequest`

**tenant-service :** `Tenant` (+ relations abonnements)

**business-service :** `Business`, `Client`, `ClientCommunication`

**invoice-service :** `Invoice` (statuts : DRAFT, SENT, PAID, OVERDUE, CANCELED), `InvoicePrediction` (FRAUD_DETECTION, ANOMALY_DETECTION, RISK_ASSESSMENT)

**expense-service :** `Expense` (statuts : PENDING, APPROVED, REJECTED), `ExpenseCategory`

**notification-service :** `ChatRoom`, `ChatMessage` (types : FREE_TEXT, PREDEFINED_QUESTION, AUTOMATED_RESPONSE), `PredefinedQuestion`, `Notification`

### Règles avant toute modification DB
1. Lire le `schema.prisma` complet du service concerné avant toute modification.
2. Vérifier l'impact sur les autres services (les IDs sont partagés entre services via les headers).
3. Créer une migration (`npx prisma migrate dev`) — ne jamais modifier la DB directement en prod.
4. Ne jamais supprimer un champ sans vérifier tous les usages dans le code.
5. Utiliser le soft delete (`deletedAt`) — ne jamais supprimer physiquement un enregistrement.
6. Tester avec `npx prisma db push` en dev avant de créer une migration formelle.

### Commandes DB
```bash
# Accéder à PgAdmin
open http://localhost:5050
# Email : nourhasni@taskflow.com / Password : nourhasni2002

# Connexion psql directe
docker exec -it taskflow-postgres psql -U postgres

# Lister les bases
\l

# Générer le client Prisma (par service)
cd backend/<service> && npx prisma generate

# Pousser le schéma sans migration
cd backend/<service> && npx prisma db push

# Seed toutes les bases
cd backend && node seed-all.mjs

# Visualiser le schéma (Prisma Studio)
cd backend/<service> && npx prisma studio
```

---

## 11. API Guide

### Point d'entrée unique
**API Gateway :** `http://localhost:3000`
Toutes les requêtes frontend passent par ce point d'entrée. Le gateway proxifie vers les services downstream.

### Conventions d'URL
```
GET/POST   /auth/*                              → auth-service:3001
GET/POST   /tenant/*                            → auth-service:3001 (tenant dans auth)
GET/POST   /business/*                          → business-service:3003
GET/POST   /businesses/all                      → business-service:3003 (SUPER_ADMIN, sans JWT guard)
GET/POST   /clients/*                           → business-service:3003
GET        /clients/all                         → business-service:3003 (SUPER_ADMIN uniquement)
GET        /clients/internal/:id                → business-service:3003 (service-to-service, sans JWT)
GET        /clients/internal-by-business/:bid   → business-service:3003 (service-to-service, sans JWT)
GET/POST   /invoices/*                          → invoice-service:3005
POST       /invoices/report/unpaid              → invoice-service:3005 (rapport IA Ollama)
GET/POST   /expenses/*                          → expense-service:3006
GET/POST   /categories/*                        → expense-service:3006
GET/POST   /notifications/*                     → notification-service:3004
GET/POST   /chat/*                              → notification-service:3004
GET/POST   /pdf/*                               → notification-service:3004
GET/POST   /admin/*                             → auth-service:3001
GET/POST   /roles/*                             → auth-service:3001
GET        /users/list                          → auth-service:3001 (SUPER_ADMIN: tous les users)
GET/POST   /ai/*                                → api-gateway (module IA embarqué, port 3000)
GET/POST   /ml/*                                → ml-service:8000 (via proxy ou direct)
```

> **IMPORTANT :** Les routes `/clients/internal/*` et `/businesses/all` ne passent PAS par le proxy de l'API Gateway (elles sont directes service-to-service). **Ne jamais les exposer publiquement via le gateway.**

### Contrôleurs principaux dans l'API Gateway
- `proxy.controller.ts` — toutes les routes proxifiées (business, invoices, expenses, clients, notifications, etc.)
- `auth.proxy.controller.ts` — routes auth, admin, roles
- `ai/ai.controller.ts` — routes IA embarquée (`/ai/expense-classifier/predict`, `/ai/invoice-delay/predict`)

### Règles pour ajouter une nouvelle route
1. Définir le contrôleur dans le microservice concerné.
2. Tester la route directement sur le port du service (ex: `curl http://localhost:3003/business/...`).
3. Ajouter la route proxifiée dans `backend/api-gateway/src/proxy.controller.ts` ou `auth.proxy.controller.ts`.
4. Vérifier la propagation des headers (`x-tenant-id`, `x-user-id`, `x-user-role`, `Authorization`).
5. Mettre à jour le service Angular correspondant dans `frontend/taskflow-web/src/app/core/services/`.
6. Tester l'appel complet via `http://localhost:3000/<nouvelle-route>`.

### Règles pour ne pas casser les routes existantes
- Ne jamais renommer une route sans mettre à jour simultanément : le proxy controller ET le service Angular.
- Ne jamais changer la structure du body d'une requête sans mettre à jour les DTOs ET les interfaces TypeScript frontend.
- Conserver la rétrocompatibilité : si une route change, maintenir l'ancienne avec un `@deprecated` ou une redirection.

---

## 12. Docker / Deployment Guide

### Fichier Docker principal
`docker-compose.yml` à la racine du projet.

### Services Docker
| Service Docker | Image | Port | Rôle |
|---|---|---|---|
| `taskflow-postgres` | postgres:15 | 5432 | Base de données principale |
| `taskflow-pgadmin` | dpage/pgadmin4 | 5050 | Interface admin PostgreSQL |
| `taskflow-auth-service` | node:20-alpine | 3001 | auth-service |
| `taskflow-tenant-service` | node:20-alpine | 3002 | tenant-service |
| `taskflow-business-service` | node:20-alpine | 3003 | business-service |
| `taskflow-notification-service` | node:20-alpine | 3004 | notification-service |
| `taskflow-invoice-service` | node:20-alpine | 3005 | invoice-service |
| `taskflow-expense-service` | node:20-alpine | 3006 | expense-service |
| `taskflow-api-gateway` | node:20-alpine | 3000 | API Gateway |

### Volumes Docker
- `postgres-data` — données PostgreSQL persistantes
- `pgadmin-data` — configuration PgAdmin persistante

### Variables d'environnement Docker (ne pas modifier sans impact)
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=taskflow2026
POSTGRES_DB=taskflow
JWT_SECRET=change-me   ← À CHANGER EN PRODUCTION
```

### Commandes Docker
```bash
# Démarrer uniquement PostgreSQL + PgAdmin (depuis la racine)
docker compose up -d postgres pgadmin

# Démarrer tous les services Docker
docker compose up -d

# Vérifier l'état des containers
docker compose ps

# Arrêter tous les containers (sans supprimer les volumes)
docker compose stop

# Arrêter et supprimer les containers (volumes conservés)
docker compose down

# Arrêter et supprimer containers + volumes (DESTRUCTIF)
docker compose down -v

# Voir les logs d'un service
docker compose logs -f auth-service

# Rebuild d'un service (si Dockerfile modifié)
docker compose build <service>

# Build du ml-service (Dockerfile dédié)
docker build -t taskflow-ml-service ./backend/ml-service
```

### Notes de déploiement
- Le `docker-compose.yml` actuel est configuré pour le développement (mode `start:dev`).
- Pour la production : remplacer `npm run start:dev` par `npm run start:prod` et builder les images.
- Le `ml-service` possède son propre `Dockerfile` (`backend/ml-service/Dockerfile`) mais n'est pas dans `docker-compose.yml` — il se lance séparément.
- Le `chatbot-finance` se lance séparément via `uvicorn` (non dockerisé à ce stade).

---

## 13. Commands

### Installation complète
```bash
# 1. Démarrer la base de données
docker compose up -d postgres pgadmin

# 2. Installer toutes les dépendances backend (depuis la racine)
for service in api-gateway auth-service tenant-service business-service notification-service invoice-service expense-service audit-service; do
  echo "Installing $service..."
  cd backend/$service && npm install && cd ../..
done

# 3. Générer les clients Prisma et pousser les schémas
for service in auth-service tenant-service business-service notification-service invoice-service expense-service audit-service; do
  cd backend/$service && npx prisma generate && npx prisma db push && cd ../..
done

# 4. Installer les dépendances frontend
cd frontend/taskflow-web && npm install && cd ../..

# 5. Seeder les bases (optionnel)
cd backend && node seed-all.mjs && cd ..

# 6. Installer les dépendances Python (ML service)
cd backend/ml-service && pip install -r requirements.txt && cd ../..

# 7. Installer les dépendances Python (chatbot — NE PAS MODIFIER le code)
cd chatbot-finance && pip install fastapi uvicorn qdrant-client sentence-transformers numpy httpx pydantic && cd ..
```

### Lancement complet (script officiel)
```bash
# Méthode recommandée — lance tout le projet
chmod +x start-all.sh
./start-all.sh

# Arrêter tous les services
chmod +x kill-servers.sh
./kill-servers.sh
```

### Lancement backend (services individuels)
```bash
# API Gateway
cd backend/api-gateway && npm run start:dev

# Auth Service
cd backend/auth-service && npm run start:dev

# Business Service
cd backend/business-service && npm run start:dev

# Invoice Service
cd backend/invoice-service && npm run start:dev

# Expense Service
cd backend/expense-service && npm run start:dev

# Notification Service
cd backend/notification-service && npm run start:dev

# Tenant Service
cd backend/tenant-service && npm run start:dev

# Audit Service
cd backend/audit-service && npm run start:dev

# Tous les services backend en parallèle (depuis la racine)
npm run start:services
```

### Lancement frontend
```bash
cd frontend/taskflow-web
npm start
# Application disponible sur http://localhost:4200
```

### Lancement ML Service (Python)
```bash
cd backend/ml-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Lancement Docker (DB uniquement)
```bash
# Depuis la racine
npm run start:db         # docker compose up -d
npm run stop:db          # docker compose down
```

### Tests
```bash
# Tests unitaires d'un service
cd backend/<service> && npm run test

# Tests e2e d'un service
cd backend/<service> && npm run test:e2e

# Tests frontend
cd frontend/taskflow-web && npm test

# Build backend (vérification compilation)
cd backend/<service> && npm run build
```

### Build
```bash
# Build d'un microservice
cd backend/<service> && npm run build

# Build frontend (production)
cd frontend/taskflow-web && npm run build
```

### Vérification Git
```bash
git status
git log --oneline -10
git branch -a
git diff
git diff -- chatbot-finance/
```

---

## 14. Testing Checklist

Appliquer cette checklist après chaque modification importante :

```
BACKEND
[ ] Build du service modifié : cd backend/<service> && npm run build
[ ] Tests unitaires         : cd backend/<service> && npm run test
[ ] Tests e2e               : cd backend/<service> && npm run test:e2e
[ ] Service démarre         : npm run start:dev (aucune erreur dans les logs)
[ ] Routes modifiées testées via curl ou Postman
[ ] Headers multi-tenant propagés correctement

FRONTEND
[ ] Build Angular           : cd frontend/taskflow-web && npm run build
[ ] Tests                   : cd frontend/taskflow-web && npm test
[ ] Aucune erreur TypeScript au démarrage

BASE DE DONNÉES
[ ] Prisma generate réussi  : npx prisma generate
[ ] Schema push réussi      : npx prisma db push (ou migration)
[ ] Données non corrompues  : vérifier via PgAdmin (http://localhost:5050)
[ ] Soft delete respecté (deletedAt)

INTÉGRATION
[ ] Application complète démarre : ./start-all.sh
[ ] Route testée via http://localhost:3000/<route> (API Gateway)
[ ] Interface Angular fonctionne : http://localhost:4200
[ ] Aucune régression sur les fonctionnalités existantes

CHATBOT — VÉRIFICATION CRITIQUE
[ ] Aucun fichier modifié dans chatbot-finance/
    git diff -- chatbot-finance/  → doit être VIDE
[ ] Chatbot répond encore correctement (si actif)

GIT
[ ] git status propre (pas de fichiers non voulus)
[ ] Commit avec message descriptif
[ ] Pas de credentials ni secrets commités
```

---

## 15. Git Safety Workflow

### Workflow standard avant toute modification
```bash
# 1. Vérifier l'état actuel
git status

# 2. Vérifier les différences
git diff

# 3. S'assurer que chatbot-finance n'a PAS été modifié
git diff -- chatbot-finance/
# → Ce diff doit être VIDE. Si non, annuler immédiatement.

# 4. Créer une branche dédiée
git checkout -b feature/nom-de-la-tache

# 5. Travailler sur la branche...

# 6. Avant de commit : vérifier encore
git status
git diff --cached
git diff -- chatbot-finance/

# 7. Ajouter uniquement les fichiers voulus
git add backend/<service>/src/<feature>/<fichier>.ts
# NE PAS faire : git add . (risque d'ajouter des fichiers non voulus)

# 8. Commit avec message clair
git commit -m "feat(<service>): description courte de la modification"

# 9. Fusionner proprement
git checkout main
git merge --no-ff feature/nom-de-la-tache
```

### Conventions de commit
```
feat(<scope>):     nouvelle fonctionnalité
fix(<scope>):      correction de bug
docs(<scope>):     documentation
style(<scope>):    formatage
refactor(<scope>): refactoring sans changement fonctionnel
test(<scope>):     ajout/modification de tests
chore(<scope>):    tâches de maintenance
```

### Commandes Git de sécurité
```bash
# Voir les branches
git branch -a

# Annuler les modifications non committées d'un fichier
git checkout -- <fichier>

# Annuler TOUTES les modifications non committées (ATTENTION)
git checkout -- .

# Revenir au dernier commit propre
git reset --hard HEAD

# Voir les fichiers modifiés dans un commit
git show --stat <commit-hash>

# Vérifier les différences entre branches
git diff main..feature/nom-de-la-tache

# Vérification finale — chatbot intact
git log --oneline -- chatbot-finance/
# → Aucun commit récent ne doit apparaître sauf ceux existants
```

---

## 16. Données de Référence & Comptes Admin

### Counts réels en base (28 avril 2026)
| Entité | Count | Base | Endpoint |
|---|---|---|---|
| Users | 2 577 | `taskflow_auth` | `GET /users/list` (SUPER_ADMIN) |
| Tenants | 13 | `taskflow_auth` | - |
| Businesses | 455 | `taskflow_business` | `GET /businesses/all` |
| Clients | 3 015 | `taskflow_business` | `GET /clients/all` (SUPER_ADMIN) |
| Invoices | 3 084 | `taskflow_invoice` | - |
| Expenses | 4 666 | `taskflow_expense` | - |

### Compte Admin de référence
```
Email    : admin@taskflow.local
Password : Admin1234!
Rôles    : ROLE_SUPER_ADMIN + ROLE_BUSINESS_OWNER
TenantId : 34a9e451-8fc5-400e-b152-5464d8930c20
BusinessId (Reparation) : f92e41f7-b1a3-487c-b4b5-112a61dd4405
```

### JWT — règles critiques
```
Route login  : POST /auth/signin
Réponse      : { token: "..." }  ← clé "token", pas "access_token"
Format rôles : avec préfixe ROLE_ (ex: ROLE_SUPER_ADMIN)
Expiration   : JWT_EXPIRES_IN=604800 (secondes) — NE PAS utiliser la chaîne "7d"
```

### Variables d'environnement cross-service
```
# Dans invoice-service/.env
BUSINESS_SERVICE_URL=http://localhost:3003
```

---

## 17. Bugs Corrigés — Historique

### Bug : Routes clients proxy pointaient vers auth-service (3001) au lieu de business-service (3003)
- **Fichier :** `backend/api-gateway/src/proxy.controller.ts`
- **Cause :** Toutes les routes `/clients/*` pointaient vers `localhost:3001` (auth-service) au lieu de `localhost:3003` (business-service)
- **Fix :** Correction de toutes les URLs + ajout route `GET /clients/all` pour SUPER_ADMIN

### Bug : Rapport IA affichait "Unknown client" pour tous les clients
- **Fichier :** `backend/invoice-service/src/invoices/invoices.service.ts`
- **Cause :** `fetchClient()` appelait `GET /clients/:id` sur le business-service sans JWT → `401 Unauthorized` → `null` retourné → nom = "Unknown client"
- **Fix appliqué :**
  1. Ajout de `ClientsInternalController` dans business-service (routes sans guards pour usage interne)
  2. `fetchClient()` utilise maintenant `GET /clients/internal/:id` (sans JWT)
  3. Ajout de `fetchClientsByBusiness()` pour chargement batch (1 requête au lieu de N)
  4. `generateUnpaidReport()` utilise le batch puis fallback individuel
- **Résultat :** Rapport IA génère avec vrais noms (ex: "Aziz Douagi", "rania")

---

## Notes finales pour l'agent IA

1. **Ce fichier CLAUDE.md remplace l'analyse complète du projet.** Ne pas réanalyser si ce fichier est à jour.
2. **Mise à jour de ce fichier :** mettre à jour CLAUDE.md dès qu'une modification architecturale majeure est apportée (nouveau service, nouveau port, nouvelle DB, nouveau composant Angular majeur).
3. **Priorité absolue :** `chatbot-finance/` ne doit jamais être modifié sauf demande explicite.
4. **Confiance aux ports :** les ports définis dans ce fichier sont les ports réels du projet. Ne pas les changer.
5. **Architecture multi-tenant :** toujours propager `tenantId` et `businessId` dans les nouvelles fonctionnalités.
6. **Prisma par service :** chaque service a son propre schéma Prisma et sa propre base. Ne pas mélanger les schémas.
7. **Appels cross-service :** toujours utiliser les routes `/internal/` sans JWT. Ne jamais appeler une route protégée depuis un autre microservice.
8. **SUPER_ADMIN :** détecté via `hasRole('ROLE_SUPER_ADMIN')` côté frontend. Routes dédiées `/all` côté backend avec `@Roles(Role.SUPER_ADMIN)`.

---

*Fichier généré le 28 avril 2026 — TaskFlow PIDEV 4TWIN3 Esprit 2025-2026*
*Dernière mise à jour : 28 avril 2026 — Fix rapport IA + routes internes cross-service + accès SUPER_ADMIN complet*


