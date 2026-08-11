# Backend — Coding Dimension API

Standalone NestJS API. Run everything from **this folder**.

## Quick start

```bash
docker compose up -d
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev
```

- API: http://localhost:3001  
- Swagger: http://localhost:3001/api/docs  
- Seed admin: `admin@codingdimension.com` / `admin123`

## Database (Drizzle)

| Script | Purpose |
|--------|---------|
| `pnpm db:generate` | Generate SQL migrations |
| `pnpm db:push` | Push schema to Postgres |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Seed admin + sample content |

Schema lives in `src/db/schema.ts`.

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
