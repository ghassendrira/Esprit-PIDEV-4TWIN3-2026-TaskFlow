# Fiche de revision Taskflow

## 1. Vision generale

Taskflow est une application geree en microservices.

Flux principal : Front Angular -> API Gateway -> microservice NestJS -> Prisma -> PostgreSQL.

L'idee est de separer les responsabilites :
- le front affiche les pages et gere l'experience utilisateur
- le gateway centralise les requetes entrantes
- chaque microservice gere un domaine metier precis
- la base de donnees stocke les donnees relationnelles

## 2. Architecture du back

### 2.1 API Gateway

Role : point d'entree unique pour le front.

Fichiers importants :
- `backend/api-gateway/src/app.module.ts` : module principal
- `backend/api-gateway/src/proxy.controller.ts` : routes metier generales
- `backend/api-gateway/src/auth.proxy.controller.ts` : routes auth, admin, roles, mot de passe, comptes bloques
- `backend/api-gateway/src/main.ts` : demarrage du gateway

Ce que fait le gateway :
- recoit les requetes du front
- les redirige vers le bon microservice
- evite au front de connaitre tous les services internes

### 2.2 Microservices

Services presents dans le projet :
- `backend/auth-service` : authentification, inscription, connexion, blocage, 2FA, roles
- `backend/tenant-service` : gestion des tenants
- `backend/business-service` : donnees metier generales
- `backend/invoice-service` : factures, lignes de facture, paiements
- `backend/expense-service` : depenses
- `backend/notification-service` : notifications
- `backend/audit-service` : journalisation / audit

Dans chaque service, on retrouve en general :
- `src/main.ts` : point de demarrage
- `src/app.module.ts` : assemblage du module principal
- `src/app.controller.ts` et `src/app.service.ts` : base NestJS
- `prisma/schema.prisma` : modele de donnees du service

### 2.3 Prisma et base de donnees

Prisma sert d'ORM : il fait le lien entre le code TypeScript et la base PostgreSQL.

Le fichier de reference principal pour la structure de la BD est :
- `docker-compose.yml` : configuration de PostgreSQL et pgAdmin

Dans le projet, la base PostgreSQL s'appelle `taskflow`.

Exemple important :
- dans `backend/invoice-service/prisma/schema.prisma`, on trouve les modeles `Invoice`, `InvoiceItem` et `Payment`

## 3. Architecture du front

Le front est dans `frontend/taskflow-web`.

### 3.1 `core`

Le dossier `core` contient ce qui est central et partage partout.

#### Guards

Fichier :
- `frontend/taskflow-web/src/app/core/guards/auth.guard.ts`

Role : controler l'acces aux routes.

Ce que tu dois retenir :
- un guard decide si un utilisateur peut entrer dans une page
- `authGuard` protege les pages privees
- `guestMatch` reserve certaines pages aux visiteurs non connectes
- `loggedInMatch` redirige un utilisateur deja connecte

#### Interceptor

Fichier :
- `frontend/taskflow-web/src/app/core/interceptors/jwt.interceptor.ts`

Role : intercepter chaque requete HTTP.

Ce que tu dois retenir :
- il ajoute le token JWT dans les headers
- il peut ajouter aussi l'identifiant du tenant
- il reagit aux erreurs `401` en deconnectant l'utilisateur

#### Services

Fichiers :
- `frontend/taskflow-web/src/app/core/services/api.service.ts`
- `frontend/taskflow-web/src/app/core/services/auth.service.ts`

Role : centraliser la logique technique et les appels API.

`api.service.ts` :
- base commune des requetes HTTP
- URL principale du gateway : `http://localhost:3000`

`auth.service.ts` :
- connexion et inscription
- gestion du token et de l'etat utilisateur
- roles et permissions
- changement / reset du mot de passe
- comptes bloques et debloquage admin

#### Models

Fichier :
- `frontend/taskflow-web/src/app/core/models/index.ts`

Role : definir les types partages.

Exemples :
- `AuthUser`
- `Role`
- `Tenant`
- `Invoice`

### 3.2 `shared`

Le dossier `shared` contient les composants reutilisables.

Il sert a eviter de dupliquer la meme UI partout.

Fichiers importants :
- `frontend/taskflow-web/src/app/shared/components/layout/layout.component.ts`
- `frontend/taskflow-web/src/app/shared/components/navbar/navbar.component.ts`
- `frontend/taskflow-web/src/app/shared/components/sidebar/sidebar.component.ts`
- composants UI reutilisables : cards, boutons, badges, tables, modal, loader

Role de chacun :
- `layout` : structure generale de l'application
- `navbar` : barre du haut
- `sidebar` : menu lateral
- `modal` : popup reutilisable
- `loader` : indicateur de chargement

### 3.3 `features`

Le dossier `features` contient les vraies pages fonctionnelles.

Exemples de pages :
- auth : login, register, forgot password, reset password, change password
- dashboard
- clients
- invoices
- expenses
- employees
- team
- onboarding
- admin
- settings

