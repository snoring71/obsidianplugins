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
To-do List: true
Blocked Reason: ""
Team: Release Management
Sub-task: []
icon: "icons/pill_green"
title: "PMPClassic Release"
---
## Details

<initial information received from PO>

## To-do

- [ ] Receive information from Working Dead. This should include:
	- Changes in release include:
	- PMP Report updates for the following states:
	- ~~Account Scope:~~ (RM gathers the list of accounts)
	- Deliverables:
	- Compliance Date:
- [ ] Begin entering a new SPR
- [ ] Fill out the required fields:
	- **Purpose: **PMPClassic - Production x.x.x Release (<state abbreviations>)
		- Ex. (PMPClassic - Production 2.3.26.0 Release (OH, NV, UT, ID)
	- **Product: **PMS
	- **Assigned: **JGALBRAITH
	- **PM Owner: **FOCM Project
	- **Funct Area: **Reports
	- **Release Tool:** Octopus
- [ ] Fill out the Details section:
	- **Changes in release include:**
	- **PMP Report updates for the following states:**
	- **Account Scope:**
	- **Deliverables:**
	- **Compliance Date:**
	- **Release Date: **<the date RM schedules the updates for>
> [!note]+ Example (SPR 9279)
> - **Changes in release include:**
>     - 385965 108630: Idaho Regulatory (PMP Report Format, ASAP 4.2A)
>     - 346490 109455: Utah Regulatory (PMP Report Format, ASAP 5.0) Eff: 6/30/2026
>     - 434624 110238 Nevada Regulatory (PMP Report Format, ASAP 5.0) Eff: 7/1/2026
>     - 434626 109316 Ohio Regulatory (PMP Report Format, ASAP 5.0) Eff: 7/1/2026
> - **PMP Report updates for the following states:**
>     - Idaho, Utah, Nevada, Ohio
> - **Account Scope:**
>     - DCI Pharmacy Services (Nashville)
>     - Physicians Preference Pharmacy
>     - Kentucky Clinic Pharmacy
>     - Chandler Retail Pharmacy
>     - Mohegan Pharmacy
>     - PraxisRx DBA Brand Direct Health
>     - University Hospitals of Cleveland-Specialty
>     - University Hospitals of Cleveland-Rainbow Center for Women & Children
>     - University Hospitals of Cleveland-Central Fill
>     - UH Portage Medical Center
>     - UH Geauga Medical Center
>     - UK-Specialty Pharmacy
>     - University Hospitals of Cleveland-Elyria
> - **Deliverables:** PMPClassic - Production 2.3.26.0
> - **Compliance Date:** 6/30/2026
> - **Release Date:** 6/29/2026
- [ ] Get the list of accounts
	1. Navigate to http://intranet.scriptpro.com/asp/fop/ReportUsage/Search.asp
	2. Set PMP Region to the first state’s abbreviation (ex. KS)
	3. Check the box for “Include site name in results”
	4. Set “Records per results list” to 100
	5. Select the Search button to get results
	6. Highlight the table of results and copy it
	7. Open a new Excel sheet and format all cells as Text
	8. Paste the copied table into Excel using Ctrl+Shift+V to get rid of formatting
	9. Select Data > Filter and filter out any rows that do not start with 999 in the SP ID column (anything that does not start with 999 is old and shouldn’t be used)
	10. Copy the resulting “Site Name” rows and paste them into the Account Scope area in the SPR
	11. Repeat Steps 2-10 for any remaining states
	12. Referring to the PMP Update Exclusions spreadsheet, remove any non-applicable sites from the list
- [ ] Send an email notification of the release (template available: *PMP release notification.oft*)
	- **To: **Josh Galbraith
	- **Cc: **ScriptPro PMP Release
	- **Subject:**
		- PMPClassic - Production x.x.x Release (<state abbreviations>)
	- **Body:**
> Josh, PMPClassic - Production x.x.x is ready for release to impacted customers via SPR XXXX.

**Scope includes:**
> - User Story <TFS ID> <TFS item title with report format and effective date>
> - User Story <TFS ID> <TFS item title with report format and effective date>
> - …
> 
> **Impacted customers:**
> 
> - Customer 1
> - Customer 2
> - …
> 
> Please update impacted customers at your earliest convenience - preferably tonight or tomorrow, if possible. Let me know if you have any questions or concerns.
> 
> Thanks,
> 
> Zach

---

***Note: ****This process is for a typical release where no networking changes are needed (no Clearing House / URL changes).*

**Sources:**

- [[PMP Release Planning 09-09-2026|PMP Release Planning 09/09/2026]] 
- Email sent by Sean D with subject “RE: PMP Release Planning” received  2026-09-09T16:11:00.000-05:00
