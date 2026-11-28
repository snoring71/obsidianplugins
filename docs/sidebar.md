# Notion-style sidebar

A side panel (ribbon icon **Notion sidebar**, or the command "Open Notion sidebar") that lists the
vault the way Notion's sidebar lists a workspace. It opens in the left sidebar the first time the
plugin loads, next to the file explorer. It uses no Node or Electron APIs, so it works on iOS, where
it sits in the left drawer and closes itself after you open something.

## What it shows

- **Search** opens the quick switcher. **Inbox** opens the reminders inbox (with the unread count). **New page** makes an empty page in the root folder.
- **Favorites**: anything you starred. Star from a row's ⋯ menu, or right-click any note, base or
  folder in the file explorer and choose "Add to Favorites".
- **Private**: everything under the root folder (`Notion` by default, the importer's output).

Each folder is read the way the Notion importer laid it out:

| On disk | In the sidebar |
| --- | --- |
| folder with `<name>.base` (or any `.base`) | database: click opens the base, the chevron lists its views; click a view to open it. Its notes are not listed (RM Tasks has ~1,900). |
| folder with `<name>.md` | page with sub-pages: click opens the note, the chevron lists the rest of the folder |
| other folder | plain folder (folders with no notes or bases inside, like attachment folders, are hidden) |
| `.md` file | page |

Names use the note's `title` property when it has one.

## Row actions

- **+** on a page adds a sub-page (a page without sub-pages first becomes a folder with its note
  inside, like the importer does it; links are updated by Obsidian). **+** on a database opens the
  template "New" menu.
- **⋯** (or right-click): Open in new tab, Change icon, Add a page inside / New entry, Move up / Move
  down, then Obsidian's own file menu (rename, delete, Add to Favorites, …).
- Drag a row up or down to reorder it among its siblings (desktop). On a phone, use Move up / down.

## Where things are saved

Page icons are the note's `icon` property (the same icon shows on cards and above the title).
View icons are the ones set on the view tab bar. Everything else is in `data.json` under `sidebar`:

| Key | What |
| --- | --- |
| `root` | the folder the Private section lists (`""` = whole vault) |
| `order` | parent path → child paths, in the order you dragged them |
| `expanded` | open rows, as `<section>\|<path>` |
| `favorites` | starred paths (a page's or database's folder) |
| `icons` | icons for databases and folders, by path |
| `closedSections` | collapsed section headers |
| `seeded`, `placed` | first-run flags |

On first run the Private order and icons are copied from Notion's sidebar (RM Tasks, Notes Database,
Release Management, Reference Library, To-Do List, Scratch Pad, Personal, Backup Strategy, Backup
Tasks, Timesheet, Archive). Renaming or moving files keeps their order, icons and favorites.
