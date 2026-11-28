---
Status: Needs work
Task Board Item: []
Related: []
Topic: 1-1 Meeting
icon: "icons/document_pink"
Date: "{{now:YYYY-MM-DDTHH:mm}}"
Created: "{{now}}"
title: "1-1 Meeting"
---
### Questions

- …

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
label: Set Future tag and Date to next meeting (meeting is next Tuesday or today)
icon: calendar-clock
steps:
  - action: edit-properties
    changes:
      - property: Status
        mode: set
        value: Future
      - property: Date
        mode: set
        value: '{{next:tue:YYYY-MM-DD}}'
  - action: rename
    name: 1-1 Meeting {{next:tue:MM/DD/YYYY}}
```
```notion-button
label: Set Future tag and Date to next meeting (meeting is next next Tuesday)
icon: calendar-clock
steps:
  - action: edit-properties
    changes:
      - property: Status
        mode: set
        value: Future
      - property: Date
        mode: set
        value: '{{next:tue+1:YYYY-MM-DD}}'
  - action: rename
    name: 1-1 Meeting {{next:tue+1:MM/DD/YYYY}}
```
```notion-button
label: Add today's date to title
icon: calendar
steps:
  - action: rename
    name: '{{title}} {{today:MM/DD/YYYY}}'
```
