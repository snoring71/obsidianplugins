# Dates, reminders, the @ menu and link search

Added in 0.18.0.

## The @ menu

Type `@` after a space or at the start of a line, in a note or in a comment box. One menu offers:

- **Dates.** For example `@today`, `@now`, `@tomorrow 9:00am`, `@11/12/2027`, `@dec 3`,
  `@next wednesday`, `@4 weeks`, `@in 2 days` or `@3pm`. Typing part of a word works too: `@tom`.
- **Reminders.** Every date also comes with a "Remind" row. Starting with `remind` lists the reminder first:
  `@remind tomorrow 9am`.
- **Links to pages.** Choosing one inserts a normal `[[link|Title]]`, just like `[[`.

If the text reads as a date, dates come first. Otherwise pages come first.

## How dates are stored

Dates are plain text, so they still read fine without the plugin:

| Text | Meaning |
| --- | --- |
| `@{2026-12-03}` | a date |
| `@{2026-12-03 09:00}` | a date and time (24-hour, local time) |
| `@{2026-12-03 09:00 ⏰}` | reminder at that time |
| `@{2026-12-03 09:00 ⏰ 1h}` | reminder 1 hour before (`5m`, `10m`, `15m`, `30m`, `1h`, `2h`, `1d`, `2d`) |
| `@{2026-12-03 ⏰}` | date-only reminder: 9:00 AM that day |
| `@{2026-12-03 ⏰ 1d}` | date-only reminder: 9:00 AM the day before (`1d`, `2d`, `1w`) |

In Live Preview and Reading view the plugin shows each one as a chip, such as "@Tomorrow 9:00 AM". Reminders are
blue with a clock, and turn red once they've passed. Click a chip to open the date editor, which has a calendar,
a time, "Include time", "Remind" and "Remove".

The command **Convert imported Notion dates to @ dates** turns dates the Notion importer wrote as plain text
(`  2025-11-20T12:00:00.000-06:00  `) into chips. It counts them and asks before changing anything.

## Reminders

- The plugin keeps a list of every `⏰` date in the vault, plus the date properties listed under Settings →
  "Reminder properties" (default: `Reminder Date`).
- While Obsidian is open, it checks every 20 seconds. When a reminder is due, it shows a notice and a system
  notification on desktop, and adds the reminder to the **Inbox**.
- Reminders that came due while Obsidian was closed go to the inbox the next time it opens. The plugin first waits
  for sync, using the same delay as repeating templates (15 seconds by default).
- Reminders that were already due before 0.18.0 was installed are skipped (`remindersSince` in data.json).

## Phone notifications

To get reminders on your phone while Obsidian is closed, set up the Cloudflare worker and the ntfy app. See [reminder-push-setup.md](reminder-push-setup.md). The plugin sends the worker its upcoming reminders whenever they change.

## Inbox

Open it from the inbox icon in the ribbon, which shows the unread count, or with the command "Open inbox".
It has two tabs:

- **Inbox:** reminders that came due. Filter by "Unread & read", "Unread" or "Read". Click the dot to mark one
  read or unread, or the double check to mark all as read. Clicking a reminder opens the note at that line.
- **Upcoming:** reminders still to come, grouped by day.

Inbox items live in `data.json` under `inbox`. When sync brings in another device's copy, the two are merged.

## Smarter link suggestions

The `[[` menu (in notes and in comments) and the @ menu use the same search:

- Words can be in any order: "defender release planning" finds "Release Planning - Defender Antivirus".
- Matches are ranked by how well they match (exact title, then starts with, then contains the phrase, then
  every word starts a word in the title, then every word appears anywhere, then the folder path). Equal matches
  are sorted newest first, by the note's `Date`, `Created`, `Created time`, `Due date` or `Last edited time`
  property, or else by file date.
- If nothing matches word for word, it falls back to fuzzy matching, so typos still find something.
- It steps aside for headings (`#`), blocks (`^`), aliases (`|`) and embeds (`![[`), which Obsidian's own menu handles.
- To go back to Obsidian's own `[[` menu, turn off Settings → "Smarter [[ link suggestions".
