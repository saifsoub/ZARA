# ZARA — Personal AI Lab Cockpit

A single-file control panel for a personal AI lab: agents, prompts, runs, and deploy targets in
one place.

Everything lives in one `index.html`, and all data stays in your browser.

## What's in the cockpit

- **Agents** — register and track the agents in your lab
- **Prompts** — keep prompt templates ready to copy
- **Runs** — record what ran and how it went
- **Deploy** — track the endpoints your lab talks to
- **Lab modes** — BUILD, RESEARCH, DEPLOY
- **Primary URL** — the endpoint the cockpit points at
- **Quick prompt** — one-click copy of the current prompt
- **Import / Export** — move the whole lab state as JSON
- **Reset** — clear local state

## Run it

Open `index.html` in a modern browser.

## Storage

State is kept in `localStorage` under a single key. Nothing is sent anywhere — the app is
local-only. A configurable endpoint is in place so a `fetch()` call can be wired in later.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | The entire application |
