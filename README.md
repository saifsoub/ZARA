# ZARA — Personal AI Lab Cockpit

A lightweight, **no-build**, **local-only** cockpit for managing AI agents, prompt templates, run logs, and deploy settings.  
All data is stored in your browser's `localStorage` — nothing is sent to any server.

## Features

| Tab | What you can do |
|-----|----------------|
| **Agents** | Create/edit agents, wire optional API endpoints, run simulated outputs |
| **Prompts** | Library of reusable prompt templates with CRUD |
| **Runs & Logs** | History of every agent run with input/output viewer |
| **Deploy** | GitHub Pages & Vercel deploy checklists, local env-var scratchpad |
| **Links** | Daily launchers — one click to open, right-click to remove |

## Project structure

```
index.html          ← entry point (GitHub Pages serves this from root)
src/
  styles.css        ← all CSS
  app.js            ← init + event wiring  (ES module)
  state.js          ← localStorage helpers (ES module)
  render.js         ← all UI rendering     (ES module)
public/
  index.html        ← identical shell served from public/ (uses ../src/ paths)
README.md
.gitignore
```

## Running locally

No build step required — just serve the files with any static server:

```bash
# Python (built-in, Python 3)
python -m http.server 8080
# then open http://localhost:8080

# Node.js (npx, no install needed)
npx serve .
# then open the printed URL

# VS Code
# Install the "Live Server" extension and click "Go Live"
```

> **Note:** Opening `index.html` directly as a `file://` URL will block ES module imports in most browsers. Use a local server as shown above.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under *Source*, choose **Deploy from a branch**.
4. Set *Branch* → `main`, *Folder* → `/ (root)`.
5. Click **Save**.

Your cockpit will be live at:
```
https://<username>.github.io/<repo>/
```

## Data & privacy

- All state (agents, prompts, runs, settings) lives in `localStorage` under the key `personal_ai_lab_cockpit_v1`.
- Use **Export** (top bar) to download a JSON backup and **Import** to restore it.
- Use **Reset** to wipe everything back to defaults.
- API keys entered in the Env Vault tab are **not secure** — treat them as a scratchpad only. For production secrets, use Vercel environment variables.
