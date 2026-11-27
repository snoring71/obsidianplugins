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
icon: "icons/apple_lightgray"
title: "New iOS release review/testing"
---
Evaluate testing needs for the release (beta/RC/general):

> [!note]+ No changes likely to affect SP apps and no major version change
> - [ ] Create a new research item on the Release Management board
> > [!note]+ Details
> > - **Title:** iOS/iPadOS ******* general release
> > - **Details:**
> >     The general release build of iOS/iPadOS ******* is now available. Initial review indicates no changes that would impact our app functionality - I recommend proceeding without dedicated testing for this release.
> >     Release Notes: *******
> >     ~
> > - **Findings:** Initial review indicates no changes that would impact our app functionality - I recommend proceeding without dedicated testing for this release.
> > - **Acceptance Criteria:** Enter findings
> - [ ] Set the research item’s parent to TFS 378037
> - [ ] Set the item’s status to Closed
> - [ ] Use email template *iOS release notification - no testing required* to notify Erin V, Jason H, Jeff S, and Lindsey M of the release
> - [ ] **If this is a general release build: **email Will Jennings using “iOS general release - HW SW Minimums” template. CC Lindsey M, Wendy W, and Kristen M

> [!note]+ Changes likely to affect SP apps or major version change
> - [ ] Create a new research item on the ****TBD**** board
> > [!note]+ Details
> > - **Title: **Test RefillPro and PharmacyPro on iOS/iPadOS **********
> > - **Details:**
> >     Update all iOS devices to ******** **and run:
> >     - PharmacyPro build test
> >     - RefillPro build test
> >     Release Notes: **********
> > - **Acceptance Criteria:** Enter findings
> - [ ] Set the research item’s parent to TFS 378037
> - [ ] “Follow” the item
> - [ ] Place the item in the current sprint **(where? TBD)**
> - [ ] Use email template *iOS release notification *to email Erin V and Jason H with a link to the new research item and release notes summary. CC Jeff S and Lindsey M
> 
> **If this is a general release build:**
> 
> - [ ] Wait for testing to finish
> - [ ] If testing passes, email Will Jennings using “iOS general release - HW SW Minimums” template. CC Lindsey M, Wendy W, and Kristen M

---

### From Apple Device Management document:

- When a new public beta, release candidate, or general release iOS version is made available, Release Management (RM) creates a research item to track the release. RM then reviews the release notes and determines whether there are any changes that are likely to affect PharmacyPro/RefillPro.
	- If yes, **TBD** runs the App Barcode Scanning Sanity test suite on one iPhone and one iPad.
	- If no, RM approves the release and closes the research item with no testing
	- Exception: Releases that update the major version (ex. 17.6 → 18.0) will always be tested
	- Note: The integration team will run a full build test on designated devices as part of PMS testing

---
```notion-button
label: Add subtask
icon: plus
steps:
  - action: add-subtask
    name: Subtask
    template: Templates/RM Tasks/RM Sub-task.md
```
