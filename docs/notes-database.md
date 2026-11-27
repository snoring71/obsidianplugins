# Notes Database (0.19.0)

How the Obsidian Notes Database matches Zach's Notion Notes Database.

## "All" view

`Notion/Notes Database/Notes Database.base` (copy in [bases/Notes Database.base](bases/Notes%20Database.base)) has one table view, **All**, built from Notion's "All" view:

- Columns: Name, Topic, Sub-topic, Status, Date, Created, Task Board Item, Related (Notion's order and widths).
- Grouped by Status: Needs work, Future, Closed.
- Sorted by Date, newest first.
- Name is a formula, `file.asLink(if(note.title, note.title, file.name))`, so it shows the note's real Notion title (see [display-titles.md](display-titles.md)) and still opens the note.
- Notion's other views (Needs Work, Future, Needs Transcription, Release Planning, calendar, Full Table, Other) aren't rebuilt yet.

## Date

In Notion, every Notes template fills **Date** with the date and time the page is made, and you change it to the meeting's date when they differ. The Obsidian Notes templates (`Templates/Notes Database/`) now do the same with `Date: "{{now:YYYY-MM-DDTHH:mm}}"`. Repeating templates use the time the run was due. **Created** stays the moment the note was made.

## Status: separate options per database

Notion keeps properties per database, so Notes Database's Status (Needs work, Future, Closed) and RM Tasks' Status (Not started, Up next, In progress, Done, Closed) never clashed. In Obsidian, property names are shared by the whole vault, and the plugin's option lists and colors were too.

Since 0.19.0 a database can have its own option list for a property. Notes keep the property name `Status`, the same as Notion.

- Right-click a property's icon in a note's properties panel → **Separate options for <database>**. The database gets its own copy of the list (the options its notes use, with their colors). Click it again to go back to the shared list.
- Stored in `data.json` as `databaseProperties: { "<database>": { "<property>": { type, options } } }`. A note's database is its `base` property; a template's is its `Templates/<database>/` folder.
- Boards, the properties panel and the option editor use the note's database list. Renaming or deleting an option only changes notes in that database.
- Command **Move "Notes Status" back into Status** copies any `Notes Status` value into `Status` and removes `Notes Status` (for notes changed before this release).
