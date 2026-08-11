# Backend — Coding Dimension API

Standalone NestJS API. Run everything from **this folder**.

## Quick start (Postgres — default)

```bash
docker compose up -d
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev
```

## Database providers (Postgres + MongoDB)

Controllers → Services → Repositories → **Postgres (Drizzle)** or **MongoDB (Mongoose)**.

| Piece | Path |
|--------|------|
| Provider switch file | `data/database-settings.json` |
| Env fallback | `DB_PROVIDER=postgres\|mongodb` |
| Mongo URI | `MONGODB_URI` |
| Postgres URL | `DATABASE_URL` |
| Repositories | `src/database/repositories/{interfaces,postgres,mongodb}` |
| Mongo schemas | `src/database/mongodb/schemas` |

Switch from **Admin → Settings**, or edit `data/database-settings.json`, then **restart** the API.

```bash
# Seed Mongo (after MONGODB_URI is set)
pnpm db:seed:mongo
```

Postgres and Mongo are **not** auto-synced — seed/migrate each store as needed.

- API: http://localhost:3001  
- Swagger: http://localhost:3001/api/docs  
- Seed admin: `admin@codingdimension.com` / `admin123`

## Database scripts

| Script | Purpose |
|--------|---------|
| `pnpm db:generate` | Generate SQL migrations |
| `pnpm db:push` | Push schema to Postgres |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Seed Postgres |
| `pnpm db:seed:mongo` | Seed MongoDB |

Postgres schema: `src/db/schema.ts`. Mongo schemas: `src/database/mongodb/schemas/`.

## Docs

| Doc | Content |
|-----|---------|
| [Project features](../docs/02-features.md) | What’s implemented |
| [Flows](../docs/03-flows.md) | End-to-end flows |
| [docs/api.md](docs/api.md) | Endpoint list |
| [docs/schema.md](docs/schema.md) | Database models |
| [docs/security.md](docs/security.md) | Auth & hardening |

## Modules (`src/modules/`)

`auth` · `blogs` · `notes` · `comments` · `likes` · `bookmarks` · `search` · `admin` · `users` · `newsletter` · `analytics` · `health`
