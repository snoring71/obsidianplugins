# Database templates (0.17.0)

Notion-style templates for each database (each `.base` file), with a **New ▾** button, a template picker, a template manager and repeating templates.

## Where templates live

A database's templates are the notes in `Templates/<base name>/`. For `Notion/RM Tasks/RM Tasks.base` that's `Templates/RM Tasks/`. Change the `Templates` root in Settings → Notion-style Kanban → Templates.

Templates are ordinary notes. Their properties and content are copied into each new note. They never show in a database's views: the plugin adds `not: file.inFolder("Templates")` to each database's top-level filter (on start-up and when you make a template), so a template can even have a `base` property. New notes go in the base's folder and get `base: "[[<base>.base]]"`.

Template settings are stored as properties on the template, so they sync to every device:

| Property | Meaning |
| --- | --- |
| `title` | Title of new notes. Can use variables, e.g. `RM Standup {{today:YYYY-MM-DD}}`. Empty means "Untitled" with the title selected for typing |
| `icon` | Page icon of new notes |
| `template-order` | Position in the template lists (set by dragging in Manage templates; hidden) |
| `template-default: true` | The default template (Notion's "Default"). Used by **New** and by the board's "+ New" in a column |
| `template-repeat` | Repeat schedule (see below) |
| `template-repeat-last` | Last run that was made (written by the plugin) |
| `template-repeat-catch-up: latest` | After missed runs, make only the newest one |

Properties starting with `template-` are not copied to new notes. Everything else in the template body is copied as-is, including blank lines and `---` dividers. Variables (`{{today}}`, `{{now}}`, `{{next:tue}}` …, see [notion-buttons.md](notion-buttons.md#variables)) are filled in when the note is made, except inside `notion-button` blocks, which keep them for when the button is clicked.

## Making a note

- **New ▾** in the bar above every board: click **New** for the default template, or the arrow for the template list (plus "Empty page" and "Manage templates…").
- Command **New note from template** (also the ribbon's copy-plus icon): fuzzy search over "Database › Template" for every database.
- A board column's "+ New" uses the default template, then sets the column/lane.

## Managing templates

Command **Manage templates**, or **Manage templates…** in the New menu. Pick a database, then for each template: make a note, edit, set repeat, make default (star), duplicate, delete. **New template** creates an empty one and opens it.

Drag a template by its grip (⋮⋮) to reorder. The New menu and the New note from template list use the same order. Templates you never placed go last, the default first. The repeat icon is blue for templates that repeat, and their schedule and next run show on the line under the title.

## Template banner

A template note shows a banner at the top ("You're editing a template in <database>") that stays put while you scroll. Click the database name to open the board, or the repeat button to change the schedule.

## Repeating templates

Click the repeat icon in Manage templates. Choose daily, weekdays, weekly (days), monthly (day of month, last day, or e.g. 4th Friday), quarterly or yearly, every N, a time, and a start date. The dialog shows the next three runs.

Stored as text, e.g. `weekly on wed at 08:00`, `monthly on 4th fri at 09:00`, `monthly on last day at 07:00`, `quarterly at 01:00`, `every 2 weeks on mon at 07:00 from 2026-12-07`.

How it runs:

- Obsidian checks when it starts, when it comes back to the foreground, and every minute while open. It waits 15 seconds after start/foreground first (setting **Wait for sync before repeating**) so Obsidian Sync can bring in notes another device already made.
- Missed runs are caught up: if nothing was open at 8:00 Wednesday, the note is made as soon as Obsidian opens. By default one note per missed run (up to 60); with catch-up "Only make the latest one", just the newest. Each note's dates use the time it was due, not the time it was made.
- Each note made by a repeat gets a hidden `template-run` property (`<database>/<template>@<date-time>`), and a run is skipped if a note with that id already exists, so two devices don't both make it.
- iOS/Android: works the same, but only while the app is open. Phones don't run plugins in the background.
- When you first set or change a schedule, only future runs are made.
- Command **Make any due repeating-template notes now** runs the check immediately.

## Templates brought over from Notion (2026-11-27)

`docs/templates/<database>/` holds the converted templates that were copied to the vault's `Templates/`: Backup Strategy (3), Backup Tasks (4), Notes Database (15), RM Tasks (34 plus the 11 button sub-task templates), To-Do List (1). Deprecated and "Untitled" Notion templates were skipped. Notion buttons in them are now `notion-button` blocks. Notion's "@Today" in a template name became `{{today:YYYY-MM-DD}}` in `title`.

Notion's API doesn't expose template repeat schedules, so repeats have to be set again in Manage templates.
