# Project Everience — Stage App

Gestion de stock (produits), fournisseurs et clients. Web app full-stack for internship.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| Base de données | MySQL (via XAMPP) — DB name: `everience` |
| SQL | Raw SQL (hand-written queries, `mysql2` driver) |
| Auth | JWT + bcrypt (mots de passe hachés) + rate limiting |
| Outils | Git, GitHub, Postman |

## Rôles

- **admin** — full CRUD produits, fournisseurs, clients + CRUD comptes utilisateurs
- **user** — full CRUD produits, fournisseurs, clients

## Architecture

```
stage everience/
├── PROJECT.md              ← this file, everything lives here
├── backend/
│   ├── src/
│   │   ├── config/db.ts        connection pool MySQL
│   │   ├── models/             raw SQL queries (1 file per table)
│   │   ├── controllers/        logic + validation
│   │   ├── routes/             endpoints
│   │   ├── middleware/         auth, role, rate limit, errors
│   │   └── index.ts            app entry
│   ├── db/schema.sql           create tables
│   ├── db/seed.sql             default data + admin account
│   └── .env                    secrets (never commit)
└── frontend/
    └── src/
        ├── api/                axios calls
        ├── context/            auth context
        ├── components/         shared UI
        ├── pages/              screens
        └── types/              TS interfaces
```

**Data flow** (learn this — it is the whole app):
`Page React → api/ (axios) → Route Express → Controller → Model (SQL) → MySQL → JSON back → Page`

## Database

DB: `everience`. Tables:

### users
id, nom, email (unique), password_hash, role ('admin'|'user'), created_at

### products
id, num_article, nom, description, prix, stock, stock_min, created_at
Computed in SQL: `valeur_stock = prix * stock`, `status = IF(stock <= stock_min, 'Besoin Activation', 'Actif')`

### fournisseurs
id, nom, adresse, ville, pays, telephone, mail, groupe ('privilegie'|'non'), created_at

### clients
id, nom, adresse, ville, pays, telephone, mail, created_at

## API

Base URL: `http://localhost:5000/api`

| Méthode | Route | Accès |
|---|---|---|
| POST | /api/auth/login | public (rate-limited) |
| GET/POST/PUT/DELETE | /api/users | admin |
| GET/POST/PUT/DELETE | /api/products | admin + user |
| GET/POST/PUT/DELETE | /api/fournisseurs | admin + user |
| GET/POST/PUT/DELETE | /api/clients | admin + user |

## Commands

```bash
# backend
cd backend
npm install
npm run dev          # start server on port 5000

# frontend
cd frontend
npm install
npm run dev          # start app on port 5173

# DB: import backend/db/schema.sql then backend/db/seed.sql in phpMyAdmin (XAMPP)
```

## Comptes par défaut (seed)

- admin: `admin@everience.com` / `admin123`
- user: `user@everience.com` / `user123`

## Progress log

- [x] 2026-08-11 — Project setup, architecture decided, DB name `everience`
- [x] 2026-08-11 — DB schema (users, products, fournisseurs, clients)
- [x] 2026-08-11 — Backend CRUD products (tested: create/update/delete, valeur_stock + status computed)
- [x] 2026-08-11 — Backend CRUD fournisseurs (tested)
- [x] 2026-08-11 — Backend CRUD clients (tested)
- [x] 2026-08-11 — Backend auth: login, JWT, bcrypt, roles (403 user→/users), rate limit
- [x] 2026-08-11 — Backend user CRUD (admin only, tested)
- [x] 2026-08-11 — Frontend: Vite + TS + Tailwind v4 scaffold, build OK
- [x] 2026-08-11 — Frontend: api layer, AuthContext, router, protected routes
- [x] 2026-08-11 — Frontend: Login + Products pages (modal form, computed preview)
- [x] 2026-08-11 — Frontend: Fournisseurs, Clients, Users (admin) pages
- [x] 2026-08-11 — Git init + first commit
- [ ] GitHub remote + push
