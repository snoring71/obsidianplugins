---
Team: Release Management
Status: Up next
Tag: []
Parent task: []
Sub-task: []
Completed Tasks: []
icon: icons/square_lightgray
---
- [ ] Wait for completion of all development and pre-integration testing
- [ ] Confirm that new functionality is eligible to be enabled with the release it will be delivered with (if the answer is no, release planning stops here until it is ready)
- [ ] Create a work item on RM board to track release planning (ex. TFS 381365)
- [ ] Create an SPR (can be placeholder at this time. Template available at SPR 645. Note that it is a placeholder with timestamp)
	> [!note]- Detail
	> Make sure that we review any request and make sure that it does not affect DOD or PCI Change Control compliance.
	>
	> Details/Justification:
	>
	> Account Scope:
	>
	> Deliverables:
	>
	> Timeline/Priority:
	>
	> Risk (Low, Medium, High): - See Internal Knowlege Base answer 1558 for SQL Guidelines and Risk Eval information
	>
	> Risk is used to determine what level of SQL review may be necessary for any SPR that involves the creation of data pulls or update statements.
	> \*Low Risk - single SQL review required (PILs or DBAs)
	> \*Medium Risk - single or joint (PILs/DBAs) SQL review required based on scope
	> \*High Risk - requires joint SQL review (PILs/DBAs)

	> [!note]- Project Notes
	> See Internal Knowlege Base answer 1558 for SQL Guidelines and Risk Eval information. Risk is used to determine what level of SQL review may be necessary for any SPR that involves the creation of data pulls or update statements.
- [ ] Add SPR to *Update Pilot Tracking Document/Slide* template

---

```notion-button
label: Move to Completed Tasks and set to Closed
icon: check-square
steps:
  - action: complete-subtask
    status: Closed
```
