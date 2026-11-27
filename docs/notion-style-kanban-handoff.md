# Notion-style Kanban for Obsidian — Handoff

Nov 26, 2026 · @Zach

## Purpose and status

Notion-style Kanban (plugin id `notion-style-kanban`, v0.3.0) is a custom Obsidian plugin that makes my imported Notion task board look and behave like the original. It adds a Bases view called **Notion Kanban** and a Notion-style icon picker. It is installed, enabled, and in use on the RM Tasks board.

Background: I imported my Notion workspace into Obsidian on 2026-11-25 with the official importer. The importer turned the RM Tasks database into a Base, but Obsidian's built-in Kanban view can't show sub-tasks inside their parent card, and the community kanban plugins didn't fit. So we built our own.

What's done:

- Board view with Notion colors, swimlanes, tags, and sub-tasks inside parent cards (v0.1)
- Notion page icons copied into an `icon` property on the 75 notes on the board
- Icon picker with Emoji and Icons tabs, color dot, shuffle and Remove (v0.2)
- Recent and Saved tabs in the picker, plus a large icon above each note's title (v0.3)

Everything so far was tested in a headless browser against copies of my real notes, with a stub standing in for Obsidian's API. It hasn't been checked inside Obsidian itself, so the first job in a new chat is to look at it in Obsidian and fix anything that differs.

## Where things live

Vault root: `D:\Obsidian Data\Notion Import 11.25.2026\My Vault`. Paths below are relative to it.

| Path | What it is |
| --- | --- |
| `.obsidian/plugins/notion-style-kanban/main.js` | All plugin code, plain JavaScript, no build step |
| `.obsidian/plugins/notion-style-kanban/styles.css` | All styling (board, picker, note icon) |
| `.obsidian/plugins/notion-style-kanban/manifest.json` | Plugin id, version (0.3.0), minAppVersion 1.10.0 |
| `.obsidian/plugins/notion-style-kanban/data.json` | Plugin settings: `recentIcons` (max 20), `savedIcons`, `pickerTab` |
| `.obsidian/community-plugins.json` | Lists `notion-style-kanban` as enabled |
| `Notion/RM Tasks/RM Tasks.base` | The Base. The plugin's view is the last view, named "Notion Board" |
| `Notion/RM Tasks/*.md` | About 1,900 task notes, one per Notion page (parents and sub-tasks in the same folder) |

The "Notion Board" view uses the same filters as the imported Kanban view: `Team` contains "Release Management" and `Parent task` is empty. Its view settings in the `.base` file set columnProperty `note.Status`, columnOrder (Not started, Up next, In progress, Done), laneProperty `note.Team`, subtaskProperty `note.Sub-task`, tagProperty `note.Tag`, waitingProperty `note.Waiting`, blockedProperty `note.Blocked by`, iconProperty `note.icon` and orderProperty `note.manual_order`.

Another community plugin, `kanban-action-planner`, is also installed. Its compiled `main.js` was our reference for the exact Bases API calls.

## Data model

The plugin reads frontmatter directly through `app.metadataCache` rather than Bases values. That way it works with the property names the Notion importer created.

| Property | Type in the notes | Used for |
| --- | --- | --- |
| `Status` | text: Not started, Up next, In progress, Done, Closed | Board column; sub-task done state (Done or Closed counts as done) |
| `Team` | text, e.g. "Release Management" | Swimlane |
| `Sub-task` | list of wikilinks `[[Notion/RM Tasks/Name\|Name]]` | Sub-tasks shown inside the parent card, in this order |
| `Parent task` | list of wikilinks | Filter: only notes without a parent go on the board |
| `Tag` | list, e.g. Monitoring, Waiting on individual(s), Expedite, Weekly, Blocked | Colored tag pills; "Blocked" also drives the fallback sub-task icon |
| `Waiting` | text ("Waiting" when waiting) | Fallback sub-task icon |
| `Blocked by` | list of wikilinks | Fallback sub-task icon |
| `manual_order` | number | Card order within a column; drag-and-drop writes it |
| `icon` | text | Card icon, sub-task icon, and the large note icon |
| `base` | wikilink to the `.base` file | Copied onto new notes so they stay in the Base |
| `notion-id` | Notion page UUID | Matching notes back to Notion pages |

The `icon` value can take three forms:

- Notion format, from Notion's API: `icons/calendar_red`, `icons/no_yellow`, `icons/circle_lightgray`. Notion names map to Lucide names through `NOTION_ICON_MAP`, and Notion's yellow shows as orange.
- A Lucide icon name with an optional color: `calendar:red`, `ban:orange`, `square:gray`, `repeat:blue`.
- An emoji: `🧾`.

