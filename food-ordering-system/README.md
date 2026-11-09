# NomNom – Simple Food Ordering System

React + TypeScript (Vite) frontend with a small Node.js/Express backend that stores data in `src/services/db.json`.

## Running locally

You need [Node.js](https://nodejs.org) 20+.

```bash
# 1. Install frontend and backend dependencies
npm install
npm install --prefix src/services

# 2. Start the backend (http://localhost:3001)
npm run server

# 3. In a second terminal, start the frontend (http://localhost:5173)
npm run dev
```

The frontend talks to `http://localhost:3001` by default. To use another backend, copy `.env.example` to `.env` and set `VITE_API_URL`.
Set `JWT_SECRET` in the backend's environment for anything other than local development.

## Scripts

| Command            | What it does                         |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the frontend dev server        |
| `npm run server`   | Start the Express backend            |
| `npm run build`    | Type-check and build for production  |
| `npm run lint`     | Run ESLint                           |
| `npm test`         | Run the unit tests (Vitest)          |

## Project structure

- `src/pages` – customer pages (`user/`), admin pages (`admin/`), login and register
- `src/components` – shared UI (navbar, inputs, buttons) and admin UI pieces
- `src/context` – `AuthContext` (who is logged in), `CartContext`, `AdminContext` (admin data)
- `src/services/api.ts` – the single HTTP client used by the whole frontend
- `src/services/` (`server.js`, `routes/`) – the Express backend
- `src/types.ts` – shared data types
- `src/utils` – validation, formatting, storage and order helpers
