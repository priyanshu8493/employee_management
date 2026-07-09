<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Production testing

To test in production mode (mimics deployed behavior):

1. `pkill -f "next" 2>/dev/null; rm -rf .next node_modules/.cache`
2. `npx next build`
3. `npx next start -p 3000`
4. Test with curl using a fresh cookie jar for CSRF-first login.

If you see `UntrustedHost` errors from `[auth]`, add `trustHost: true` to the NextAuth config in `lib/auth.ts`.
If the middleware redirects in a loop after login, check `secureCookie` in `middleware.ts` — it must match the cookie prefix the browser actually received (no `__Secure-` prefix for HTTP).
