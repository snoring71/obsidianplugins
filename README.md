# Obsidian plugins

Custom Obsidian plugins that recreate the look and feel of a Notion workspace in Obsidian.

## Plugins

| Folder | Plugin | What it does |
| --- | --- | --- |
| `plugins/notion-style-kanban` | Notion-style Kanban | A Bases view that draws a Notion-style board (swimlanes, colored tags, sub-tasks inside parent cards, drag-and-drop), plus a Notion-style icon picker, a large icon above each note's title, and a Notion-style sidebar for pages and databases ([docs](docs/sidebar.md)). |

Design notes and history are in [`docs/notion-style-kanban-handoff.md`](docs/notion-style-kanban-handoff.md).

## Installing

There's no build step. Copy a plugin folder's `main.js`, `styles.css` and `manifest.json` into
`<vault>/.obsidian/plugins/<plugin-id>/`, then reload Obsidian (Ctrl+P, "Reload app without saving")
and enable the plugin under Settings → Community plugins.

`data.json` (per-vault settings) is not tracked.
