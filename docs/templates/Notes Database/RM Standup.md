---
Status: Needs work
Task Board Item: []
Related: []
Topic: RM Standup
icon: "icons/document_blue"
Created: "{{now}}"
title: "RM Standup"
---
### Tasks finished/Questions:

- …

> [!note]+ Claude’s suggestions


> [!note]+ Recently edited items
> <!-- Linked database (not supported by Notion API) -->

### Meeting Notes

- …

---
```notion-button
label: Add "Needs transcription" tag and set status to "Needs work"
icon: mic
steps:
  - action: edit-properties
    changes:
      - property: Sub-topic
        mode: set
        value: Needs transcription
      - property: Status
        mode: set
        value: Needs work
```
```notion-button
label: Set Future status and Date to next meeting
icon: calendar-clock
steps:
  - action: edit-properties
    changes:
      - property: Status
        mode: set
        value: Future
      - property: Date
        mode: set
        value: '{{after:tue,thu:YYYY-MM-DD}}'
  - action: rename
    name: RM Standup {{after:tue,thu:MM/DD/YYYY}}
```
```notion-button
label: Add today's date to title
icon: calendar
steps:
  - action: rename
    name: '{{title}} {{today:MM/DD/YYYY}}'
```
