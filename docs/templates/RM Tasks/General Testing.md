---
Backlog Reason: ""
Compatible Build Lines: []
Completed Tasks: []
Minimum Version(s): ""
Tag: []
SPR: ""
Related Notes: []
TFS Item: ""
Related Tasks: []
Note: ""
Release Train: []
Blocked by: []
Parent task: []
Blocking: []
Status: Up next
To-do List: false
Blocked Reason: ""
Team: Release Management
Sub-task: []
icon: "icons/chemistry_green"
title: "General Testing"
---

---
```notion-button
label: Add standard tasks
icon: list-checks
steps:
  - action: insert
    position: top
    text: "- [ ] Test in .local\n- [ ] Enter CCB\n\t```notion-button\n\tlabel: Add \"Waiting for CCB meeting\" tag\n\ticon: tag\n\tsteps:\n\t  - action: edit-properties\n\t    changes:\n\t      - property: Tag\n\t        mode: add\n\t        value: Waiting for CCB meeting\n\t```\n- [ ] Confirm that CCB is approved\n\t```notion-button\n\tlabel: Remove \"Waiting for CCB meeting\" tag\n\ticon: x\n\tsteps:\n\t  - action: edit-properties\n\t    changes:\n\t      - property: Tag\n\t        mode: remove\n\t        value: Waiting for CCB meeting\n\t```\n- [ ] Deploy to 1x/2x\n- [ ] Update BCM\n- [ ] Close item on RM board\n\t```notion-button\n\tlabel: Set Status to Done\n\ticon: check\n\tsteps:\n\t  - action: edit-properties\n\t    changes:\n\t      - property: Status\n\t        mode: set\n\t        value: Done\n\t```"
```
```notion-button
label: Add subtask
icon: plus
steps:
  - action: add-subtask
    name: Subtask
    template: Templates/RM Tasks/RM Sub-task.md
```
```notion-button
label: Create new "Waiting for CCB meeting" holder task
icon: clock
confirm: Are you sure you want to create a new task? Please confirm that an open task does not already exist.
steps:
  - action: add-task
    template: Templates/RM Tasks/Waiting for CCB meeting.md
    open: tab
```
```notion-button
label: Create new "Waiting to update BCM" holder task
icon: clock
confirm: Are you sure you want to create a new task? Please confirm that an open task does not already exist.
steps:
  - action: add-task
    template: Templates/RM Tasks/Waiting to update BCM.md
    open: tab
```
