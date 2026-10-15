# pm01

Public daily planner: https://esemmelman.github.io/pm01/

Windows-style item list with add, rename, and delete. Single selection opens a daily grid from October 1, 2026 through June 30, 2027. Click the + in a Date cell to add a named entry for that date. Multiple entries can share a date. Click an entry in Information to open its rich text editor; its name and notes save automatically to Supabase, with visible save status and retry on failure. The current frontend version is 1.3.0.

The app opens with no planner selected. Selecting a planner hides the item panel so the calendar uses the full width; the chevron restores the listbox. All combines the dated information from every planner and labels entries with the planner name in parentheses. Entries in All still open their rich text notes; additions use an individual planner's calendar. The Date column is 112 pixels wide.

Double-click an item for rich text notes with a formatting toolbar and automatic saving. The toolbar also has Notes and Multiple Notes buttons. Multiple Notes maintains separate named notes for the selected planner, with add, rename, delete, and the same formatting, date stamp, automatic saving, and retry controls as Notes. Existing Notes remain separate.

Backend: bnaimitzvah (`fgomaujsdblpzxhnnqrg`). Planner data uses `public.pm01_items`, `public.pm01_entries`, `public.pm01_item_notes`, and `public.pm01_date_items`. These tables allow public access without login. The frontend contains only a publishable API key. Deleting a listbox item also deletes its notes and dated entries. The new dated-entry schema is recorded in `supabase/migrations/`.

Static source is in `dist/`. Serve with any static web server. Changes pushed to `main` in `esemmelman/pm01` automatically deploy `dist/` to GitHub Pages through `.github/workflows/pages.yml`. The previous Sites deployment identity is retained in `.openai/hosting.json`.

Import DayFlow opens a separate, read-only calendar. DayFlow data is stored in `pm01_dayflow_entries` and never written to individual planner items.

DayFlow import needs no sign-in. It reads the explicitly public, read-only `pm01_dayflow_calendar_export` view in DayFlow, limited to task IDs, titles, dates, and start times for October 2026–June 2027.
