# Everience — Gestion Stock & Contacts

Web app full-stack pour un stage : gestion de **produits**, **fournisseurs** et **clients** avec comptes utilisateurs.

## Stack

- **Frontend** : React + TypeScript + Vite + Tailwind CSS
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : MySQL (XAMPP), nom de base : `everience`
- **Auth** : JWT + bcrypt + rate limiting

## Démarrage rapide

1. Lancer MySQL dans XAMPP Control Panel.
2. Importer `backend/db/schema.sql` puis `backend/db/seed.sql` (phpMyAdmin).
3. Backend :
   ```bash
   cd backend
   npm install
   npm run dev      # http://localhost:5000
   ```
4. Frontend :
   ```bash
   cd frontend
   npm install
   npm run dev      # http://localhost:5173
   ```

## Comptes par défaut

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | admin@everience.com | admin123 |
| User | user@everience.com | user123 |

## Documentation complète

Tout le détail (architecture, schéma DB, API, log de progression) est dans [PROJECT.md](PROJECT.md).
