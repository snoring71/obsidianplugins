# Notion-style buttons (0.14.0)

Notion buttons don't survive the import (the API reports them only as "unknown block"), so the plugin adds its own. A button is a `notion-button` code block in a note. You rarely need to write one by hand.

## Adding a button to a page

- Right-click in the note and choose **Insert button**, or run the command **Insert button** (Ctrl+P). Bind a hotkey in Settings → Hotkeys if you like.
- Pick one of the ready-made buttons (your Notion Button Automation Library) or one of **My buttons**, and it's inserted at the cursor.
- Or pick **New button…** to build one: give it a name and icon, then **Add action** for each step, like Notion's "When button is clicked / Do" editor. Turn on **Save to My buttons** to reuse it on other pages. My buttons are saved in the plugin's `data.json` (`buttonLibrary`); remove one with the bin icon in the picker.
- Hover a button and click the gear beside it to edit it with the same editor.

## Ready-made buttons

These are the buttons on the RM Tasks templates in Notion (read 2026-11-27), which replaced the older Button Automation Library set.

| Button | On Notion templates | Does |
| --- | --- | --- |
| Add subtask | 24 templates | New note "Subtask" from `RM Sub-task`, Parent task = this page, opened in a new tab |
| Move to Completed Tasks and set to Closed | RM Sub-task, RP sub-tasks, RM Install Request | Moves this sub-task to the parent's Completed Tasks and sets Status to Closed |
| Set this item's status to Done | Chef templates | Status = Done |
| Create release planning subtasks | Release Planning | Asks first, then creates 6 RP sub-tasks (now including Request documentation and approval) |
| Create product development lifecycle meeting sub-tasks | Product Development Lifecycle meeting | Asks first (Yes / Cancel), then creates "Meeting preparation tasks" and "Meeting follow-up tasks" |
| Create new "Waiting for CCB meeting" / "Waiting to update BCM" holder task | Chef, General Testing, Azul, Eyecon | Asks first, creates the holder task from its template and opens it |
| Add tasks with "Waiting for CCB meeting" / "Waiting to update BCM" tag as sub-tasks | the two holder templates | Tasks with that tag, Status Not started / Up next / In progress, no parent, and not another holder, become sub-tasks of this page |
| Un-parent all sub-tasks | the two holder templates | Clears this page's Sub-task list and each child's Parent task |
| Add standard tasks | General Testing | Inserts the standard testing to-dos at the top of the page (under the comments), with Add / Remove "Waiting for CCB meeting" tag and Set Status to Done buttons under the matching to-dos |
| Add / Remove tag: "Waiting for CCB meeting", "Waiting for feedback", "Waiting on dev work", "Waiting on testing" | Chef, Azul, Eyecon, RM Install Request, iOS | Adds or removes that Tag |
| Add "Waiting on testing" tag and move to backlog / Remove … and move out of backlog | New iOS release review/testing | Tag plus Team = General Backlog, or Team = Release Management |
| Two week reminder and move to General Backlog | Azul Zulu JRE | Reminder Date = 14 days from today at 9:00 AM, Team = General Backlog |

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
| `insert` | Insert blocks | `text`, `position` (`above`, `below`, or `top` = under the properties and comments) |

A button can also have `confirm: <message>` (Notion's "Show confirmation"), `confirmText` for its Continue button, and `icon`.

Obsidian has no two-way relations, so the plugin writes both sides itself (`Sub-task` ↔ `Parent task`, and `Completed Tasks` on both notes, matching what the Notion importer wrote). New notes copy the template's properties and content, get the page's `base`, and get `Status: Not started` if the template doesn't set one.

### Variables

Names, text and property values can use:

- `{{title}}`: this page's name
- `{{today}}` or `{{today:MM-DD-YYYY}}`, `{{today+14:YYYY-MM-DD}}` for 14 days from today
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

`docs/templates/` holds the templates copied into the vault's `Templates/RM Tasks/`: RM Sub-task, the six RP sub-tasks, the two PDLC meeting sub-tasks, and the Waiting for CCB meeting / Waiting to update BCM holders, converted from the Notion templates. They have no `base` property, so they stay out of the RM Tasks base.
