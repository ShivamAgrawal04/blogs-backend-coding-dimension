# Security checklist

- Passwords hashed with bcrypt (cost 12)
- JWT with expiry; role checks via `JwtAuthGuard` + `RolesGuard`
- Global ValidationPipe: whitelist + forbid non-whitelisted
- Helmet + compression enabled
- Throttler: 100 req/min global; stricter on auth if configured
- CORS origins from env only
- Avatar assignment limited to known preset IDs or https URLs
- Comment text length limited; only author or ADMIN can delete
- Draft blogs never returned from public `GET /blogs`
- No stack traces leaked in production responses

## Future

- Prefer httpOnly cookies for JWT instead of `localStorage`
- OAuth providers when needed
