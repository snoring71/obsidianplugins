# Display titles (0.11.0)

Obsidian names a note after its file, and one folder can't hold two files with the same name. Notion has no such limit, so the Notion importer renamed repeated titles inside a database folder ("Create release planning document 1", "… 2") and replaced characters that file names can't hold (`/` became `-`, `:` was dropped, a leading `.` was removed, date mentions were sometimes dropped).

The plugin now lets a note carry its real title in a `title` property, while the file name stays unique behind the scenes.

## Where the title shows

- Board cards, sub-task rows and relation chips on cards
- The note header: notes with a `title` property get a Notion-style editable title in place of Obsidian's inline title
- The note's tab
- Link labels (`[[file|label]]`) written by the plugin, such as Sub-task and Parent task links

The `title` row is hidden in the properties panel by default, since the header shows it. Its visibility can be changed like any other property.

## Editing a title

Click the title in the note header and type. Enter or clicking away saves it, and Escape cancels. The plugin then:

1. Writes the new `title`.
2. Relabels links in other notes that showed the old name.
3. Renames the file to match the title when it can, adding " 1", " 2" only if another note in the folder already has that name. A file that already fits the title ("Create release planning document 3" for "Create release planning document") is left alone.

The command "Edit title of current note" adds a title to any note and puts the cursor in it.

## New notes

- "+ New task" on the board creates an untitled note with an empty title and puts the cursor in the header.
- Button-created notes (add sub-task and the release planning buttons) get the button's name as their title, so repeated template tasks all show the same clean name.
- The "Rename page" button step sets the title (and renames the file when it can).

## Backfilling imported notes

The command "Use Notion page titles for imported notes" reads `notion-titles.json` from the plugin folder (a map of Notion page id to title, made from the Notion API; it is not in this repo). It matches notes by their `notion-id`, lists every note whose file name differs from its Notion title, and only writes after you press Apply. An option also relabels the links in other notes that still show the old file name. Notes that already have a `title` property are skipped, so running it again is safe.

## Not covered

Obsidian's own file explorer, Quick Switcher, search results, Bases table "Name" columns and the view header breadcrumb still show the file name. In a Bases table, add the `title` property as a column, or a formula such as `if(note.title, note.title, file.name)`.
