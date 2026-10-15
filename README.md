# pm01

Public daily planner: https://esemmelman.github.io/pm01/

Windows-style item list with add, rename, and delete. Single selection opens a daily grid from October 1, 2026 through December 31, 2027. Click the + in a Date cell to add a named entry for that date. Multiple entries can share a date. Click an entry in Information to open its rich text editor; its name and notes save automatically to Supabase, with automatic saving and retry on failure. The current frontend version is 1.3.18.

The app opens with no planner selected. Selecting a planner hides the item panel so the calendar uses the full width; the chevron restores the listbox. All combines the dated information from every planner and labels entries with the planner name in parentheses. Entries in All still open their rich text notes; additions use an individual planner's calendar. The Date column is 112 pixels wide.

Double-click an item for rich text notes with a formatting toolbar and automatic saving. The toolbar also has Notes and Multiple Notes buttons. Multiple Notes maintains separate named notes for the selected planner, with add, rename, delete, and the same formatting, date stamp, automatic saving, and retry controls as Notes. Status messages are hidden throughout the app. Existing Notes remain separate.

Double-click an Information item to enable dragging, then drag it onto a different date to move it. Single-click still opens its notes. Moves save automatically. This also works in All, keeping the original planner association. DayFlow remains read-only.

In any notes editor, select text and use Link to enter an https://, http://, mailto:, or tel: address, then enter a friendly display name. You can also use Link at the cursor to insert a named link. Click a saved link to open it in a new tab. Unlink removes the link from selected text.

Backend: bnaimitzvah (`fgomaujsdblpzxhnnqrg`). Planner data uses `public.pm01_items`, `public.pm01_entries`, `public.pm01_item_notes`, and `public.pm01_date_items`. These tables allow public access without login. The frontend contains only a publishable API key. Deleting a listbox item also deletes its notes and dated entries. The new dated-entry schema is recorded in `supabase/migrations/`.

Static source is in `dist/`. Serve with any static web server. Changes pushed to `main` in `esemmelman/pm01` automatically deploy `dist/` to GitHub Pages through `.github/workflows/pages.yml`. The previous Sites deployment identity is retained in `.openai/hosting.json`.

Import DayFlow opens a separate, read-only calendar. DayFlow data is stored in `pm01_dayflow_entries` and never written to individual planner items.

DayFlow import needs no sign-in. It reads the explicitly public, read-only `pm01_dayflow_calendar_export` view in DayFlow, limited to task IDs, titles, dates, and start times for October 2026–December 2027.

The calendar heading shows days from today's Los Angeles date to the next upcoming item, followed by end with weeks and total days until the last item in the current view. For example: Next: 14 days   end: 8 weeks, 56 days. Weeks use one decimal when needed. Past items are excluded from Next; empty calendars use dashes, and an entirely past calendar shows end: 0 weeks, 0 days.

Hover over a date to see its distance from today's Los Angeles date in weeks and total days, including whether it is before or after today. Task dates only, beside the calendar title, toggles between every date and dates containing tasks in the current planner, All, or DayFlow view. The filter updates when tasks are added or moved.

Calendar items with nonempty notes show an asterisk immediately after the item name (for example, `Meeting*`). The marker updates while editing, disappears when the notes are cleared, and appears in both individual calendars and All. Empty formatting and whitespace do not count as note content.

Mondays only, immediately after Task dates only, toggles the calendar to Monday dates. Turn on both filters to show only Mondays that have tasks. Both filters apply in individual calendars, All, and DayFlow.

Long opens the full-page Long Calendar for the current planner, All, or DayFlow, from October 2026 through the month containing the final task. Each month shows every numbered day and its weekday initial, with lines connecting task dates to balloons. Click a dated task balloon to open its notes. Close or Escape returns to the daily grid. Daily-grid filters do not hide days in this view.

In Long Calendar, hover over a date to see weeks and total days before or after the last task date in the current calendar. Weekends use darker shading.

Click a date in Long Calendar to add an item on that date. In All, choose its planner in the add dialog. Added items appear immediately in the Long Calendar. DayFlow remains read-only.
