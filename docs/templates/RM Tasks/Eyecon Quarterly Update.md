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
Status: Not started
To-do List: false
Blocked Reason: ""
Team: Release Management
Sub-task: []
icon: "icons/view_blue"
title: "Eyecon Quarterly Update"
---
- [ ] Check [FTP](https://ftp.scriptpro.com/) on first day of the quarter. Usually files are there by the 10th or 11th. If the files are not present by the 10th day of the quarter, email Dave Yanez (dyanez@awtx-itw.com) and CC: Dave Lang (dlang@awtx-itw.com) to request the files get uploaded as soon as possible. Also CC the ScriptPro Software Release Management DL (email template available: “Eyecon request for quarterly update files”)
	- [ ] Obtain files
- [ ] Search for part #50549 in Track. Click on Attachments and open the Working folder. Move the existing .eyecon2 and .eyecon3 files from the Working folder to the Archive folder and copy the latest .eyecon2 and .eyecon3 files to the Working folder
	- [ ] Add a timestamped Note with new file notification and expiration dates of current release (these can be retrieved by Bomgaring into an Eyecon device (devices will have “Eyecon” in the Bomgar host name) and going to Settings > General > About Eyecon)
- [ ] Consider posting news of the update in the “Production process for Eyecon post OPV update” Teams chat. This will prompt Michael Wheatley and Tony Reed to update their test Eyecons. I can then wait to send word out to the wider group that we have a valid update file
- [ ] Send email to the Eyecon Update DL (eyeconupdates@scriptpro.com) informing members that a new Eyecon file has been placed in Track. Include the current Medispan Expiration Date and the Data Removal Date (email template available: “Eyecon quarterly update”) Ex: [[Eyecon new files notification email example]] 
- [ ] After receiving above email, Electric Mayhem completes creation of work items, new MSI, new Octopus release, new DVD versions, testing of Octopus and DVD deployment
	```notion-button
	label: Add "Waiting on dev work" tag
	icon: tag
	steps:
	  - action: edit-properties
	    changes:
	      - property: Tag
	        mode: add
	        value: Waiting on dev work
	```
	```notion-button
	label: Remove "Waiting on dev work" tag
	icon: x
	steps:
	  - action: edit-properties
	    changes:
	      - property: Tag
	        mode: remove
	        value: Waiting on dev work
	```
- [ ] Release Management creates the following tasks attached to the item on the Release Management board:
	- [ ] Upgrade .local systems, Enter CCB, Deploy to Octo1x and 2x, Update BCM, Update Spalitto’s, Call Spalitto’s to confirm update applies successfully, Create SPR, Update SPR and email FOSI to transition SPR to FOSI
- [ ] Release Management approves the new release of EyeconUpdate.Delivery for .local (**Note: this is a “classic” release, not a delivery pipeline**)
- [ ] Release Management creates a new user story on the Michael Bolton board to request/track functional testing (example [TFS 387654](https://tfssvr105/Engineering/Dev/_workitems/edit/387654))
- [ ] Release Management deploys new version (ScriptPro Eyecon Update Delivery project) to integration test system via Octopus and notifies Megan Ward that it has succeeded. **Note**: It will take about 4-5 hours to finish transferring files once the deployment is complete.
	- Michael Bolton Eyecons as of 8/11/2026:
		- FO-INT-CB-1V / FO-INT-CB-DP1 (WMS 2.0)
		- FO-INT-PMS-1V / FO-INT1V-DP2 (PMS)
		- FO-BEEF-WS2V / FO-BEEF2-DPS1 (WMS 1.0) (no Bomgar on client)
- [ ] Immediately after the deployment finishes, check the EyeconUpdate.Sender.Host-Log.txt file and confirm that it is sending the correct file - it will look like this: “SendFile: filename = C:\SPCentral\EyeconUpdate\dat\2025_04_01_x64_**FULL**_1_1_18_0.Update.**Eyecon3**”
- [ ] Functional testing is performed by Michael Bolton. Once testing has passed, an email is sent to the Eyecon Update DL
	```notion-button
	label: Add "Waiting on testing" tag
	icon: tag
	steps:
	  - action: edit-properties
	    changes:
	      - property: Tag
	        mode: add
	        value: Waiting on testing
	```
	```notion-button
	label: Remove "Waiting on testing" tag
	icon: x
	steps:
	  - action: edit-properties
	    changes:
	      - property: Tag
	        mode: remove
	        value: Waiting on testing
	```
- [ ] Release Management creates CCB entry before weekly Thursday 1PM meeting ([example CCB 1493 / 1453](https://scriptpro.sharepoint.com/sites/ia/Lists/CCB%20Topic/AllItems.aspx?OR=Teams-HL&CT=1713383274806&clickparams=eyJBcHBOYW1lIjoiVGVhbXMtRGVza3RvcCIsIkFwcFZlcnNpb24iOiI0OS8yNDAzMTQxNDcxOCIsIkhhc0ZlZGVyYXRlZFVzZXIiOmZhbHNlfQ%3D%3D))
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
- [ ] Once CCB is approved, push release to .COM and .MIL
- [ ] Create SPR (example 6922/7149)
	- [ ] The SPR’s Detail section should include the following dates:
		- Beta release start date – the date that the deployment to the beta customer begins
		- Beta release completion date – the date on which the manual update process has been successfully completed with the beta customer
		- General release start date – the earliest date at which general release can begin once SRs have been entered (ASAP)
		- General release completion date – one week before the drug data removal date
		- Release of customer communication – one day after the general release completion date
- [ ] Deploy new Octopus release to Spalitto’s
- [ ] Once deployment and transfer complete (this takes about 3-5 hours once the Octopus deployment is complete), dial into the client the Eyecon is connected to (Spalitto’s STATION-1) and check the EyeconUpdate.Sender.Host-Log.txt for “INFO ScriptPro.EyeconUpdate.Sender.EyeconUpdateSender - FileExchange: file write complete” (If the logs still show the file is reading, wait until completion can be confirmed)
- [ ] Contact Spalitto’s to request that they perform the update process on their Eyecon device (Go to Settings>Auto Updater and select the Update Now button). Usually Reagan answers and Jeff typically asks if now is a good time or would she like him to call back later
- [ ] Update BCM with new ScriptPro Eyecon Update Delivery version
- [ ] Mass create SRs ([[Notion/Reference Library/Siebel/Mass SR Entry]]) for general release. To get list of sites and Siebel RowIDs, use the “Eyecon Quarterly Update.sql” query saved locally (Note: For better completeness, this now gets sites with the “Eyecon Update Sender” project instead of “Eyecon Update Delivery”)
	- [ ] Remove the following sites from the list:
		- Joplin CBOC (this site does not have an Eyecon device as of 5/8/2026)
		- VA Bakersfield CBOC (no longer a customer of SP)
- [ ] Update SPR with latest details and set PM Owner to FOSI Project
- [ ] Wait one day for SRs to link and for good measure, then email FOSI to transition SPR to FOSI
	- Email should be sent to John Stockemer, Zach Ozbun, and Ryan Humston, CC Jeff Smith, Faith Brown, and Jeremy Hundertmark (email template available: “Eyecon quarterly update handoff to FOSI”)
> [!note]+ Example email from previous release that I sent
> Hi all,
> 
> FO RM is now ready to hand off SPR 7404 for the deployment of the 2024 Q4 Eyecon update to Migrations. SRs have been created, assigned to FOSIPM, and linked to the SR. Please note the **General Release completion date of 11/6**.
> 
> Thank you,

> [!note]+ Example email from previous release
> I wanted to follow up with you all regarding some important / time sensitive work that FO RM is ready to have transitioned over to FOSI.
> 
> 1. Beta for the Q3 2024 Eyecon Update Delivery has passed and is ready for Migrations to proceed with General Release. SRs have been created, assigned to FOSIPM and linked to SPR 7149. Note, the General Release completion date of 8/7.
- [ ] FO System Migrations deploys new release to all remaining sites once Octopus Beta phase (Spalitto’s) has passed
- [ ] Once FO System Migrations has completed deployment to all customers, they inform Kristen M that she can now send customer communication about the update

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

### Other Notes:

- For the 2025 Q1 update, which had numerous issues and had to be beta tested at multiple sites, we first took it to Spalitto’s, then Ponca Health Services-Lincoln, then Manchester VAMC. Dallas VAMC was suggested as a possible beta site as well but we did not beta it there.
	- I spoke to Brittney Nemitz (bnemtiz@PoncaTribe-ne.Gov) at Ponca and Dan Martell at Manchester VAMC (both very easy to work with)

### References:

- [Eyecon Developed_ScriptPro Deployed Software Lifecycle Process.docx (sharepoint.com)](https://scriptpro.sharepoint.com/:w:/r/TFS/Engineering/Dev/_layouts/15/Doc.aspx?sourcedoc=%7B0df0c019-fe7c-46ba-9bc1-ac1f0837b187%7D&action=view&wdAccPdf=0&wdparaid=4C711586)
- [Eyecon Update Delivery - Post Update Verification and Apply - Overview](https://tfssvr105/Engineering/Dev/_wiki/wikis/Dev.wiki/71/Eyecon-Update-Delivery-Post-Update-Verification-and-Apply)
- [Eyecon Software Upgrade Process.docx (sharepoint.com)](https://scriptpro.sharepoint.com/:w:/r/sites/customercare/CustomerService/am/_layouts/15/Doc.aspx?sourcedoc=%7B4815a82a-9cdc-468d-b29a-a2f88b107981%7D&action=view&wdAccPdf=0&wdparaid=40A4DC36)

> [!note] 📌
> Eyecon Quarterly Update  [Zach Angelacos](mailto:zangelacos@gmail.com)
