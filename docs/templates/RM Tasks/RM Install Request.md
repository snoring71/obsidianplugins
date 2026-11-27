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
Sub-task: []
icon: "icons/gear_blue"
title: "RM Install Request -"
---
- [ ] Draft install request form
- [ ] Send draft to Lindsey and other interested parties for review
	```notion-button
	label: Add "Waiting for feedback" tag
	icon: tag
	steps:
	  - action: edit-properties
	    changes:
	      - property: Tag
	        mode: add
	        value: Waiting for feedback
	```
- [ ] Get approval
	```notion-button
	label: Remove "Waiting for feedback" tag
	icon: x
	steps:
	  - action: edit-properties
	    changes:
	      - property: Tag
	        mode: remove
	        value: Waiting for feedback
	```
- [ ] Send completed install request form to Alyssa P and *ScriptPro Sales Operations* DL, adding anyone else involved in the project including product owner(s) and site’s Account Manager

---
```notion-button
label: Move to Completed Tasks and set to Closed
icon: check-square
steps:
  - action: complete-subtask
    status: Closed
```
