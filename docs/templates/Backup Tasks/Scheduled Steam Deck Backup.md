---
Status: Not started
Task type:
  - Scheduled Manual Backup
Assignee: []
Tags: []
icon: "icons/calendar_green"
title: "Scheduled Steam Deck Backup {{today:YYYY-MM-DD}}"
---
- [ ] Navigate to */home/SteamDeckBackupScript*
- [ ] Right-click (L2) steamdeckbackupscript.sh and select Run in Konsole
- [ ] Wait for the process to finish (a success message will be printed to the log for each archive that is created successfully
- [ ] Navigate to */run/media/deck/SD128/Backups/Config Backups *and confirm that a new archive with today’s date and a normal file size has been created
	- [ ] If there are too many old backups here, delete the oldest one(s) now
- [ ] Navigate to */run/media/deck/SD128/Backups/Emudeck Backups *and confirm that a new archive with today’s date and a normal file size has been created
	- [ ] If there are too many old backups here, delete the oldest one(s) now
- [ ] Mark this task as Done
```notion-button
label: Mark as Done and update Last Backup Date
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
      - property: file.name
        op: contains
        value: SD Card
      - property: Parent item
        op: contains
        value: Steam Deck
    changes:
      - property: Last Backup Date
        mode: set
        value: '{{now:YYYY-MM-DDTHH:mm}}'
```

---

> [!note] 📌
> Complete monthly Steam Deck backup  [Zach Angelacos](mailto:zangelacos@gmail.com)  

> [!note]+ Manual backup steps
> - [ ] Back up Emulation folder to SD card
>     1. Navigate to /home/deck/Emulation and highlight all folders except for ROMs
>     2. Right-click a highlighted folder and select Compress > Compress to…
>     3. Set the folder to */run/media/deck/SD128/Backups/Emudeck Backups*
>     4. Set the filename to to today’s date with no extension (ex. 03.02.2026)
>     5. Select OK
> - [ ] Back up .config folder to SD card
>     1. Right-click /home/deck/.config and select Compress > Compress to…
>     2. Set the folder to */run/media/deck/SD128/Backups/Config Backups*
>     3. Set the filename to to today’s date with no extension (ex. 03.02.2026)
>     4. Select OK
