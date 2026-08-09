# API overview

Global prefix: `/api` (except `/health*`).

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PATCH /auth/profile` |
| Blogs | `GET /blogs`, `GET /blogs/:idOrSlug`, `POST/PUT/DELETE /blogs` (ADMIN), `GET /blogs/admin/all` |
| Comments | `GET /comments?blogId=`, `POST /comments` (auth), update/delete own or ADMIN |
| Likes | `POST /likes` toggle, `GET /likes/count` — reaction `LIKE` (future: `DISLIKE`) |
| Notes | CRUD under `/notes` (ADMIN for writes) |
| Admin | `/admin/stats`, users, analytics |

Register accepts optional `avatarId` (`1`–`20`). If omitted, a random preset avatar is assigned.
