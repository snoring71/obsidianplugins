// Reminder push for the Notion-style Kanban Obsidian plugin.
//
// The plugin sends its list of upcoming reminders here whenever it changes (POST /sync).
// A cron trigger runs this every minute and sends each reminder that has come due to
// your phone through ntfy (https://ntfy.sh), even when Obsidian is closed everywhere.
//
// Setup (Cloudflare dashboard): see docs/reminder-push-setup.md in the plugin repo.
//   Binding:  REMINDERS   KV namespace
//   Secret:   TOKEN       the "Push key" shown in the plugin's settings
//   Variable: NTFY_TOPIC  the ntfy topic shown in the plugin's settings
//   Optional: NTFY_SERVER (default https://ntfy.sh), NTFY_AUTH (ntfy access token, if your topic is protected)
//   Cron trigger: * * * * *

const LIST_KEY = "reminders";
const SENT_KEY = "sent";
const LATE_LIMIT_MS = 6 * 60 * 60 * 1000; // don't push a reminder more than 6 hours late
const MAX_ITEMS = 1000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function authorized(request, env) {
  const h = request.headers.get("authorization") || "";
  return !!env.TOKEN && h === "Bearer " + env.TOKEN;
}

async function readJson(env, key, fallback) {
  const v = await env.REMINDERS.get(key, "json");
  return v === null ? fallback : v;
}

function clean(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && typeof r.id === "string" && Number.isFinite(r.fireAt))
    .slice(0, MAX_ITEMS)
    .map((r) => ({
      id: r.id.slice(0, 400),
      fireAt: r.fireAt,
      title: String(r.title || "Reminder").slice(0, 200),
      text: String(r.text || "").slice(0, 500),
      click: typeof r.click === "string" && r.click.startsWith("obsidian://") ? r.click.slice(0, 1000) : "",
    }));
}

async function push(env, r) {
  const server = (env.NTFY_SERVER || "https://ntfy.sh").replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json" };
  if (env.NTFY_AUTH) headers.Authorization = "Bearer " + env.NTFY_AUTH;
  const body = {
    topic: env.NTFY_TOPIC,
    title: r.title,
    message: r.text || "Reminder",
    tags: ["alarm_clock"],
    priority: 4,
  };
  if (r.click) body.click = r.click;
  const res = await fetch(server, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("ntfy " + res.status + " " + (await res.text()).slice(0, 200));
}

async function sendDue(env) {
  if (!env.NTFY_TOPIC) return { sent: 0, error: "NTFY_TOPIC is not set" };
  const now = Date.now();
  const list = await readJson(env, LIST_KEY, []);
  const sent = await readJson(env, SENT_KEY, {});
  let changed = false;
  let count = 0;
  for (const r of list) {
    if (r.fireAt > now || sent[r.id]) continue;
    if (now - r.fireAt > LATE_LIMIT_MS) { sent[r.id] = r.fireAt; changed = true; continue; }
    try {
      await push(env, r);
      sent[r.id] = r.fireAt;
      changed = true;
      count++;
    } catch (e) {
      console.log("push failed", r.id, String(e));
    }
  }
  // forget sent markers older than 30 days
  for (const [id, at] of Object.entries(sent)) if (now - at > 30 * 864e5) { delete sent[id]; changed = true; }
  if (changed) await env.REMINDERS.put(SENT_KEY, JSON.stringify(sent));
  return { sent: count };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env.REMINDERS) return json({ ok: false, error: "The REMINDERS KV binding is missing" }, 500);
    if (!authorized(request, env)) return json({ ok: false, error: "Wrong or missing push key" }, 401);

    if (url.pathname === "/sync" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch (e) { return json({ ok: false, error: "Bad JSON" }, 400); }
      const list = clean(body.reminders);
      await env.REMINDERS.put(LIST_KEY, JSON.stringify(list));
      const now = Date.now();
      return json({ ok: true, stored: list.length, upcoming: list.filter((r) => r.fireAt > now).length });
    }
    if (url.pathname === "/test" && request.method === "POST") {
      if (!env.NTFY_TOPIC) return json({ ok: false, error: "NTFY_TOPIC is not set" }, 500);
      try {
        await push(env, { title: "Obsidian reminders are set up", text: "This is a test from your Cloudflare worker.", click: "" });
      } catch (e) {
        return json({ ok: false, error: String(e) }, 502);
      }
      return json({ ok: true });
    }
    if (url.pathname === "/status") {
      const list = await readJson(env, LIST_KEY, []);
      const now = Date.now();
      const next = list.filter((r) => r.fireAt > now).sort((a, b) => a.fireAt - b.fireAt)[0];
      return json({ ok: true, stored: list.length, next: next ? new Date(next.fireAt).toISOString() : null, topicSet: !!env.NTFY_TOPIC });
    }
    return json({ ok: false, error: "Not found" }, 404);
  },

  async scheduled(event, env, ctx) {
    if (!env.REMINDERS) return;
    ctx.waitUntil(sendDue(env));
  },
};
