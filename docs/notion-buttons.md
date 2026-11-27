# Notion-style buttons (0.8.0)

Notion buttons don't survive the import (the API reports them only as "unknown block"), so the plugin adds its own. A button is a code block in a note:

````markdown
```notion-button
label: Add subtask
action: add-subtask
```
````

In reading view and Live Preview it shows as a Notion-style button. Clicking the code block's edge (or switching to source mode) shows the settings again.

## Actions

| action | Notion equivalent | What it does |
| --- | --- | --- |
| `add-subtask` | Add page to RM Tasks as *RM Sub-task*, Name = "Subtask", Parent task = This page | Creates a note next to this one, copies `base`, sets `Parent task` to this note and adds the new note to this note's `Sub-task`. Opens it in a new tab with the title selected. |
| `complete-subtask` | Move to Completed Tasks and set to Closed | On a sub-task: adds the parent to `Completed Tasks`, clears `Parent task`, sets `Status: Closed`. On the parent: removes it from `Sub-task`, adds it to `Completed Tasks`. |
| `unparent-all` | Un-parent all sub-tasks | Clears this note's `Sub-task` and removes this note from each child's `Parent task`. |
| `insert` | Insert blocks above button | Inserts `text` above (or `position: below`) the button. |

Obsidian has no two-way relations, so the plugin writes both sides itself (`Sub-task` ↔ `Parent task`, and `Completed Tasks` on both notes, matching what the Notion importer wrote).

## Options

| option | default | used by |
| --- | --- | --- |
| `label` | "Button" | all |
| `icon` | none | all. Same values as the `icon` property (`plus`, `check:green`, an emoji) |
| `confirm` | none | all. Shows a Continue / Cancel dialog with this message first |
| `name` | "Subtask" | add-subtask. Notes need unique file names, so repeats become "Subtask 1", "Subtask 2" |
| `template` | `Templates/RM Tasks/RM Sub-task.md` | add-subtask. Its properties (except `base`, `notion-id`, `manual_order`) and body are copied. Missing template = blank note |
| `tasks` | none | add-subtask. A list of `{name, template, properties}` to create several sub-tasks at once |
| `properties` | none | add-subtask. Extra properties to set, e.g. `properties: {Team: Personal}` |
| `open` | `tab` (one task) / `none` (several) | add-subtask. `tab`, `split` or `none` |
| `folder` | the note's folder | add-subtask |
| `status` | "Closed" | complete-subtask |
| `text`, `position` | — / `above` | insert |
| `parentProperty`, `subtaskProperty`, `completedProperty`, `statusProperty` | Parent task, Sub-task, Completed Tasks, Status | all |

New sub-tasks get `Status: Not started` when the template doesn't set one (Notion's default status).

## Commands

- **Add sub-task to current note**: same as the default Add subtask button. Bind a hotkey in Settings → Hotkeys.
- **Move current sub-task to Completed Tasks and set to Closed**

## Your Notion buttons, as blocks

From the "Button Automation Library" template in RM Tasks:

````markdown
```notion-button
label: Add subtask
action: add-subtask
```

```notion-button
label: Move to Completed Tasks and set to Closed
action: complete-subtask
```

```notion-button
label: Un-parent all sub-tasks
action: unparent-all
```

```notion-button
label: Add standard test item tasks
action: insert
text: |
  - [ ] Test in .local
  - [ ] Enter CCB
  - [ ] Deploy to 1x/2x
  - [ ] Update BCM
```

```notion-button
label: Create release planning subtasks
action: add-subtask
confirm: Are you sure you want to create sub-tasks?
tasks:
  - name: Create RM work item and SPR
    template: Templates/RM Tasks/RP - Create RM work item and SPR.md
  - name: Get initial list of candidate sites
    template: Templates/RM Tasks/RP - Get initial list of candidate sites.md
  - name: Create release planning document
    template: Templates/RM Tasks/RP - Create release planning document.md
  - name: Schedule release planning meeting
    template: Templates/RM Tasks/RP - Schedule release planning meeting.md
  - name: Hold meeting and update document-SPR
    template: Templates/RM Tasks/RP - Hold meeting and update document-SPR-Notion-Pilot board.md
```
````

The five RP templates don't exist in the vault yet; until they do, those sub-tasks are created blank.

Not yet covered: the CCB buttons that create a holder task, or edit every task matching a filter, and the Notes Database date buttons.
