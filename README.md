# Mergo

[![CI](https://github.com/IKY4223/nextjs-shop/actions/workflows/ci.yml/badge.svg)](https://github.com/IKY4223/nextjs-shop/actions/workflows/ci.yml)

Mergo is a listings aggregator for electronics in Uzbekistan: new items from stores and used items from private sellers in one place, each linking to its source. Stage 1 is a working catalog on mock data (CPUs, GPUs, motherboards, RAM) with facet filters, a Ctrl+K search that understands Russian, Uzbek, Latin/Cyrillic spellings, slang and phrases like «б/у до 5 млн», and an interface in Uzbek and Russian with dark and light themes.

> **Demo:** model names are real, but every offer, seller and price is invented. Nothing is sold here.

Design and plan: [`docs/superpowers/specs/2026-11-20-mergo-catalog-design.md`](docs/superpowers/specs/2026-11-20-mergo-catalog-design.md), [`docs/superpowers/plans/2026-11-20-mergo-catalog-stage1.md`](docs/superpowers/plans/2026-11-20-mergo-catalog-stage1.md).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) + React 19 + TypeScript
- Tailwind CSS 4
- [Fuse.js](https://www.fusejs.io) for fuzzy search
- [Prisma ORM 7](https://www.prisma.io) + PostgreSQL (schema only in stage 1; data comes from `src/lib/catalog/mock`)
- [Vitest](https://vitest.dev) for unit tests and the search quality eval

## Getting started

Requires Node.js 22+.

```bash
npm install
npx prisma generate   # generate the Prisma Client into src/generated/prisma
npm run dev           # http://localhost:3000 → redirects to /uz or /ru
```

Stage 1 runs entirely on mock data, so no database is needed yet. For later stages, create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Then create the tables from the committed migration (`prisma/migrations/20261121000000_init`, generated with `prisma migrate diff --from-empty`):

```bash
npx prisma migrate deploy
```

Use Neon's direct (non-pooled) connection string for migrations. The app still reads mock data until `src/lib/catalog/data.ts` is switched to Prisma.

## Where things live

| Path               | What it is                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- |
| `src/lib/catalog/` | category config (facets, synonyms), mock data, filters, data-access layer (`data.ts`) |
| `src/lib/search/`  | normalization, query parsing, search index and the 37-query eval                      |
| `src/lib/i18n/`    | locales, dictionaries (`uz.json`, `ru.json`), price/date formatting                   |
| `src/app/[lang]/`  | pages: home, `c/[category]`, `p/[slug]`, `search`, `go/[offerId]`, `credits`          |
| `src/components/`  | header, filter panel, product card, search dialog, …                                  |
| `src/proxy.ts`     | redirects locale-less URLs (cookie → Accept-Language → `uz`)                          |

## Scripts

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the dev server                            |
| `npm run build`        | Production build                                |
| `npm run start`        | Run the production build                        |
| `npm run lint`         | Run ESLint                                      |
| `npm test`             | Run unit tests and the search eval (Vitest)     |
| `npm run format`       | Format code with Prettier and the Prisma schema |
| `npm run format:check` | Check formatting without changing files         |

## Workflow

`main` is protected: changes go through a pull request. Before merge, CI (formatting, lint, tests, type check, build) must pass and CodeQL must report no high-severity alerts.
