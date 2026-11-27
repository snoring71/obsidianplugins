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
title: "SPC Upgrades for Local Alpha - Spalitto’s"
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
> [!note]+ WMS 2.0 systems without PSP
> - **Purpose: **SPC 204.16.24 (PSE 2024 R16.5) - Scope includes WMS 2.0 systems without PSP
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **204.16
> - **Product:** (leave blank)
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of SPC 204.16.24 (PMS 2024 R16.5). Scope includes WMS 2.0 systems without PSP only.

> [!note]+ WMS 2.0 systems with PSP
> - **Purpose: **SPC 204.16.24 (PSE 2024 R16.5) - Scope includes WMS 2.0 systems with PSP
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **204.16
> - **Product:** (leave blank)
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of SPC 204.16.24 (PMS 2024 R16.5). Scope includes WMS 2.0 systems with PSP only.

> [!note]+ WMS 1.0
> - **Purpose: **SPC 104.8.6 / SIM 19.7.9 / PSP 6.5.14 (WS 2024 R8)
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **104.8
> - **Product:** WS
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of SPC 104.8.6 / SIM 19.7.9 / PSP 6.5.14 (WS 2024 R8)
- [ ] **Step 03** - Create **Octopus deploy** post-upgrade check-in steps and attach to SPR
- [ ] **Step 04** - Publish build to production AU server and Octopus1x/2x
	- [ ] Send to AU server with “CS - SSHBOMUpdate -au AUAPP1X” tool
	- [ ] Create group
> [!note]+ Details
> - **Groupname:** Beta-205.1.15
> - **Approved:** 205.1.15
> - **Description: **205.1.15
	- [ ] Deploy to Octopus 1x/2x via *SPCentral-WS - Delivery* pipeline
- [ ] **Step 05** - Call Spalitto’s to let them know that an upgrade is happening tonight and that site support will be there in the morning (phone number: (816) 231-4717)
- [ ] **Step 08** - Request input from Megan for site support and send email with release notes (template available)
	- [ ] Send email with release notes to support personnel
- [ ] **Step 09**** **- Create SR
> [!note]+ Details
> - **Type: **SW Upgrade
> - **Summary:** SPR 7603 - Upgrade to SPC 205.1.11 (PMS 2025 R1)
> - **Assigned: **ZANGELACOS
> - **Notes:**
>     - **SPR: **7603
>     - **If we have site support:**
>         - **FO CM Note:** Upgrade date: 12/18, Check-in: 12/19 - phone call not needed (site support provided)
>     - **If we do not have site support:**
>         - **FO CM Note:** Upgrade date: 12/18, Check-in: 12/19 - phone call needed
>     - **If it is a test system:**
>         - **FO CM Note:** Upgrade date: 12/18, Check-in 12/19 - phone call not needed as this is a test system
- [ ] **Step 10**** **- Email CS to request post upgrade check-in support (template available: *PSS Check-in request Spalitto’s Pharmacy*)
	- [ ] Receive positive response
- [ ] **Step 13** - Confirm that Josh G has scheduled the *SPCentral-WS* deployment for 3AM and *ScriptPro WS - 104.5+* for 4AM 
- [ ] **Step 00** - Let Jeff know that all steps are complete

---
```notion-button
label: Add subtask
icon: plus
steps:
  - action: add-subtask
    name: Subtask
    template: Templates/RM Tasks/RM Sub-task.md
```
