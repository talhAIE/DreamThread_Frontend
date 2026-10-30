# DreamThread frontend

DreamThread's HTML/CSS/JavaScript frontend connected to the FastAPI backend, Supabase Auth, and backend workers. No npm installation is required. Local serving uses Python; Vercel uses a dependency-free Node build.

## Deploy on Vercel

Import this repository and select its default branch, `codex/dreamthread-frontend`. Set Framework Preset to **Other** and Root Directory to the repository root (leave it blank). The committed `vercel.json` supplies the build command and `dist` output directory; remove dashboard overrides from earlier attempts.

Before deploying, add these variables to the Vercel project's Production and Preview environments:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Your backend's Supabase project URL, `https://YOUR-PROJECT.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | The same project's publishable key (or legacy anon key) |
| `VOICE_ENABLED` | `false` until voice is enabled and verified on the backend |

Click Deploy, or Redeploy after changing environment variables. Do not add database URLs, the Supabase secret/service-role key, or model provider keys to this frontend project. The build publishes only the allowlisted public configuration in `dist/config.json`.

The backend API is already configured as `https://dreamthread-api.onrender.com` in `vercel.json`. Vercel forwards `/api/v1/*` to Render on the same browser origin, including Bearer tokens and idempotency headers. No `BACKEND_URL` or `VITE_*` variables are needed. The Python server is not used on Vercel. Keep the Render API and worker running.

In Supabase, set Site URL to your Vercel production URL. Add `https://YOUR-APP.vercel.app/` to redirect URLs if using Google OAuth. Turn Confirm email OFF as described below for immediate email/password signup.

## Run beside the backend

Keep this checkout at `DreamThread/frontend`, with the backend at `DreamThread/backend`.

Double-click `start-dreamthread.cmd` to launch the API, worker, and frontend together. The backend virtual environment and `backend/.env` must already be configured and migrations applied.

Or start services separately:

```powershell
# From DreamThread/backend
.venv/Scripts/python.exe -m uvicorn app.main:create_app --factory --loop app.loop:create_loop --port 8000 --no-access-log
.venv/Scripts/python.exe -m app.workers.main
# From DreamThread/frontend
../backend/.venv/Scripts/python.exe scripts/serve_frontend.py
```

Open http://127.0.0.1:5173. The worker is required for analysis, transcription, Detective answers, capsules, and exports.

## Email and password login, without email confirmation

In the Supabase project dashboard, open **Authentication → Sign In / Providers → Email**, enable Email, and turn **Confirm email OFF**. This is a Supabase project setting; browser code cannot override it. New users then receive a session immediately after creating an account. Existing accounts can sign in with email and password. Previously unconfirmed accounts may need confirmation by the project administrator.

The app stores the session in sessionStorage, refreshes expiring access tokens, and sends Bearer tokens to FastAPI. Passwords are never saved. Google OAuth is optional and requires its provider configuration and allowed redirect URLs in Supabase.

## Configuration

The Python server reads `../backend/.env` by default. Override with `--env-file PATH`, or set environment variables. Only these public values appear in `/config.json`: API prefix, Supabase project URL, publishable key, and voice-enabled status. Database passwords, provider keys, and Supabase secret keys never reach the browser.

For a hosted backend:

```powershell
python scripts/serve_frontend.py --backend-url https://YOUR-API-HOST --host 0.0.0.0
```

For Python hosting, set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and optional `API_PREFIX` / `VOICE_ENABLED` in the frontend server environment. `BACKEND_URL` and `PORT` are supported. This Python process supplies configuration and proxies API calls. For Vercel hosting, use the static build and Vercel routing described above instead.

## Connected features

- Private journal creation, server drafts, date/emotion/keyword filters, editing, deletion, and immutable original text.
- Durable analysis with processing states, failures, source evidence, corrections, and follow-up answers.
- Real motif graph, motif sources, storylines, and confirm/reject connection decisions.
- Personal memory creation, editing, enable/disable, confirmation, and forgetting.
- Persistent Detective conversations with source citations.
- Monthly insights, time capsules, authenticated JSON/text exports, and confirmed journal deletion.
- Profile, timezone, theme, reduced motion, preferences, and logout.
- Microphone recording/audio upload, asynchronous transcription, and transcript review when the backend enables voice. Voice remains disabled if the backend's verified storage/ASR requirements are not met.

Capture drafts are scoped to the current account and browser session until explicitly saved to the server. Interrupted requests retain their idempotency keys for retries. No fixture data or invented AI output is used by the live app. Bundled scene images are decorative artwork, not generated representations of a user's dream.

## Verification status

Local adapter/auth regression tests and import/asset checks passed during integration. Full cloud verification was interrupted and is not claimed complete. Further testing was stopped at the user's request.
