# 找到了旅行社 — Web

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

## Getting Started

### 1. Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in the required values:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Same as `DATABASE_URL` for local dev |
| `JWT_SECRET` | Random secret — generate with `openssl rand -hex 32` |
| `SEED_ADMIN_EMAIL` | Email for the initial admin account |
| `SEED_ADMIN_PASSWORD` | Password for the initial admin account |

### 2. Start the Database

```bash
npm run db:up       # Start PostgreSQL via Docker
npm run db:migrate  # Run Prisma migrations
```

### 3. Create the First Admin Account

```bash
npm run db:seed
```

Reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env.local` and creates an ADMIN user. Safe to run multiple times — skips if the email already exists.

### 4. Start the Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000/admin/login` and sign in with the credentials from step 3.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Create initial admin account |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
