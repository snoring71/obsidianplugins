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
title: "New SPC Release (Tasks 1-4)"
---
- [ ] **Step 01** - Create a user story on the RM board with tasks
> [!note]+ Details
> - **Title:** PSE 204.14.13 (PSE 2024 R14) - SPR 7210
> - **Details: **Tracking upgrades to PSE 204.14.13 (PSE 2024 R14)
> - **Acceptance Criteria: **Upgrade succeeds
> - **Priority:** 100
> - **Tasks: **Deploy to AUPP1X,** **Update BCM, Approve for (alpha/beta/early release)
> - Examples: TFS 390565 (PMS), 390557 (WS)
- [ ] **Step 02** - Create SPR
> [!note]+ PMS systems
> - **Purpose: **PSE 204.16.24 (PSE 2024 R16.5) - Scope includes PMS systems
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **204.16
> - **Product:** PMS
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of PSE 204.16.24 (PSE 2024 R16.5). Scope includes PMS systems.

> [!note]+ PMS systems without PSP
> - **Purpose: **PSE 204.16.24 (PSE 2024 R16.5) - Scope includes PMS systems without PSP
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **204.16
> - **Product:** PMS
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of PSE 204.16.24 (PSE 2024 R16.5). Scope includes PMS systems without PSP only.

> [!note]+ PMS systems with PSP
> - **Purpose: **PSE 204.16.24 (PSE 2024 R16.5) - Scope includes PMS systems with PSP
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **204.16
> - **Product:** PMS
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of PSE 204.16.24 (PSE 2024 R16.5). Scope includes PMS systems with PSP only.

> [!note]+ WMS 2.0 systems without PSP
> - **Purpose: **PSE 204.16.24 (PSE 2024 R16.5) - Scope includes WMS 2.0 systems without PSP
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **204.16
> - **Product:** (leave blank)
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of PSE 204.16.24 (PSE 2024 R16.5). Scope includes WMS 2.0 systems without PSP only.

> [!note]+ WMS 2.0 systems with PSP
> - **Purpose: **PSE 204.16.24 (PSE 2024 R16.5) - Scope includes WMS 2.0 systems with PSP
> - **Status: **Upgrade Tracking
> - **Assigned: **JSMITH
> - **PM Owner: **FOCM Project
> - **Release Phase:** (depends on release)
> - **Branches: **204.16
> - **Product:** (leave blank)
> - **Release Tool:** Octopus
> - **Detail:** This SPR will be used to track the rollout of PSE 204.16.24 (PSE 2024 R16.5). Scope includes WMS 2.0 systems with PSP only.

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
- [ ] **Step 03** - Create post-upgrade check-in steps and attach to SPR (not necessary for RS builds)
- [ ] **Step 04** - Publish build to production AU server
	- [ ] Send to AU server with “CS - SSHBOMUpdate -au AUAPP1X” tool
	- [ ] Create group
> [!note]+ Details
> - **Groupname:** Beta-205.1.15
> - **Approved:** 205.1.15
> - **Description: **205.1.15
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
