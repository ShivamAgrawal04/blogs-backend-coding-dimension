# Database schema (Prisma)

Core models: `User`, `Blog`, `Tag`, `BlogTag`, `Subject`, `Note`, `Comment`, `Like`, `Bookmark`, `NewsletterSubscriber`, `PageView`.

## User

- `role`: `USER` | `ADMIN`
- `image`: avatar URL (preset or custom)

## Blog

- SEO: `metaTitle`, `metaDescription` (optional; fall back to title/description)
- `status`: `DRAFT` | `PUBLISHED` | `ARCHIVED` — public list only shows `PUBLISHED`

## Like (reactions)

- `type`: `LIKE` | `DISLIKE` (dislike reserved for future UI)
- Unique per user + target (blog / note / comment)