The colors are default, gray, brown, orange, yellow, green, blue, purple, pink and red, using Notion's dark-mode values in the `COLORS` table.

When a sub-task has no `icon`, its icon comes from its fields:

- Done or Closed: checked box. This always wins, even over an `icon`.
- Blocked tag, Blocked by set, or Status Blocked: red ⊘
- In progress: orange •••
- Waiting: orange ⊘
- Otherwise: empty box

In Notion these were page icons set by hand, which is why we copied them in explicitly. The import didn't keep Notion's board order: `manual_order` doesn't match it, so cards get reordered by dragging.

## Features

**Board ("Notion Kanban" Bases view)**

- Columns come from `Status`, in the configured column order. Each column header has a colored dot pill, a count, and a + for a new task.
- Notion colors: Not started gray, Up next pink, In progress blue, Done green. Columns and cards are tinted to match.
- A swimlane per `Team` value; click its header to collapse it. Collapsed lanes are saved in the view config as `collapsedLanes`.
- Each card shows its icon, title, colored tags, any extra properties chosen in the Bases Properties menu, and its sub-tasks.
- Each sub-task row shows an icon and an underlined link. Clicking the icon toggles Done / Not started; clicking the name opens the note (Ctrl/Cmd opens a new tab). Hovering shows a page preview, and right-clicking opens Obsidian's file menu.
- Clicking a card opens the note. Right-clicking it opens the file menu, and hovering the title shows a preview.
- Dragging a card to another column changes `Status` (and `Team` if it changes lane). Dragging within a column rewrites `manual_order`: it uses the midpoint between neighbours, or renumbers the column in steps of 1024 when it has to.
- "+ New task" creates `Untitled.md` in the same folder, copies `base`, sets Status and Team, then opens it in a new tab with the title selected for renaming.
- Sub-tasks are usually filtered off the board, so the view watches their files separately and redraws when one changes.
- View options cover: column property, order and colors; done values; hiding unlisted or empty columns; swimlane property; sub-task, tag, waiting, blocked-by, icon and order properties; tag colors; showing done sub-tasks; the default icon (circle or none); and column width (small, medium, large).

**Icon picker** (a popover, not a modal)

- Ways to open it: click a card's icon; right-click any note and choose **Change icon** (works in the file explorer and tabs too); run the command "Change icon of current note"; or click the large note icon.
- Tabs are Recent, Saved, Emoji and Icons, plus Remove. It reopens on the last tab used.
- **Icons:** every Lucide icon from `obsidian.getIconIds()` (about 1,500), drawn 300 at a time as you scroll. The color dot sets the color.
- **Emoji:** about 400 emoji in Notion's groups, each with search keywords (`EMOJI_GROUPS`).
- **Recent:** the last 20 manual picks, colors kept. Shuffle and Remove don't count as picks.
- **Saved:** right-click any icon and choose **Add to Saved**; it keeps the color it showed. Remove one with the hover × or by right-clicking it. Saved icons show a small blue dot in the other tabs.
- The filter searches the current tab. Escape or a click outside closes the picker; clicks inside Obsidian's context menus don't.

**Large note icon**

- A 64px icon sits above the inline title in both editing and reading view, and clicking it opens the picker.
- Notes without an icon show a faint "Add icon" button on hover.
- It re-attaches when the reading view redraws its header.

## Architecture

Everything is in one CommonJS file, `main.js`, that starts with `require("obsidian")` and ends with `module.exports = NotionStyleKanbanPlugin`. The Bases API calls match those used by `kanban-action-planner`:

- `this.registerBasesView(id, { name, icon, factory: (controller, containerEl) => view, options })`
- The view `extends obsidian.BasesView`, calls `super(controller)`, sets `this.type`, and implements `onDataUpdated()`.
- Entries come from `this.data.data`, each with `entry.file`. Settings are read with `this.config.get(key)` and written with `config.set`. The Properties menu order comes from `this.config.getOrder()`, and labels from `config.getDisplayName(id)`.
- Option types used: `group` (with `items`), `property`, `multitext`, `toggle` and `dropdown`. Property options return ids like `note.Status`, which `propKey()` strips to `Status`.

