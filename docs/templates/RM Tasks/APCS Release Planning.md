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
icon: "icons/pill_red"
title: "APCS Release Planning"
---
> [!note]+ APCS Release Planning Description
> APCS release planning works differently from other releases. It still needs a release planning meeting for each new release but it will not ever have specific candidate sites. Instead, there are two sets of sites, Beta and Main, that will always follow the same process.
> 
> **APCS is SPC build agnostic, so release planning meeting timing does not need to coincide with PMS build releases. Consult with Jeff S on release timing.**
>     Note: For releases that do include changes in the SPC build, we can ignore the timing of the SPC release and conform to the usual APCS schedule.
> 
> Beta starts typically 1-2 weeks after the Alpha release of the SPC build that the APCS builds were tested against. Production is upgraded roughly 1 month later if build passes Beta Performance Review.

> [!note]+ APCS Sites (as of 6/11/2024)
> - **Beta**:
>     - East Alabama Apothecary #00001
>     - Trillium Health Pharmacy #00001
>     - ~~Serve You - Test System~~
>     - ~~UK-Kentucky Clinic Test System (not in use)~~
>     - ~~UK-Specialty (Test System) (not in use)~~
> - **Main**:
>     - Broward Health Medical Center Outpatient
>     - CareSTL Health - Pope Avenue
>     - Community Health Network Specialty Pharmacy
>     - Covenant Healthcare Outpatient Pharmacy
>     - Jackson Pharmacy Solutions
>     - Min-No-Aya-Win Pharmacy
>     - Serve You Rx
>     - St. Catherine Hospital Outpatient Retail Pharmacy
>     - ~~UK-Specialty  (not in use)~~

