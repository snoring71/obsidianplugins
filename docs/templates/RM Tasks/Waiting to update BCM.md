---
Team: Release Management
Status: Up next
Tag:
  - Waiting to update BCM
Parent task: []
Sub-task: []
Completed Tasks: []
icon: icons/clock-alternate_yellow
---
```notion-button
label: Add tasks with "Waiting to update BCM" tag as sub-tasks
icon: filter
steps:
  - action: adopt-matching
    where:
      - property: Tag
        op: contains
        value: Waiting to update BCM
      - property: Status
        op: is-any
        value: Not started, Up next, In progress
      - property: Parent task
        op: is-empty
      - property: file.name
        op: not-starts-with
        value: Waiting to update BCM
```

```notion-button
label: Un-parent all sub-tasks
icon: unlink
steps:
  - action: unparent-all
```
