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
icon: "icons/location_green"
title: "SPCentral WS Alpha/Beta Release"
---
- [ ] Software Release Coordinator (SRC) creates work item on Release Management board with associated tasks – [How to](https://tfssvr105/Engineering/Dev/_wiki/wikis/Dev.wiki?wikiVersion=GBwikiMaster&pagePath=%2FTeams%2FRelease%20Management%2FSPCentral%20Upgrade%20Process%20for%20FO%20RM%20Alpha%20Customers%2FHow%20to%20Create%20work%20item%20on%20RM%20board%20with%20associated%20tasks)
	- [ ] Deploy to AUAPP1X
	- [ ] Update BCM
	- [ ] Send release email
- [ ] If upgrade requires FOSI assistance, SRC works with FOSI to find a date that works for them
- [ ] SRC works with the site contact(s) to ensure proposed date works for the site. Provides published release notes to site for review/awareness.
- [ ] SRC works with FOCM Testing Manager to identify who will provide site support. Communication regarding site location, release notes for review and expected arrival time on site, will be provided to selected individual by SRC.**Note: Site support is always required for FO Alpha customers (exceptions require Software Release Manager’s approval)**Sites requiring to be notified of the ScriptPro personnel that will serve as site support following an upgrade are sent an email with the following message"*Our support staff will be onsite ****(day of week)**** morning for a period of at least two hours. Before leaving, our representative will notify personnel within the pharmacy of their intended departure. Should there be additional concerns at that point, please share these with our representative and a request for additional time onsite can be made to ScriptPro management.*"
- [ ] SRC creates new SPR to track release - [How to](https://tfssvr105/Engineering/Dev/_wiki/wikis/Dev.wiki?wikiVersion=GBwikiMaster&pagePath=%2FTeams%2FRelease%20Management%2FSPCentral%20Upgrade%20Process%20for%20FO%20RM%20Alpha%20Customers%2FSPR%20to%20Track%20Release) (post-update check template in C:\Users\zangelacos\Documents\Release Management\SPCentral Releases\WS 2024 R7\Post-upgrade check steps)
- [ ] SRC creates SR in Siebel for FOSI upgrade task and/or CS to perform check in the morning after upgrade.
- [ ] SRC sends email to CS PSS ATL designee (currently Kristyn Gordon PMS, Shelly Alejos WS) - [Example](https://tfssvr105/Engineering/Dev/_wiki/wikis/Dev.wiki?wikiVersion=GBwikiMaster&pagePath=%2FTeams%2FRelease%20Management%2FSPCentral%20Upgrade%20Process%20for%20FO%20RM%20Alpha%20Customers%2FExample%20Email%20to%20CS%20PSS%20ATL%20designee)
- [ ] SRC creates post upgrade check in steps document and attaches to SPR - [Document](https://tfssvr105/Engineering/Dev/_wiki/wikis/Dev.wiki?wikiVersion=GBwikiMaster&pagePath=%2FTeams%2FRelease%20Management%2FPost%252DInstall%20Product%20Functionality%20Verification%2FSPCentral%20PMS%20Post%252DInstall%20Verification%20Steps) Note: Examples can be found here: U:\FIELD_OPERATIONS\CONFIGURATION_MANAGEMENT\Release Management\SPR Attachments\Upgrade check in docs
- [ ] FO RM updates associated SPR with the following in the Project Notes field: **Approved SPC v <version number> for Alpha release on <date>**
- [ ] SRC publishes build to production AU server - [Software Build Addition Procedure](https://tfssvr105/Engineering/Dev/_wiki/wikis/Dev.wiki?wikiVersion=GBwikiMaster&pagePath=%2FTeams%2FRelease%20Management%2FSPCentral%20Upgrade%20Process%20for%20FO%20RM%20Alpha%20Customers%2FPublish%20new%20build%20to%20AUAPP1X)
- [ ] If applicable, SRC emails Product Documentation Lead to request the link to the Customer Release Notes document be emailed out.
- [ ] **Note: Do not perform the following step until the day/night of the site(s) upgrade. Live Update Manager does not support scheduling an upgrade for a later date**Within Live Update Manager application on [auapp1x.spcupdate.com](http://auapp1x.spcupdate.com/) , SRC searches for site(s) that will be upgraded and updates Group field with build the site(s) should be upgraded to.
- [ ] Excluding webrole projects, push new Octopus versions to the .com (and .mil, if appropriate) servers
- [ ] Within BCM for the associated release, Release Manager records (you will need this info in subsequent step) component name and versions from Test column. Next, move values in Test column to Beta column. Move worksheet to the right so it is positioned after the ‘Approved Releases’ worksheet. Save changes and check in doc.
- [ ] Release Manager sends official release email to Software Release Group - [Example](https://tfssvr105/Engineering/Dev/_wiki/wikis/Dev.wiki?wikiVersion=GBwikiMaster&pagePath=%2FTeams%2FRelease%20Management%2FSPCentral%20Upgrade%20Process%20for%20FO%20RM%20Alpha%20Customers%2FExample%20of%20Software%20Release%20Group%20Update)**Note: List recorded components and version numbers in the email**
- [ ] SRC creates work items for all new versions of products/components that were included in the release
- [ ] SRC updates Passed In field in Track for the SIRs included in release with the build number that was released.
