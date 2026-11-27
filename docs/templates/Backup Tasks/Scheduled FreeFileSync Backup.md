---
Status: Not started
Task type:
  - Scheduled Manual Backup
Assignee: []
Tags: []
icon: "icons/calendar_green"
title: "Scheduled FreeFileSync Backup {{today:YYYY-MM-DD}}"
---
- [ ] Create a new Notion backup:
	1. Settings > General > Workspace content > Export
		- Export format: Markdown & CSV
		- Include databases: Default View
		- Include content: Everything
		- Create folders for subpages: On
	2. Wait for the export to complete, then download the zip file from the message in the Notion app’s Inbox
	3. Rename the zip file with the following format: “NotionExportMM.DD.YYYY”
	4. Move the zip file to C:\Users\skyha\Downloads\Notion Exports
- [ ] Create new Custom Element Hider backup in the ~Downloads\customelementhiderexport folder (Custom Element Hider > make sure “Export subfolder” is set to “customelementhiderexport”, then select Export)
- [ ] Create new manual **Auto Highlight** backup, leaving file in the default location (Auto Highlight > Settings > Import / Export > EXPORT BACKUP (leave in default folder))
- [ ] Create new **FxSound** presets backup (FxSound > hamburger menu > Export Presets > (highlight all desired presets) > Export > leave in default folder)
- [ ] Create new **Fan Control** backup and copy to backup folder (Fan Control > Menu > Save Configuration As > copy newly created file to *C:\Users\skyha\Documents\Fan Control Configuration backup*)
- [ ] Create new Playnite library backup (Playnite > menu > Library > Backup library data > *C:\Users\skyha\Documents\Playnite Library Backups* > set name to today’s date > Select all backup options > Select)
- [ ] Create new Bitwarden backup (Bitwarden extension icon > Settings tab  > Vault options > Export > Select .json (Encrypted) > Select Account restricted > Export)
- [ ] Create new BookWatcher backup (BookWatcher application > Backup > set Backup folder to *D:\BookWatcher database backups* and select Export backup)
- [ ] Create new NeoJPDict backup (NeoJPDict application > Settings > Backup > set backup folder to *D:\NeoJPDict backups*)
- [ ] Organize files in D:\Movies into neat folders
- [ ] Organize files in D:\JAV into neat folders
- [ ] Plug *WD My Passport* drive into PC
- [ ] Open FreeFileSync and select the MainBackupJob configuration
- [ ] Select the Compare button in the top left and check what the sync job will do, paying special attention to any deletions (two trash can icons on either side)
- [ ] Select the “Synchronize” button in the top right and allow sync job to finish
- [ ] Mark this task as Done
```notion-button
label: Mark as Done and update Last Backup Dates
icon: check-circle
steps:
  - action: edit-properties
    changes:
      - property: Status
        mode: set
        value: Done
      - property: Date Completed
        mode: set
        value: '{{now:YYYY-MM-DDTHH:mm}}'
  - action: edit-matching
    base: Backup Strategy.base
    where:
      - property: Details
        op: contains
        value: FreeFileSync
      - property: Backup Status
        op: is
        value: Done (Manual)
    changes:
      - property: Last Backup Date
        mode: set
        value: '{{now:YYYY-MM-DDTHH:mm}}'
```


---

> [!note] 📌
> Complete monthly FreeFileSync backup  [Zach Angelacos](mailto:zangelacos@gmail.com)
