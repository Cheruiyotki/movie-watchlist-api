# Movie Watchlist API

Backend API for a movie watchlist app built with Express, Prisma, and PostgreSQL (Neon adapter).

## Features

- User authentication with JWT (`register`, `login`, `logout`)
- Protected watchlist management
- Prisma schema + migrations
- Seed script for adding sample movies

## Tech Stack

- Node.js + Express
- Prisma ORM
- PostgreSQL (Neon adapter)
- Zod validation
- JWT + bcrypt

## Project Structure

```
src/
  config/         # Prisma client and DB connection helpers
  controllers/    # Route handlers
  middleware/     # Auth + validation middleware
  routes/         # Express routes
  utils/          # Token helper
prisma/
  migrations/     # Prisma migrations
  schema.prisma   # Data model
  seed.js         # Seed movies
```

## Prerequisites

- Node.js 18+
- pnpm (or npm)
- PostgreSQL database (Neon or local)

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="1h"
NODE_ENV="development"
CREATOR_ID="uuid-of-existing-user-for-seeding"
```

Notes:
- `DATABASE_URL` is required by Prisma.
- `JWT_SECRET` is required for signing/verifying tokens.
- `CREATOR_ID` is used by `prisma/seed.js` when creating movies.

## Installation

```bash
pnpm install
```

## Database Setup

Run Prisma migrations:

```bash
npx prisma migrate dev
```

Generate Prisma client (usually done automatically, but safe to run):

```bash
npx prisma generate
```

## Run the API

```bash
pnpm dev
```

The server starts on:

`http://localhost:5001`

## Seed Sample Movies

1. Register a user (or use an existing user) and copy the user `id`.
2. Set `CREATOR_ID` in `.env` to that user ID.
3. Run:

```bash
pnpm seed:movies
```

## API Endpoints

Base URL: `http://localhost:5001`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

Example register body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "strongpassword123"
}
```

### Movies

- `GET /movies/movies`

Current response is a placeholder:

```json
{
  "message": "List of movies"
}
```

### Watchlist (Protected)

Requires auth token in header:

`Authorization: Bearer <JWT_TOKEN>`

Endpoints:

- `POST /watchlist` (add)
- `PUT /watchlist/:id` (update)
- `DELETE /watchlist/:id` (remove)

Example add body:

```json
{
  "movieId": "f9a4fdb0-fd25-4f90-a47c-6ca3f8b54df4",
  "status": "PLANNED",
  "rating": 8,
  "notes": "Looks promising"
}
```

## Available Scripts

- `pnpm dev` - Run server with nodemon
- `pnpm seed:movies` - Seed sample movie data
- `pnpm test` - Placeholder test script

## Current Limitations

- No global error-handling middleware yet.
- `/movies/movies` is currently a stub route.
- No automated tests are implemented yet.
