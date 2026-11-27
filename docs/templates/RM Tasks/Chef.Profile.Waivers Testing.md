---
Backlog Reason: ""
Compatible Build Lines: []
Completed Tasks: []
Minimum Version(s): ""
Tag:
  - Chef Special
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
icon: "🍤"
title: "Chef.Profile.Waivers Testing"
---
> [!note]+ Email text


- [ ] Create TFS item from notification email
	- Title: New cookbook name and version number
	- Details: Copy/paste User Story info
	- A/C: Testing passes
	- Release Notes: Other info from email
	- Priority: 200
	- Sponsor: SYS ENG
- [ ] Add the original work item as Related
- [ ] Set item’s status to Active
- [ ] Create tasks
	- test in .local, enter CCB, deploy to chef1x and 2x, update BCM
- [ ] Deploy to .local and confirm it succeeds
- [ ] Open the deploy logs and select the Agent Phase
- [ ] Select the SSH File Copy to Media Server (Waiver) step
- [ ] Confirm that it has copied waivers.yaml to the M drive on the remote machine
- [ ] Confirm the message “Completed copying 1 files to the remote machine”
- [ ] Enter CCB before Thursday 1PM
> [!note]+ Details
> - **Organization Type:** DoD; PCI (PMS); WMS; SA
> - **Severity:** Minor
> - **Brief Description**: Chef.Profile.*** X.X.XX
> - **Type of Change:** Chef
> - **Date Requested:** Today
> - **Requested By:** Zach Angelacos
> - **Requestor’s Dept/Workgroup:** FO
> - **Person(s) designated/assigned for implementation changes: ****Zach Angelacos**
> - **Urgency: **Normal deployment process
> - **Requested Implementation Timeframe:** Defer to Jeff Dean
> - **Summary of Requested Change: **<details section from work item>
> - **Reason for Change Request:** Chef.Profile.*** X.X.XX
> - **Specific sites/software builds requiring change/fix:** N/A
> - **SR/PI/SIR#/SPR/TFS ID:** TFS link to RM item
> - **Prerequisites: **No new prerequisites *(usually)*
> - **Implementation Steps:** <Release Notes section from work item>
> - **TFS Item where testing was completed:** Muppets and RM TFS IDs
> - **Can this release be done during the day?:** Yes
> - **Does this require desktop interaction?:** No
> - **Is backup (copyme) required?:** No
> - **Risk Level:** Low
> - **Estimated Effort to Implement (FTEs/hours/etc.): **Defer to CSIS
> - **List available mitigation/roll back options: **Unapprove cookbook
> - **Is user training required? If yes, describe: **No
> - **Customer Communication Required?: **No

```notion-button
label: Add "Waiting for CCB meeting" tag
icon: tag
steps:
  - action: edit-properties
    changes:
      - property: Tag
        mode: add
        value: Waiting for CCB meeting
```

- [ ] Confirm that CCB is approved during meeting on Thursday at 1PM
	```notion-button
	label: Remove "Waiting for CCB meeting" tag
	icon: x
	steps:
	  - action: edit-properties
	    changes:
	      - property: Tag
	        mode: remove
	        value: Waiting for CCB meeting
	```
- [ ] Deploy to Chef COM
- [ ] Deploy to Chef MIL
- [ ] Update the Chef sheet on the BCM with the new approved version
- [ ] Close original Muppets item(s) in Release MGMT backlog
- [ ] Close item on Release Management TFS board
```notion-button
label: Set this item's status to Done
icon: check
steps:
  - action: edit-properties
    changes:
      - property: Status
        mode: set
        value: Done
```

---
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
