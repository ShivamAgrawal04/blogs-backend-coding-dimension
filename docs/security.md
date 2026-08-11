# Security checklist

- Passwords hashed with bcrypt (cost 12) when used
- **Access + refresh JWTs in httpOnly cookies** (`SameSite=lax`, `Secure` when `COOKIE_SECURE=true`)
- Refresh tokens stored **hashed** in DB; rotated on refresh; revoked on logout
- JWT also accepted via `Authorization: Bearer` for tooling/Swagger
- OAuth: Google + GitHub; pending avatar id cookie during signup
- Global ValidationPipe: whitelist + forbid non-whitelisted
- Helmet + compression
- Throttler on auth routes
- CORS origins from env **with credentials**
- Avatar uploads: image MIME only, 2MB limit, stored under `/uploads/avatars`
- Comment length limited; author or ADMIN can delete
- Draft blogs never returned from public `GET /blogs`
- No stack traces in production responses

## Cookie layout

| Cookie | Path | Lifetime (default) |
|--------|------|--------------------|
| `access_token` | `/` | ~15m |
| `refresh_token` | `/api/auth` | ~7d |
