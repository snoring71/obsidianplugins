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
icon: "icons/cafe_brown"
title: "Azul Zulu JRE New Version testing"
---
> [!note]+ Testing note
> **Update **** @Today ****: **The RM process for this changed ~6 months ago. Josh treats this like any other Chef item and does the Chef testing and enters a CCB. I complete the manual Mirth testing and the rest of the steps to hand the project off to FOSI.
> 
> Note: New Azul JRE releases cannot be performed during the day since it restarts Mirth interfaces.
> 
> Note: The Octopus project that deploys Azul Zulu JRE version requires that the Chef environment of the tenant you are deploying to be set to the current version of the release in TFS. So, for example, if we want to deploy a new Azul Zulu JRE version 17.54.21, which is contained in Chef.Cookbook.JavaRuntimeEnvironment - Production 1.0.19.1, we must first approve the Chef.Cookbook.JavaRuntimeEnvironment - Delivery pipeline build for .LOCAL. Then, to get it successfully deployed to a client, for example FO-PMS-C-3V, which is in the Integration Chef environment, we have to go to *Chef .LOCAL > Infrastructure > Chef Infra Servers > Chef Infra (local) > scriptpro > Environments > integration* and then set scriptpro_javaruntimeenvironment to 1.0.19. We can then deploy the release via Octopus and it should succeed.

- [ ] ~~Approve the new Chef.Cookbook.JavaRuntimeEnvironment - Delivery pipeline build for .LOCAL~~
- [ ] ~~Queue up: unassigned, development~~
- [ ] ~~Check results: unassigned, development~~
- [ ] ~~Queue up: beta, integration, production~~
- [ ] ~~Check results: beta, integration, production~~
- [ ] Confirm that Chef testing has passed
	- [ ] Check each environment in .LOCAL Chef to confirm that it has been updated to the latest scriptpro_javaruntimeenvironment version (*.LOCAL Chef > Infrastructure > Chef Infra Servers > Chef Infra (Local) > scriptpro > Environments > environment > scriptpro_javaruntimeenvironment*)
	- [ ] Check for Failed Nodes at *Infrastructure > Client Runs*. If there are a significant number of failures, download the CSV report and check to see if the scriptpro_javaruntimeenvironment version is passing
- [ ] Confirm that the new release has been automatically created in Octopus (this may need to be created manually)
- [ ] Deploy the new Azul JRE Octopus release to FO-PMS-C-3V (this server is in the Chef “integration” environment)
- [ ] Run the Mirth test located here: 
	H:\Personal_Files\Release Management\Testing\Mirth testing\To test the Mirth interface.docx
	(Originally from *U:\FIELD_OPERATIONS\PRODUCT_DEVELOPMENT\Testing\Mirth Test)*
	Note: The required files should already be on the server in SPCentral\Custom. The Mirth Manager program that lives in the toolbar does not need to be running for this. Only the Mirth service must be running (”Mirth Connect Service”)
- [ ] Confirm that Josh has entered CCB before Thursday 1PM
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
- [ ] Approve the pipeline for Production
- [ ] Approve the pipeline for Secure
- [ ] Confirm that the release’s name is correct in Octopus .COM
- [ ] Update the Chef sheet on the BCM with the new approved version
- [ ] Create SPR
> [!note]+ Details
> - **Purpose:** Azul JRE 17.54.21.1
> - **PW Owner:** FOSI Project
> - **Release Tool:** Octopus
> - **Details/Justification:** Azul JRE Octopus project enables the installation and upgrade of Azul Zulu JRE to version 17.54.21.
> - **Account Scope:** Mirth 4.X sites, other sites running previous versions of Azul JRE.
> - **Deliverables:** Azul JRE 17.54.21
> - **Implementation Steps:** Deploy Azul JRE release 17.54.21 via Octopus
> - **Timeline/Priority:** As soon as possible
> - **Risk (Low, Medium, High):**
- [ ] Mass SR entry including 3 entries for ScriptPro USA CS DoD Lab ([[Notion/Reference Library/Siebel/Mass SR Entry]])
> [!note]+ Details
> - Use saved query “Azul Zulu JRE” and add 3 entries for ScriptPro USA CS DoD Lab (rowID 1-CEKORF, WS, PMS, **PMS Test System**). Manually remove duplicates.
> - **Summary:** SPR 7691 - Azul Zulu 17.54.21
> - **Type:** Migration
> - **Assigned:** FO SIPM
> - **Notes:**
>     - **SPR:** 7691
> - **Activity Plans:** FOSI Software Upgrade
- [ ] Wait overnight for SRs to attach to SPR. Confirm that they appear correctly
- [ ] Wait for Ryan W to finish Chef release (beta usually starts the Monday after the CCB is approved and production starts the following Monday, generally ending by Thursday)
	- [ ] Contact Ryan W in two weeks if no news received about release status (set a reminder - press this button and then set the property to remind)
- [ ] Hand off to FOSI on Friday (2 weeks + 1 day after CCB approval) (template “Azul JRE handoff to FOSI” available)
- [ ] Close item on Release Management TFS board

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