| Part of `main.js` | Role |
| --- | --- |
| Helpers (`propKey`, `asList`, `asString`, `parseMap`, `parseLink`, `setIconSafe`) | Read frontmatter values and links; `setIconSafe` tries fallback icon names |
| `COLORS`, `NOTION_ICON_MAP`, `NOTION_ICON_COLORS`, `renderIconValue()` | Parse and draw any `icon` value |
| `NotionKanbanView` | `settings()` reads the view config; `collect()` groups cards into lanes × columns and sorts them; `render()` / `renderCard()` build the DOM; `wireDrop()` / `moveCard()` handle drag-and-drop; `toggleSubtask()` and `createCard()` handle sub-task toggles and new cards |
| `viewOptions()` | Defines the view's options menu |
| `EMOJI_GROUPS`, `PICKER_COLORS`, `IconPicker` | The picker popover. `valueCell()` draws any value; `save(value, manual)` writes frontmatter and updates recents; `addSaved()` / `unsave()` manage Saved |
| `NoteIconHeader` | Puts the large icon into `.cm-sizer` / `.markdown-preview-sizer` before `.inline-title`. It refreshes on layout-change, file-open, active-leaf-change and metadata changes, and a MutationObserver watches only the header level |
| `NotionStyleKanbanPlugin` | Loads `data.json` settings and registers the hover source, the file-menu "Change icon" item, the command and the Bases view |

All writes go through `app.fileManager.processFrontMatter`. The view skips redrawing while a drag is in progress and keeps the scroll position when it redraws.

## How to change and test it

There's no build step: edit `main.js` and `styles.css` directly, then reload Obsidian (Ctrl+P → "Reload app without saving"). Bump `version` in `manifest.json` with each change.

How Claude worked on it in the first chat:

1. Claude was given access to the vault folder through the Claude desktop app. The shell on my computer wasn't available (virtualization is off in the BIOS), so all file work went through staging and committing.
2. It staged the files it needed into its cloud workspace, edited them there, and wrote them back to the vault. Writes to my notes used an mtime check so they wouldn't overwrite my edits.
3. It ran `node --check main.js` to catch syntax errors.
4. It tested in headless Chrome with Playwright, using a test page that stubs the `obsidian` module (`BasesView`, `setIcon`, `getIconIds`, `Menu`, `Notice`, `debounce`, the plugin base class) and Obsidian's DOM helpers (`createDiv`, `createSpan`, `empty`, `hide`, `show`, `toggleClass` and so on). It loads my notes' frontmatter as fixture data, renders the board, clicks through the features, and takes screenshots.
5. Reloading in Obsidian is still the real test.

The Notion connector can fetch page icons, which `notion-fetch` returns as `icon="icons/<name>_<color>"`. Database queries don't include icons, and each page fetch is about 5k tokens, so copy icons only for the pages that need them.

## Display titles (0.11.0)

Notes can carry their real Notion title in a `title` property; the board, links, tabs and note header show it while file names stay unique. See [display-titles.md](display-titles.md).

## Relation sections (0.18.0)

`RelationSections` draws Notion-style sections under the properties of RM Tasks notes, above the comments: **Sub-task** (checkbox or the task's own icon, status pill, tag pills) and **Related Notes** (note icon and title), one page per line, with **Link existing** and **Add new**. Both keep the other side of the relation in step: Sub-task <-> Parent task (a sub-task has one parent, so linking it here takes it off its old parent) and Related Notes <-> Task Board Item. Add new on Sub-task types a name inline and uses `Templates/RM Tasks/RM Sub-task.md`; on Related Notes it offers the Notes Database templates. Clicking a sub-task's icon toggles Done / Not started. The ⋯ button (or right-click / long-press) has Remove. The two properties are hidden from the properties list by default (right-click a property icon to show them). Sections are configurable in `data.json` as `relationSections` (see `DEFAULT_RELATION_SECTIONS`) and can be turned off in settings.

Any property holding a list of links (Completed Tasks, Parent task, Blocked by…) shows one page per line in the properties list.

## Known gaps and next steps

Caveats:

- Nothing has been checked inside Obsidian yet; only the headless tests above.
- Icons on the board come from two sources. 10 cards and 1 sub-task use the exact Notion values. The other 64 were copied from a screenshot of the Notion board and written as Lucide names with colors, so names and colors may differ slightly from Notion's.
- Notes created after the import get no icon automatically; plain tasks show a gray circle.
- The "Update Pilot Tracking Document-Slide 2026-11-18" note is on the Obsidian board but not on the Notion board. It looks like a leftover copy of a recurring task.
- The import lost comment counts, and the board doesn't have Notion's hover edit buttons.
- The import also lost Notion's card order; reorder cards by dragging.
- The emoji list is hand-picked (about 400), not the full Unicode set.

Ideas not started:

- An Upload tab in the picker, for custom images
- Inline title editing on a card, like Notion's hover pencil button
- Moving sub-tasks between parents by dragging
- Using the picker's icons in other Bases views or in the file explorer
- Copying Notion icons into the rest of RM Tasks (closed and backlog items) if those views get built
- Rebuilding the other Notion views (RP (By RT), Backlog, Blocked, CC and so on) as Bases views
