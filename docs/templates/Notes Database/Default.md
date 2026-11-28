---
Status: Needs work
Task Board Item: []
Related: []
Topic: Other
icon: "icons/document_lightgray"
Date: "{{now:YYYY-MM-DDTHH:mm}}"
Created: "{{now}}"
title: ""
template-default: true
---
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
label: Add today's date to title
icon: calendar
steps:
  - action: rename
    name: '{{title}} {{today:MM/DD/YYYY}}'
```
