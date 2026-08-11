# Database schema (Drizzle)

Defined in `src/db/schema.ts`.

Core tables: `users`, `oauth_accounts`, `refresh_tokens`, `blogs`, `tags`, `blog_tags`, `subjects`, `notes`, `comments`, `likes`, `bookmarks`, `newsletter_subscribers`, `page_views`, `read_history`.

## User

- `role`: `USER` | `ADMIN`
- `image`: preset DiceBear URL or `/uploads/avatars/...`
- Password optional (OAuth users may have null password)

## OAuth / tokens

- `oauth_accounts` — Google / GitHub links
- `refresh_tokens` — hashed refresh tokens + expiry (rotation on refresh)

## Blog / Note

- SEO: `metaTitle`, `metaDescription`
- Blog `status`: `DRAFT` | `PUBLISHED` | `ARCHIVED`

## Like (reactions)

- `type`: `LIKE` | `DISLIKE`
- One reaction row per user + target (blog / note / comment)

## Bookmark (wishlist)

- User ↔ blog or note
