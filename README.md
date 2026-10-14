# pm01

Public daily planner: https://pm01.esemmoc.chatgpt.site

Windows-style item list with add, rename, and delete. Single selection opens a daily grid from October 1, 2026 through June 30, 2027. Notes save automatically to Supabase, with visible save status and retry on failure.

Backend: bnaimitzvah (`fgomaujsdblpzxhnnqrg`). Only `public.pm01_items` and `public.pm01_entries` are used. These tables allow public access without login. The frontend contains only a publishable API key. Deleting an item also deletes its notes.

Static source is in `dist/`. Serve with any static web server. Sites deployment identity is in `.openai/hosting.json`. Changes are tracked and pushed to `esemmelman/pm01`.
