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
icon: "icons/sunset_orange"
title: "End of Sales/End of Support"
---
- [ ] Create End of Sales PI as soon as an End of Sales date is planned
	- The PI Class will be “End of Sales”
	- The title should be “End of Sales: <Product>”
	- Add a comment in the Notes section detailing why the PI was entered (Ex.: Entered at request of LMCDONALD.”)
- [ ] Create End of Support PI at the same time as the End of Sales PI
	- The PI Class will be “End of Support”
	- The title should be “End of Support: <Product>”
	- Add a comment in the Notes section detailing why the PI was entered (Ex.: Entered at request of LMCDONALD.”)
	- Set the “PI Major” field to the PI number of the corresponding End of Sales PI
		- Note: This creates an easy link back to the End of Sales PI since the end of Support date often lags behind the End of Sales date.
	- [ ] If we have a list of customers with the product installed, attach the file to the PI and put the list in the Problem Statement or Notes section if short enough
- [ ] Reply to email thread where this was requested with the new PI numbers, asking for clarification on end of support/sales date if needed and product description
- [ ] Send notification email to ScriptPro Marketing DL with dates and description of product (Outlook template available: *End of Sales End of Support PIs notification to Marketing*)

---
```notion-button
label: Add subtask
icon: plus
steps:
  - action: add-subtask
    name: Subtask
    template: Templates/RM Tasks/RM Sub-task.md
```