- [ ] Enter SPR (example 7028) and 
> [!note]+ SPR
> Details/Justification:
> This SPR will be used to track upgrades to APCS R34.
> 
> Account Scope:
> APCS Customers
> 
> Deliverables:
> APCS Webrole 34.1.2 (TFS)
> APCS Service 32.1.9 (Octopus)
> 
> Timeline/Priority:
> Beta:
> R34 Email: 6/12
> R34 Upgrade: 6/17
> Main:
> Beta Performance Review by RM: 6/25
> R34 Email: 6/25
> R34 Upgrade: 6/27
> 
> Risk (Low, Medium, High): - See Internal Knowlege Base answer 1558 for SQL Guidelines and Risk Eval information
> 
> Risk is used to determine what level of SQL review may be necessary for any SPR that involves the creation of data pulls or update statements.
> *Low Risk - single SQL review required (PILs or DBAs)
> *Medium Risk - single or joint (PILs/DBAs) SQL review required based on scope
> *High Risk - requires joint SQL review (PILs/DBAs)
- [ ] Enter TFS item on RM board (example [TFS 381625](https://tfssvr105/Engineering/Dev/_workitems/edit/381625))
> [!note]+ TFS item
> - Details: APCS.Service XX.X.X / [APCS.Web](http://apcs.web/) XX.X.X
> - Acceptance criteria: 
>     Upgrade succeeds.
> No regression failures are observed.

> [!note]+ TFS item tasks
> - Create RP doc
> - Schedule RP meeting
> - Send Kristen email notification contents
> - Send email to Beta customers
> - Deploy to Beta
> - Beta Performance Review
> - Send email to Main customers
> - Deploy to Main/Prod
- [ ] Fill out the release planning document. Refer to the BCM for current deployable version numbers
	- Product Owner: Alison St. Aubyn
	- CS Lead: Erin Pagel, Edgar Cardenas, ~~Katie Prewitt~~
	- The only deployables will be:
		- APCS Webrole
		- APCS Service
	- Compatible SPC Product Lines: PMS
	- Minimum SP Central Release: get this during meeting
- [ ] Upload the document to [Sharepoint](https://scriptpro.sharepoint.com/TFS/Engineering/Dev/Shared%20Documents/Forms/AllItems.aspx?RootFolder=%2FTFS%2FEngineering%2FDev%2FShared%20Documents%2FProduct%20Documentation%2FAPCS&FolderCTID=0x01200098239E3DB0ECAF49AB5F77B046ECBB18&View=%7BC8653F8C-6CF8-4804-B2CD-7F0F3A87E5B3%7D)
- [ ] Schedule release planning meeting
	- Required attendees: Alison St. Aubyn, Faith Brown, ~~Katie Prewitt~~, Kristen Meschede, Jeff Smith
	- Optional attendees: Kayla Chivington, Edgar Cardenas, Chris Fitzmaurice, Jennifer Dujakovich, Erin Pagel, Megan Cunningham
- [ ] Hold release planning meeting. We should come out of this with:
	- Deployable version numbers
	- Minimum SPCentral Release (if any)
	- Updates on any new customers or customers that are no longer part of APCS
	- Dates for Beta email and upgrade (one week between these two events)
	- Dates for Beta performance review by RM, Main email (+1 day) and upgrade (one week later)
	- Any other unique Due Outs for the release]
- [ ] Send post-meeting email to group with link to release planning document, due outs, and dates for beta and main release
- [ ] Email Kristen Meschede with the following info (she already has a set APCS format we can reuse):
	- Release notes to include in customer email along
	- Dates for notification email and upgrade for beta sites
	- List of beta sites (list below but may be able to get up-to-date list from Octo). Do not include any test or not-in-use sites
> [!note]+ Example of email sent to Kristen
> Hi Kristen,
> 
> RM would like to send APCS R34 upgrade notification emails to our Main customers. The format can be the same as the beta APCS R34 emails sent earlier this month. The upgrade is scheduled for this Thursday, 6/27 so there is some time sensitivity here. These are the release notes we’d like to include:
> 
> | APCS Service (SIR 106128) | An issue that caused the APCS service to not be accessible after being unused for a specified amount of time has been resolved. |
> | --- | --- |
> | Patient Classification Task Filter<br> (SIR 107591) | An issue has been resolved that resulted in tasks not displaying correctly in the Task List when Patient Classification filters were applied after changes at the patient level to remove and/or re-add classifications. |
> 
> And this is the list of customers:
> 
> - Broward Health Medical Center Outpatient
> - CareSTL Health - Pope Avenue
> - Community Health Network Specialty Pharmacy
> - Covenant Healthcare Outpatient Pharmacy
> - Jackson Pharmacy Solutions
> - Min-No-Aya-Win Pharmacy
> - [Serve You Rx](https://octoweb1x.spcupdate.com:8443/app#/Spaces-1/tenants/Tenants-8123)
> - [St. Catherine Hospital Outpatient Retail Pharmacy](https://octoweb1x.spcupdate.com:8443/app#/Spaces-1/tenants/Tenants-1496)
> 
> Please let me know if you have any questions.
> 
> Thank you,
- [ ] Update SPR with info from RP meeting (in Detail section and add a comment)
- [ ] (Probably) RM enters SRs for beta sites (I was not able to find evidence that any SRs were entered for APCS R34)
- [ ] Jeff pushes out the new webrole and all of the beta sites get it that evening
- [ ] Jeff then pushes the new service release to the beta sites via Octopus on the same evening. From Jeff on me helping with APCS upgrades:
> If we had solid documentation I would be happy to hand it off, but that is unfortunately not the case.  We've been told APCS is now in maintenance mode so I don't envision frequent upgrades.  If that changes, I will likely work on documenting the process.
- [ ] On the day of APCS performance review, check each beta site’s SR in Siebel to see if there is anything APCS related (keywords APCS, patient enrollment, clinical protocol, etc)
- [ ] Email Faith and Jeff with the results of the review and ask if they are ready to proceed to production release
> [!note]+ Example email
> Hi Faith/Jeff,
> 
> I’ve reviewed the two sites that the APCS R34 beta already went to (East Alabama #00001 and Trillium #00001) and found that no APCS related issues have been called in. Are you both okay with proceeding to production release for R34? If so, I’ll ask Kristen to send customer communication to the following sites tomorrow (minus UK Specialty) notifying them of release on 6/27.
> 
> - Broward Health Medical Center Outpatient
> - CareSTL Health - Pope Avenue
> - Community Health Network Specialty Pharmacy
> - Covenant Healthcare Outpatient Pharmacy
> - Jackson Pharmacy Solutions
> - Min-No-Aya-Win Pharmacy
> - [Serve You Rx](https://octoweb1x.spcupdate.com:8443/app#/Spaces-1/tenants/Tenants-8123)
> - [St. Catherine Hospital Outpatient Retail Pharmacy](https://octoweb1x.spcupdate.com:8443/app#/Spaces-1/tenants/Tenants-1496)
> - [~~UK-Specialty~~](https://octoweb1x.spcupdate.com:8443/app#/Spaces-1/tenants/Tenants-1605)~~ (not in use)~~
> 
> Thanks
- [ ] Email Kristen Meschede with the following info:
	- Release notes to include in customer email along
	- Dates for notification email and upgrade for main (production) sites
	- List of main sites (list below but may be able to get up-to-date list from Octo). Do not include any test or not-in-use sites
- [ ] (Probably) RM enters SRs for Main sites (I was not able to find evidence that any SRs were entered for APCS R34)
- [ ] Jeff pushes out the new webrole and all of the Main sites get it that evening
- [ ] Jeff then pushes the new service release to the Main sites via Octopus on the same evening.
