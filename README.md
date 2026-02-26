# TaskFlow (MVP) – Registration Approval Flow

This workspace contains:

- `backend/` – NestJS + Prisma + PostgreSQL
- `frontend/` – Angular (standalone)

## 1) Prerequisites

- Node.js (you already have it)
- PostgreSQL (local install) **or** Docker Desktop (recommended)

## 2) Database

### Option A – Docker (PostgreSQL)

1. Start Docker Desktop
2. From the repo root:

```bash
docker compose up -d
```

Note: this project maps Postgres to localhost port **5433** to avoid conflicts with other local Postgres instances.

### Option B – Local PostgreSQL

Create a DB/user matching `backend/.env` (or edit `DATABASE_URL`).

## 3) Backend setup

From `backend/`:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run bootstrap:admin
npm run start:dev
```

Backend runs on `http://localhost:3000`.

Notes:

- Emails are sent via SMTP **if configured**. Otherwise, they are logged in the backend console.
- Configure env vars in `backend/.env`.

## 4) Frontend setup

From `frontend/`:

```bash
npm start
```

Frontend runs on `http://localhost:4200`.

## 5) Implemented flow (API)

### Public

- `POST /registrations/company-owner` → creates a pending request (company basic info + owner)

### Admin (JWT + platform admin)

- `GET /admin/registration-requests` (pending by default)
- `POST /admin/registration-requests/:id/approve`
- `POST /admin/registration-requests/:id/reject` (body: `{ "reason": "..." }`)

### Auth

- `POST /auth/login` → returns JWT + `mustChangePassword`
- `POST /auth/change-password` → enforces policy (min 8 + 1 upper + 1 lower + 1 number)
- `POST /auth/switch-company`

Lockout:

- After **3 failed login attempts**, account is locked for **1 hour**.

### Companies

- `GET /companies` (membership list)
- `POST /companies` (owner can create additional companies)
- `GET /companies/:companyId`
- `PATCH /companies/:companyId` (complete missing info like `logoUrl`, `matricule`)
- `POST /companies/:companyId/user-requests` (employee account request → goes through admin approval)

### Security questions (account recovery option)

- `PUT /users/me/security-questions`
- `POST /auth/recover/questions`
- `POST /auth/recover/verify`
- `POST /auth/recover/reset`

## 6) Minimal UI

Routes:

- `/register` – company owner registration form
- `/login` – login
- `/change-password` – required when `mustChangePassword = true`
- `/companies` – list + create + switch company
- `/companies/:companyId/edit` – complete company info
- `/companies/:companyId/invite` – request employee account
- `/admin/requests` – approve/reject requests
