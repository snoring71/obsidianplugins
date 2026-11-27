# Notion-style buttons (0.10.0)

Notion buttons don't survive the import (the API reports them only as "unknown block"), so the plugin adds its own. A button is a `notion-button` code block in a note. You rarely need to write one by hand.

## Adding a button to a page

- Right-click in the note and choose **Insert button**, or run the command **Insert button** (Ctrl+P). Bind a hotkey in Settings → Hotkeys if you like.
- Pick one of the ready-made buttons (your Notion Button Automation Library) or one of **My buttons**, and it's inserted at the cursor.
- Or pick **New button…** to build one: give it a name and icon, then **Add action** for each step, like Notion's "When button is clicked / Do" editor. Turn on **Save to My buttons** to reuse it on other pages. My buttons are saved in the plugin's `data.json` (`buttonLibrary`); remove one with the bin icon in the picker.
- Hover a button and click the gear beside it to edit it with the same editor.

## Ready-made buttons

| Button | Does |
| --- | --- |
| Add subtask | New note "Subtask" from `Templates/RM Tasks/RM Sub-task.md`, Parent task = this page, opened in a new tab with the title selected |
| Move to Completed Tasks and set to Closed | On a sub-task: moves it to the parent's Completed Tasks and sets Status to Closed |
| Un-parent all sub-tasks | Clears this page's Sub-task list and each child's Parent task |
| Add standard test item tasks | Inserts four to-dos above the button (Test in .local, Enter CCB, Deploy to 1x/2x, Update BCM) |
| Create release planning subtasks | Asks first, then creates the 5 RP sub-tasks from `Templates/RM Tasks/RP - ….md` |
| Create new "Waiting for CCB meeting" holder task | Asks first, then creates a holder task from `Templates/RM Tasks/Waiting for CCB meeting.md` and opens it |
| Add tasks with "Waiting for CCB meeting" tag as sub-tasks | Finds RM Tasks with that tag, Status Not started / Up next / In progress, no parent, and not named "Waiting for CCB meeting…", and makes them sub-tasks of this page |
| Add / Remove "Waiting for CCB meeting" tag | Adds or removes that Tag on this page |
| Set Future tag and Date to next meeting (3 variants) | Notes Database: renames the page to "1-1 Meeting MM-DD-YYYY" for the coming Wednesday, the coming Tuesday, or the Tuesday after that. Notion's versions also had two empty "Edit a property" steps, which were left out |

## Actions (steps)

| action | Notion equivalent | Options |
| --- | --- | --- |
| `add-subtask` | Add page to RM Tasks, Parent task = This page | `name` (default "Subtask"), `template`, `properties`, `open` (`tab`, `split`, `none`), `folder` |
| `add-task` | Add page to RM Tasks | Same as add-subtask, but not linked to this page. Name defaults to the template's name |
| `complete-subtask` | Move to Completed Tasks and set to Closed | `status` (default Closed) |
| `unparent-all` | Edit This page: Sub-task remove all | none |
| `adopt-matching` | Edit tasks that match filters: Parent task = This page | `where`: a list of `{property, op, value}`. Ops: contains, not-contains, is, is-not, is-any (comma separated), starts-with, not-starts-with, is-empty, not-empty. `file.name` is the note's name. Only searches notes in the same base as this page |
| `edit-properties` | Edit This page | `changes`: a list of `{property, mode, value}` with mode set, add, remove or clear |
| `rename` | Edit This page: Name | `name` |
| `insert` | Insert blocks | `text`, `position` (`above` or `below`) |

A button can also have `confirm: <message>` (Notion's "Show confirmation") and `icon`.

Obsidian has no two-way relations, so the plugin writes both sides itself (`Sub-task` ↔ `Parent task`, and `Completed Tasks` on both notes, matching what the Notion importer wrote). New notes copy the template's properties and content, get the page's `base`, and get `Status: Not started` if the template doesn't set one.

### Variables

Names, text and property values can use:

- `{{title}}`: this page's name
- `{{today}}` or `{{today:MM-DD-YYYY}}`
- `{{next:tuesday:MM-DD-YYYY}}`: the coming Tuesday (today counts, like Notion's formula), `{{next:tuesday+1:…}}` the week after

File names can't contain `/`, so dates use dashes.

## Example block

````markdown
```notion-button
label: Create release planning subtasks
icon: calendar-plus
confirm: Are you sure you want to create sub-tasks?
steps:
  - action: add-subtask
    name: Create RM work item and SPR
    template: Templates/RM Tasks/RP - Create RM work item and SPR.md
    open: none
```
````

The older one-action form (`action: add-subtask` at the top level) still works.

## Commands

- **Insert button**
- **Add sub-task to current note**
- **Move current sub-task to Completed Tasks and set to Closed**

## Templates

`docs/templates/` holds the templates copied into the vault's `Templates/RM Tasks/`: RM Sub-task, the five RP sub-tasks and Waiting for CCB meeting, converted from the Notion templates. They have no `base` property, so they stay out of the RM Tasks base.
