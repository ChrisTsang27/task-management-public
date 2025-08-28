## 2025-08-29 — Supabase scaffolding (no breaking changes)
- Env: added .env.local.example with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (keep .env.local uncommitted).
- Client: added src/lib/supabaseBrowserClient.ts (public browser client; no middleware/routes modified).
- Auth: added lightweight pages /auth/sign-in (magic link) and /auth/sign-out. No existing pages changed.
- DB: added supabase/schema.sql (profiles, teams, team_members, tasks, announcements + comments/reactions, email_logs, RLS policies). Run this in Supabase SQL.
- Next step options: wire auth state to UI and gate admin-only tabs, then connect data CRUD to Supabase.

Notes
- Install: npm i @supabase/supabase-js
- Set site URL in Supabase Auth settings (e.g., http://localhost:3000 for local dev) for magic link redirects.