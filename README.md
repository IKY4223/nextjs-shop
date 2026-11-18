# nextjs-shop

[![CI](https://github.com/IKY4223/nextjs-shop/actions/workflows/ci.yml/badge.svg)](https://github.com/IKY4223/nextjs-shop/actions/workflows/ci.yml)

Full-stack online shop built as a learning project.

## Stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS
- [Prisma ORM 7](https://www.prisma.io) + PostgreSQL

## Getting started

Requires Node.js 22+ and a PostgreSQL database.

```bash
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Then:

```bash
npx prisma generate   # generate the Prisma Client into src/generated/prisma
npm run dev           # http://localhost:3000
```

## Scripts

| Command         | What it does             |
| --------------- | ------------------------ |
| `npm run dev`   | Start the dev server     |
| `npm run build` | Production build         |
| `npm run start` | Run the production build |
| `npm run lint`  | Run ESLint               |

## Workflow

`main` is protected: changes go through a pull request, and CI (lint, type check, build) must pass before merge.
