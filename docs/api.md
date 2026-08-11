# API overview

Global prefix: `/api` (except `/health*`).

Interactive docs: **http://localhost:3001/api/docs** (Swagger — Cookie + Bearer).

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register` (dev/admin), `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/google`, `GET /auth/github` (+ callbacks), `GET/PATCH /auth/profile`, `POST /auth/avatar` |
| Blogs | `GET /blogs`, `GET /blogs/slugs`, `GET /blogs/:idOrSlug`, admin CRUD + `GET /blogs/admin/all` |
| Notes | `GET /notes`, `GET /notes/subjects/all`, `GET /notes/:idOrSlug`, admin CRUD + `GET /notes/admin/all` |
| Comments | `GET /comments`, `POST/PUT/DELETE /comments` (auth) |
| Likes | `POST /likes` `{ blogId?, noteId?, commentId?, type: LIKE\|DISLIKE }` → `{ active, liked, type, count }`; `GET /likes/count?type=` |
| Bookmarks | `POST /bookmarks` toggle, `GET /bookmarks` (wishlist) |
| Search | `GET /search?q=` |
| Admin | `/admin/stats`, users, blogs, notes, analytics |
| Newsletter / Analytics / Health | subscribe, track view, `/health` |

Public signup uses **OAuth only**. Avatar preset is required (`?avatarId=` + cookie). Custom crops upload after callback via `POST /auth/avatar`.
