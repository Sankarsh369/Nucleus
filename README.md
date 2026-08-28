# Nucleus

Ultra-low-resource context compression engine — shrinks LLM prompts by 70%+ while
retaining 95%+ answer accuracy, so large codebases, logs, and prose cost less and
run faster through any downstream model.

**🔗 Live demo:** [nucleus-lime-nine.vercel.app](https://nucleus-lime-nine.vercel.app) (frontend) · backend at [nucleus-backend-hidt.onrender.com](https://nucleus-backend-hidt.onrender.com)

> Fully configured — Appwrite project created, GitHub + Google sign-in enabled,
> and the database provisioned (see [One-time Appwrite setup](#one-time-appwrite-setup)
> below for how to do this on your own fork). Render's free tier spins the
> backend down after inactivity, so the first request after a while can take
> ~30-60s to wake it back up.

Repo layout:
- [`Backend/`](Backend) — FastAPI compression engine ([setup](Backend/README.md))
- [`frontend/`](frontend) — Next.js UI with Appwrite auth ([setup](frontend/README.md))

---

## Signing in

Nucleus supports three ways to sign in, all via [Appwrite Auth](https://appwrite.io/docs/products/auth):

- Email + password
- Continue with **GitHub** or **Google**

(Facebook, Microsoft, and Apple were tried and dropped — Facebook and Apple
add real friction (Facebook's dev-mode tester restrictions, Apple's $99/yr
Developer Program requirement) and the Microsoft app registration hit an
account/tenant configuration issue not worth chasing for this project. GitHub
and Google cover the common case; add another provider later by enabling it
in Appwrite and adding one entry to the `PROVIDERS` array in
`frontend/src/app/login/OAuthButtons.tsx`.)

### One-time Appwrite setup

1. Create a free project at [cloud.appwrite.io](https://cloud.appwrite.io).
2. **Auth**: In the console, go to **Auth → Settings**, and under OAuth2 Providers enable **GitHub** and **Google**. Each needs an OAuth app registered with that provider first — Appwrite shows the exact callback URL to use on each provider's enable screen (looks like `https://<region>.cloud.appwrite.io/v1/account/sessions/oauth2/callback/<provider>/<PROJECT_ID>`):
   - **GitHub**: [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App.
   - **Google**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth client ID (Web application).
   - Paste each provider's Client ID and Client Secret into Appwrite's provider settings.
3. **Platform**: In **Overview → Platforms**, add a Web platform with your app's hostname (`localhost` for local dev, your deployed domain for production) — Appwrite rejects OAuth redirects to hostnames not registered here.
4. **Database**: generate a **server** API key under **Overview → Integrations → API Keys** with `databases.read`/`databases.write` scopes, put it in `Backend/.env` (see `Backend/.env.example`), then run:
   ```bash
   cd Backend
   python scripts/setup_appwrite.py
   ```
   This creates the database and all five tables/columns/indexes Nucleus needs (safe to re-run).
5. Copy your Project ID and endpoint into `frontend/.env.local` (see `frontend/.env.example`), and the Project ID + server API key into `Backend/.env`.

No other code changes are needed — `frontend/src/app/login/OAuthButtons.tsx` and `frontend/src/app/login/LoginForm.tsx` already implement all three sign-in methods against the Appwrite SDK.

### A known limitation

Route protection for `/app` and `/profile` happens **client-side** (a check on mount), not via Next.js middleware. Appwrite's browser SDK stores its session as a cookie scoped to Appwrite's own API domain, not your app's domain, so a Next.js server component/middleware can't read it directly without extra plumbing (session-token exchange). This means there's a brief moment before the client-side check redirects an unauthenticated visitor away, rather than being blocked before the page ever renders. Fine for a project at this stage; worth hardening with Appwrite's token-based SSR pattern if this goes further.

---

## Your profile

Once signed in, the profile menu → **Profile** opens `/profile`, where you can:

- Update your display name
- Change your email (requires your current password; Appwrite resets the
  address to **unverified** whenever it changes, and the page automatically
  sends a fresh verification email)
- Change your password
- Resend the verification email, or check verification status at a glance

Verification links land on `/profile/verify`, which completes the check
against Appwrite (`account.updateEmailVerification`) and reports success or
failure. This all runs client-side against Appwrite directly — no backend
involvement.

---

## Deploying it yourself

Nucleus is two independently deployable pieces. The live demo above uses
**Vercel** for the frontend and **Render** for the backend (free tiers on both).

### 1. Backend (FastAPI) → Render

1. Push this repo to GitHub (already done if you're reading this from there).
2. Create a **Web Service** on [Render](https://render.com) pointed at this repo. This repo is a monorepo (`Backend/` + `frontend/` at the root), and Render's web service doesn't take a root-directory setting the way Vercel does, so build/start commands need to `cd` in manually:
   - Runtime: Python
   - Build command: `cd Backend && pip install -r requirements.txt`
   - Start command: `cd Backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables (see [Backend/.env.example](Backend/.env.example)): `GEMINI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` (all optional — the app degrades to a mock QA answerer if none are set), `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, and optionally `NUCLEUS_API_KEY` to require an API key header.
4. **On Render's free plan (512MB RAM), also set `NUCLEUS_FORCE_MOCK_EMBEDDINGS=true`.** Without it, loading the real `torch`/`sentence-transformers` embedding model at startup gets the process OOM-killed before it can bind a port — this is exactly what happened on the first deploy of the live demo above. The app works fully in this mode (Stage 2 semantic dedup falls back to a bag-of-words heuristic); only skip this variable on a host with more memory.
5. Deploy. Note the resulting URL — you'll need it for the frontend's `NEXT_PUBLIC_API_URL`.
6. Confirm it's healthy: `GET <your-backend-url>/health` should return `{"status": "ok", ...}`.

### 2. Frontend (Next.js) → Vercel

1. On [Vercel](https://vercel.com), import this repo as a new project and set the **Root Directory** to `frontend` (this repo has two apps at the top level, so Vercel won't guess this correctly on its own).
2. Add environment variables (see [frontend/.env.example](frontend/.env.example)): `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APPWRITE_DATABASE_ID`, and `NEXT_PUBLIC_API_URL` set to the backend URL from step above.
3. Deploy. Vercel gives you a `https://<project>.vercel.app` URL.
4. Add that hostname as a Web Platform in Appwrite (**Overview → Platforms**) — required for OAuth login to work in production.
5. Replace the live-demo line at the top of this README with that URL.

---

## Security notes

- Never commit real `.env` / `.env.local` files — copy the `.env.example` in each
  directory and fill in your own values locally or in your hosting provider's
  dashboard.
- `APPWRITE_API_KEY` (backend) bypasses all row/document permissions entirely —
  treat it like a database admin password, not a normal API key.

## History management

Signed-in users get their compression history persisted to Appwrite
(`user_chat_history`, with **row security** enabled — see
`Backend/scripts/setup_appwrite.py`). Each row's permissions are set to the
creating user only at write time (`frontend/src/app/app/page.tsx`), and the
list query also filters by `user_id` explicitly as defense in depth. From the
profile menu → **History** you can:

- Reopen any past compression (most recent first)
- Delete a single entry
- Clear all history for your account

History is capped at the 50 most recent entries per user.
