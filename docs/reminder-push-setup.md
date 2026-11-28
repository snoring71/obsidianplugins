# Phone notifications for reminders (Cloudflare + ntfy)

Obsidian only runs while it's open. To get reminders on your phone when Obsidian is closed, the plugin keeps a list
of upcoming reminders on a small Cloudflare Worker (free). Every minute the worker checks the list and sends anything
that has come due to the **ntfy** app on your phone.

Setup takes about 15 minutes, all in a browser and on your phone. You only do it once.

## 1. Make a topic and a key in Obsidian

1. In Obsidian, open **Settings → Notion-style Kanban** and scroll down to **Phone notifications**.
2. Next to **ntfy topic**, click the circular-arrows icon to make one. Do the same for **Push key**.
3. Leave this page open. You'll copy both values into the next steps with the copy icon.

The topic works like a private channel name. Anyone who knows it can read your pushes, which is why it's long and random.

## 2. Install ntfy on your phone

1. Install **ntfy** from the App Store (or Google Play).
2. Open it, tap **+**, and paste your **ntfy topic**. Leave the server as `ntfy.sh` and tap **Subscribe**.
3. Allow notifications when asked.

Optional: to get pushes on Windows too, open https://ntfy.sh/app in a browser, subscribe to the same topic, and allow
notifications. You don't need this while Obsidian is open, because the plugin already shows a Windows notification.

## 3. Create the worker on Cloudflare

1. Go to https://dash.cloudflare.com and sign up for a free account (or sign in).
2. In the left menu, open **Compute (Workers) → Workers & Pages**. Click **Create**, choose
   **Start with Hello World!**, name it `obsidian-reminders`, and click **Deploy**.
3. Click **Edit code**. Select all of the code on the left, delete it, and paste in the whole of
   [`cloudflare/reminder-push/worker.js`](../cloudflare/reminder-push/worker.js). Click **Deploy**.

## 4. Give the worker somewhere to keep the list

1. In the left menu, open **Storage & Databases → Workers KV** and click **Create** (or **Create instance**).
   Name it `obsidian-reminders` and create it.
2. Go back to **Workers & Pages → obsidian-reminders**, open the **Bindings** tab (in some layouts it's under
   **Settings → Bindings**), and click **Add binding**.
3. Choose **KV namespace**. Set the **Variable name** to `REMINDERS` exactly, pick the `obsidian-reminders`
   namespace, and save.

## 5. Add the topic and the key

Still in the worker, open **Settings → Variables and Secrets** and click **Add** twice:

| Type | Variable name | Value |
| --- | --- | --- |
| Text | `NTFY_TOPIC` | your **ntfy topic** from Obsidian |
| Secret | `TOKEN` | your **Push key** from Obsidian |

Click **Deploy** (or **Save and deploy**).

## 6. Run it every minute

In the worker, open **Settings → Trigger events** (or **Triggers**), click **Add → Cron Triggers**, enter
`* * * * *`, and add it. This makes the worker check for due reminders once a minute.

## 7. Connect Obsidian

1. In the worker, copy its address. It looks like `https://obsidian-reminders.<your-name>.workers.dev`, and it's
   shown under **Settings → Domains & Routes** or at the top of the worker page.
2. Paste it into **Worker URL** in the plugin's settings.
3. Click **Send test push**. A test notification should show up on your phone within a few seconds.
4. Click **Send reminders now**. From then on, the plugin sends the list by itself whenever a reminder is added,
   changed or removed. It also re-sends the list every 6 hours as a safety net.

## Good to know

- **What gets sent:** the note's title and the text of the line the reminder is on. Turn off **Show note titles in
  pushes** if you'd rather send just "Reminder". Tapping a push opens the note in Obsidian. With titles off, it
  opens the vault instead.
- **Cost:** a minute-by-minute check stays well inside Cloudflare's free plan (about 1,440 runs a day; the free plan
  allows 100,000 requests and 1,000 storage writes a day).
- **Late pushes:** if the worker misses a reminder by more than 6 hours, for example because of a Cloudflare
  outage, it skips it rather than sending something stale. The reminder still shows in the Obsidian inbox.
- **Checking on it:** opening `https://<worker>/status` with the push key returns 401 in a browser, which is
  expected. The plugin's **Send reminders now** button shows how many upcoming reminders the worker holds.
- **Changing the key or topic:** make a new one in Obsidian, update the worker's variable to match, and click
  **Send reminders now**.
