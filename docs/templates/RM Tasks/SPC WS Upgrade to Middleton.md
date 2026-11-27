---
Backlog Reason: ""
Compatible Build Lines: []
Completed Tasks: []
Minimum Version(s): ""
Tag:
  - Expedite
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
icon: "icons/circle-alternate_red"
title: "SPC WS Upgrade to Middleton"
---
- [ ] **Step 01** - Create a user story on the RM board with tasks
> [!note]+ Details
> - **Title:** SPC 204.14.13 (PMS 2024 R14) - SPR 7210
> - **Details: **Tracking upgrades to SPC 204.14.13 (PMS 2024 R14)
> - **Acceptance Criteria: **Upgrade succeeds
> - **Priority:** 100
> - **Tasks: **Deploy to AUPP1X,** **Update BCM, Approve for (alpha/beta/early release)
> - Examples: TFS 390565 (PMS), 390557 (WS)
- [ ] **Step 02** - Create SPR
> [!note]+ Details
> - **Purpose: **SPC 104.8.6 / SIM 19.7.9 / PSP 6.5.14 (WS 2024 R8)
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **104.8
> - **Product:** WS
> - **Release Tool:** AU
> - **Detail:** This SPR will be used to track the rollout of SPC 104.8.6 / SIM 19.7.9 / PSP 6.5.14 (WS 2024 R8)
- [ ] **Step 03** - Create post-upgrade check-in steps and attach to SPR
- [ ] **Step 04** - Publish build to production AU server
	- [ ] Send to AU server with “CS - SSHBOMUpdate -au AUAPP1X” tool
	- [ ] Create group
> [!note]+ Details
> - **Groupname:** Beta-205.1.15
> - **Approved:** 205.1.15
> - **Description: **205.1.15
- [ ] **Step 05**** **- Email Dawn Houle and Faith Brown asking:
	- If they have any concerns with us upgrading Middleton
	- If Dawn will let the site know we'll be upgrading them
		(Template available -* Upgrade request - Middleton - Dawn & Faith*)
> [!note]+  Example email
> **Subject:**
> William S. Middleton upgrade to WS 2024 R10
> 
> **Body:**
> 
> Hi Dawn and Faith,
> 
> RM Would like to upgrade William S. Middleton to WS 2024 R10 tomorrow evening at 10PM CST. Do either of you have any concerns with us proceeding with that upgrade?
> 
> Thank you

	- [ ] Get positive response
- [ ] **Step 09**** **- Create SR
> [!note]+ Details
> - **Type: **SW Upgrade
> - **Summary:** SPR 7728 - Upgrade to SPC 104.10.8 / SIM 19.8.1 / PSP 6.5.14 (WS 2024 R10)
> - **Assigned: **ZANGELACOS
> - **Notes:**
>     - **SPR: **7728
>     - **FO CM Note:** Upgrade date: 12/18, Check-in: 12/19 - phone call needed
- [ ] **Step 10**** **- Email CS to request post upgrade check-in support (template available - *PSS Check-in request  William S Middleton*)
	- [ ] Receive positive response
- [ ] ~~**Step 15**~~~~** **~~~~- On main tenant, schedule SPCentral-WS upgrade for 10:00PM central in Octopus~~
- [ ] ~~**Step 15**~~~~** **~~~~- On main tenant, schedule ScriptPro WS-104.5+ upgrade for 10:30PM in Octopus~~
- [ ] ~~**Step 15**~~~~** **~~~~- On main tenant, schedule ScriptPro PSP release upgrade for 11:00PM in Octopus~~
- [ ] ~~**Step 15**~~~~** **~~~~- On PSP tenant, schedule ScriptPro PSP release upgrade for 11:00PM in Octopus~~
- [ ] **Step 00** - Let Jeff know that all steps are complete
- [ ] **Step 00** - The next morning, confirm that all deployments were successful

---
```notion-button
label: Add subtask
icon: plus
steps:
  - action: add-subtask
    name: Subtask
    template: Templates/RM Tasks/RM Sub-task.md
```
