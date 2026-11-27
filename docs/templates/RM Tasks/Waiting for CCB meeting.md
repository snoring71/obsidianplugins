---
Team: Release Management
Status: Up next
Tag:
  - Waiting for CCB meeting
Parent task: []
Sub-task: []
Completed Tasks: []
icon: icons/clock-alternate_yellow
---
```notion-button
label: Add tasks with "Waiting for CCB meeting" tag as sub-tasks
icon: filter
steps:
  - action: adopt-matching
    where:
      - property: Tag
        op: contains
        value: Waiting for CCB meeting
      - property: Status
        op: is-any
        value: Not started, Up next, In progress
      - property: Parent task
        op: is-empty
      - property: file.name
        op: not-starts-with
        value: Waiting for CCB meeting
```

```notion-button
label: Un-parent all sub-tasks
icon: unlink
steps:
  - action: unparent-all
```
