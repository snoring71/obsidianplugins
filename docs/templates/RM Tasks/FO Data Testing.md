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
icon: "icons/subtask_purple"
title: "FO Data Testing"
---
- [ ] Download the new profiles from the FO Master repo (Azure DevOps > Configuration Files > Configuration Management > Repos > Files > FO Data)
- [ ] Backup the server’s current profiles (C:\SPCentral\Profiles)
- [ ] Transfer the new profiles to C:\SPCentral\Profiles
- [ ] Choose two different profiles that include the new changes and go through the Acceptance Criteria outlined in the work item(s)
- [ ] Navigate to the FO Data Repo (Azure DevOps > Configuration Files > Configuration Management > Repos > Files > FO Data) and locate the profiles that are supposed to be affected by the changes. Confirm that each profile has an associated check-in
- [ ] Notify Jeff that testing has passed

---
```notion-button
label: Add subtask
icon: plus
steps:
  - action: add-subtask
    name: Subtask
    template: Templates/RM Tasks/RM Sub-task.md
```
