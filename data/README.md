# Data settings

`database-settings.json` stores the **active** database provider (`postgres` or `mongodb`).

## Hot switch (Admin → Settings)

1. Keep **both** URIs in `.env`:
   - `DATABASE_URL=...`
   - `MONGODB_URI=...`
2. Start the API once — both connections stay open.
3. Toggle in **Admin → Settings** — traffic switches **immediately**.
4. No restart. No `.env` edit when switching.

`DB_PROVIDER` / this JSON file only pick the starting provider on boot.

Postgres and Mongo are **not** auto-synced — seed each store separately (`pnpm db:seed` / `pnpm db:seed:mongo`).
