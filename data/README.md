# Data settings

`database-settings.json` stores the **preferred** database provider (`postgres` or `mongodb`).

Priority on API boot:
1. This file
2. `DB_PROVIDER` env
3. Default `postgres`

Admin UI: **Admin → Settings**. Changing the provider updates this file; **restart the backend** to apply.

Both databases are supported through the MVC repository layer under `src/database/`. Content is **not** auto-synced between Postgres and Mongo — seed each store separately.