Idee a retenir :
- `core` = fondation technique
- `shared` = composants reutilisables
- `features` = pages metier

### 3.4 Demarrage du front

Fichiers importants :
- `frontend/taskflow-web/src/app/app.routes.ts`
- `frontend/taskflow-web/src/app/app.config.ts`

`app.routes.ts` :
- definit toutes les routes
- charge les pages en lazy loading
- applique les guards

`app.config.ts` :
- configure le router
- enregistre l'interceptor HTTP

## 4. Comment circule une requete

Exemple simple : connexion utilisateur.

1. L'utilisateur remplit le formulaire login dans le front.
2. `auth.service.ts` envoie la requete.
3. `jwt.interceptor.ts` ajoute les headers si besoin.
4. La requete arrive au gateway sur le port `3000`.
5. Le gateway redirige vers `auth-service`.
6. Le service verifie les identifiants dans PostgreSQL via Prisma.
7. Le service renvoie le resultat.
8. Le front met a jour l'etat utilisateur et navigue vers la bonne page.

## 5. Ports a connaitre

- gateway : `3000`
- auth-service : `3001`
- tenant-service : `3002`
- business-service : `3003`
- notification-service : `3004`
- invoice-service : `3005`
- expense-service : `3006`
- audit-service : `3007`
- front Angular : `4200`

## 6. Points importants a savoir expliquer

### Pourquoi microservices ?

- chaque domaine est isole
- on peut faire evoluer un service sans casser tout le reste
- le code est plus lisible par domaine
- les equipes peuvent travailler sur plusieurs services en parallele

### Pourquoi PostgreSQL et pas MongoDB ?

- les donnees sont relationnelles
- on a des liens forts entre users, tenants, factures, paiements, depenses
- les transactions sont importantes
- les jointures sont naturelles dans ce type d'application

### Pourquoi un gateway ?

- un seul point d'entree pour le front
- securite et simplification du routage
- le front ne connait pas les details internes des microservices

### Pourquoi `shared` et `features` separes ?

- `shared` garde les briques reutilisables
- `features` garde les pages metier
- on evite de melanger composants communs et pages fonctionnelles

## 7. Questions de revision rapides

### Back

1. C'est quoi un microservice ?
2. Quel est le role de l'API Gateway ?
3. Pourquoi le projet utilise NestJS ?
4. A quoi sert Prisma ?
5. Pourquoi PostgreSQL est un bon choix ici ?
6. Quel service gere l'authentification ?
7. Quel service gere les factures ?
8. Ou est definie la structure de la base de donnees ?
9. A quoi servent les fichiers `main.ts` dans chaque service ?
10. Pourquoi le gateway a plusieurs controllers proxy ?

### Front

1. C'est quoi un guard ?
2. C'est quoi un interceptor ?
3. Pourquoi mettre `authGuard` sur certaines routes ?
4. Quel est le role de `api.service.ts` ?
5. A quoi servent les models ?
6. Quelle difference entre `shared` et `features` ?
7. Pourquoi `app.routes.ts` est important ?
8. A quoi sert `app.config.ts` ?
9. Pourquoi utiliser un layout commun ?
10. Quel fichier ajoute le token JWT dans les requetes ?

### Architecture et metier

1. Explique le chemin d'une requete login du front jusqu'a la base.
2. Pourquoi le front passe par le gateway au lieu d'appeler chaque service directement ?
3. Pourquoi les comptes bloques sont geres cote auth ?
4. Pourquoi les factures ont un modele `Invoice` avec `InvoiceItem` ?
5. Comment un tenant peut influencer la navigation et les requetes ?

## 8. Reponses courtes a retenir

- Microservice : petit service autonome qui gere un domaine precis.
- Gateway : porte d'entree unique vers les services.
- Guard : filtre de navigation cote front.
- Interceptor : filtre les requetes HTTP cote front.
- Model : definition des types de donnees.
- Service : logique de traitement et d'acces aux donnees.
- Shared : composants reutilisables.
- Features : pages fonctionnelles.
- Prisma : ORM entre TypeScript et la base.
- PostgreSQL : base relationnelle adaptee aux donnees connectees.

## 9. Methode pour reussir l'oral

Quand on te pose une question, reponds toujours dans cet ordre :

1. Definition simple
2. Role dans Taskflow
3. Exemple concret dans le projet

Exemple :
- Un interceptor intercepte les requetes HTTP.
- Dans Taskflow, il ajoute le token JWT et le tenant.
- Concretement, il est defini dans `frontend/taskflow-web/src/app/core/interceptors/jwt.interceptor.ts`.

## 10. Resume ultra court

Taskflow = front Angular + gateway NestJS + microservices + Prisma + PostgreSQL.

Le front est organise en :
- `core` pour la technique
- `shared` pour le reutilisable
- `features` pour les pages metier

Le back est organise en :
- gateway pour centraliser
- services pour separer les domaines
- Prisma pour parler a PostgreSQL