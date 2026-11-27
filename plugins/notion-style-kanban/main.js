/* Notion-style Kanban — a Bases view for Obsidian.
 * Plain JavaScript (no build step). Reads frontmatter directly so it works with
 * the property names created by the Notion importer.
 */
"use strict";
const obsidian = require("obsidian");

const VIEW_TYPE = "notion-kanban";
const HOVER_SOURCE = "notion-style-kanban";
const NO_VALUE = "No value";

const COLORS = {
  default: "155, 155, 155",
  gray: "155, 155, 155",
  brown: "186, 133, 111",
  orange: "199, 125, 72",
  yellow: "202, 152, 73",
  green: "82, 158, 114",
  blue: "55, 154, 211",
  purple: "157, 104, 211",
  pink: "209, 87, 150",
  red: "223, 84, 82",
};
const HASH_COLORS = ["blue", "purple", "pink", "orange", "green", "yellow", "brown", "red", "gray"];

const DEFAULT_COLUMN_ORDER = ["Not started", "Up next", "In progress", "Done"];
const DEFAULT_COLUMN_COLORS = ["Not started=gray", "Up next=pink", "In progress=blue", "Done=green", "Closed=gray", "Blocked=red", "Backlog=brown"];
const DEFAULT_TAG_COLORS = ["Monitoring=purple", "Waiting on individual(s)=yellow", "Expedite=orange", "Weekly=blue", "Blocked=red"];
const DEFAULT_DONE_VALUES = ["Done", "Closed"];

// ---------- helpers ----------

function propKey(id) {
  if (!id || typeof id !== "string") return null;
  if (id.startsWith("note.")) return id.slice(5);
  if (id.startsWith("file.") || id.startsWith("formula.")) return null;
  return id;
}

function asList(v) {
  if (v === undefined || v === null || v === "") return [];
  if (Array.isArray(v)) return v.filter((x) => x !== null && x !== undefined && x !== "");
  return [v];
}

function asString(v) {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.map(asString).filter(Boolean).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function parseMap(list, fallback) {
  const map = new Map();
  for (const line of [...(fallback || []), ...asList(list)]) {
    const s = String(line);
    const i = s.lastIndexOf("=");
    if (i <= 0) continue;
    map.set(s.slice(0, i).trim().toLowerCase(), s.slice(i + 1).trim().toLowerCase());
  }
  return map;
}

function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HASH_COLORS[h % HASH_COLORS.length];
}

function rgbFor(colorName) {
  return COLORS[colorName] || COLORS.default;
}

// "[[path|alias]]" -> { linkpath, alias }
function parseLink(raw) {
  const s = String(raw).trim();
  const m = s.match(/^!?\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]$/);
  if (m) return { linkpath: m[1], alias: m[3] || null };
  const md = s.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
  if (md) return { linkpath: decodeURI(md[2]).replace(/\.md$/, ""), alias: md[1] };
  return { linkpath: s, alias: null };
}

// ---------- display titles ----------
// Obsidian names a note after its file, and two files in one folder can't share a name, so the
// Notion importer numbered repeated titles ("Create release planning document 1") and replaced
// characters files can't hold ("/" became "-"). A note can carry its real title in this property;
// the board, links, tabs and the note header show it, while the file name stays unique.
const TITLE_KEY = "title";
let APP = null;

function titleOf(fm) {
  const t = fm ? fm[TITLE_KEY] : undefined;
  if (typeof t === "string") return t.trim();
  if (typeof t === "number") return String(t);
  return "";
}

function displayTitle(file, app) {
  if (!file) return "";
  const a = app || APP;
  const c = a ? a.metadataCache.getFileCache(file) : null;
  return titleOf(c && c.frontmatter) || file.basename;
}

// text that is safe inside [[target|text]]
function linkAlias(text) {
  return String(text).replace(/\|/g, "-").replace(/\[\[|\]\]/g, "").trim();
}

// "Name", "Name 1", "Name 12" all count as the file for the title "Name"
function fileFitsTitle(basename, title) {
  const want = safeFileName(title || "Untitled");
  if (basename === want) return true;
  return basename.startsWith(want + " ") && /^\d+$/.test(basename.slice(want.length + 1));
}

function uniqueNotePath(app, folder, name) {
  const pathFor = (nm) => obsidian.normalizePath(`${folder && folder !== "/" ? folder + "/" : ""}${nm}.md`);
  let target = name;
  let n = 1;
  while (app.vault.getAbstractFileByPath(pathFor(target))) target = `${name} ${n++}`;
  return pathFor(target);
}

function setIconSafe(el, names) {
  for (const n of names) {
    obsidian.setIcon(el, n);
    if (el.querySelector("svg")) return true;
  }
  return false;
}

// Notion icon names (as returned by Notion's API, e.g. "icons/no_yellow") -> Lucide icons
const NOTION_ICON_MAP = {
  location: ["map-pin"], "grid-wide-six": ["layout-grid"], torii: ["landmark"], layers: ["layers"],
  no: ["ban"], "checkmark-square": ["square-check", "check-square"], checkbox: ["square"],
  "checkmark-square-filled": ["square-check"], checkmark: ["check"], "checkmark-line": ["check"],
  more: ["ellipsis", "more-horizontal"], "dots-horizontal": ["ellipsis"], ellipsis: ["ellipsis"],
  calendar: ["calendar"], "calendar-month": ["calendar"], "calendar-day": ["calendar"],
  flask: ["flask-conical"], "science-flask": ["flask-conical"], apple: ["apple"], pin: ["pin"], pushpin: ["pin"],
  "push-pin": ["pin"], pill: ["pill"], medicine: ["pill"], circle: ["circle"], "circle-dashed": ["circle-dashed"],
  "circle-four": ["circle"], "arrows-swap": ["repeat"], repeat: ["repeat"], sync: ["refresh-cw"],
  book: ["book"], "book-closed": ["book"], bookmark: ["bookmark"], document: ["file-text"], page: ["file-text"],
  clock: ["clock"], alarm: ["alarm-clock"], warning: ["triangle-alert", "alert-triangle"], star: ["star"],
  flag: ["flag"], bug: ["bug"], gear: ["settings"], wrench: ["wrench"], rocket: ["rocket"], lightbulb: ["lightbulb"],
  "light-bulb": ["lightbulb"], mail: ["mail"], envelope: ["mail"], person: ["user"], people: ["users"],
  heart: ["heart"], home: ["house", "home"], lock: ["lock"], "hourglass": ["hourglass"], pause: ["pause"],
  stop: ["octagon"], play: ["play"], "arrow-right": ["arrow-right"], "question-mark": ["circle-help", "help-circle"],
};
const NOTION_ICON_COLORS = {
  gray: "gray", lightgray: "gray", brown: "brown", orange: "orange", yellow: "orange",
  green: "green", blue: "blue", purple: "purple", pink: "pink", red: "red",
};

/** Render an icon value: Notion "icons/name_color", "lucide:name" / "name:color", or an emoji.
 *  Returns false if nothing could be drawn. */
function renderIconValue(el, value) {
  const v = String(value || "").trim();
  if (!v) return false;
  let name = null, color = null;
  const notion = v.match(/^(?:icons\/)([a-z0-9-]+?)(?:_([a-z]+))?$/i);
  const lucide = v.match(/^(?:lucide:)?([a-z0-9-]+)(?::([a-z]+))?$/i);
  if (notion) { name = notion[1]; color = notion[2] && (NOTION_ICON_COLORS[notion[2].toLowerCase()] || notion[2]); }
  else if (lucide && !/\p{Extended_Pictographic}/u.test(v)) { name = lucide[1]; color = lucide[2]; }
  if (name) {
    const drawn = setIconSafe(el, [...(NOTION_ICON_MAP[name] || []), name]);
    if (!drawn) setIconSafe(el, ["circle"]);
    const c = color && color.toLowerCase();
    if (c && COLORS[c]) el.style.color = `rgb(${COLORS[c]})`;
    return true;
  }
  el.setText(v); // emoji or other text
  el.addClass("nk-emoji");
  return true;
}

// ---------- the view ----------

class NotionKanbanView extends obsidian.BasesView {
  constructor(controller, containerEl, plugin) {
    super(controller);
    this.type = VIEW_TYPE;
    this.plugin = plugin;
    this.containerEl = containerEl;
    this.rootEl = null;
    this.childPaths = new Set();
    this.dragPath = null;
    this.collapsedLanes = null;
    this.renderSoon = obsidian.debounce(() => this.render(), 150, true);
  }

  onload() {
    this.rootEl = this.containerEl.createDiv({ cls: "nk-root" });
    // Sub-tasks are usually filtered out of the board, so watch them directly.
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.childPaths.has(file.path)) this.renderSoon();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.childPaths.has(oldPath)) this.renderSoon();
      })
    );
    this.registerEvent(this.app.workspace.on("nk:schema-changed", () => this.renderSoon()));
  }

  onunload() {
    if (this.rootEl) this.rootEl.remove();
    this.rootEl = null;
  }

  onDataUpdated() {
    if (this.dragPath) return; // don't redraw mid-drag; drop triggers a refresh
    this.render();
  }

  // ----- config -----

  cfg(key, fallback) {
    try {
      const v = this.config.get(key);
      return v === undefined || v === null || v === "" ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  settings() {
    const columnKey = propKey(this.cfg("columnProperty", "note.Status")) || "Status";
    const laneRaw = this.cfg("laneProperty", "note.Team");
    const laneId = !laneRaw || laneRaw === "none" ? null : String(laneRaw);
    // laneKey is set only for frontmatter properties, which drag-and-drop can write to.
    const laneKey = laneId ? propKey(laneId) : null;
    const subRaw = this.cfg("subtaskProperty", "note.Sub-task");
    const order = asList(this.cfg("columnOrder", []));
    return {
      columnKey,
      laneId,
      laneKey,
      laneOrder: asList(this.cfg("laneOrder", [])).map(String),
      laneColors: parseMap(this.cfg("laneColors", []), []),
      hideEmptyLanes: !!this.cfg("hideEmptyLanes", false),
      showPropertyLabels: !!this.cfg("showPropertyLabels", false),
      columnOrder: order.length ? order.map(String) : DEFAULT_COLUMN_ORDER,
      hideUnlisted: !!this.cfg("hideUnlistedColumns", false),
      hideEmptyColumns: !!this.cfg("hideEmptyColumns", false),
      columnColors: parseMap(this.cfg("columnColors", []), DEFAULT_COLUMN_COLORS),
      subtaskKey: subRaw === "none" ? null : propKey(subRaw),
      tagKey: propKey(this.cfg("tagProperty", "note.Tag")),
      tagColors: parseMap(this.cfg("tagColors", []), DEFAULT_TAG_COLORS),
      waitingKey: propKey(this.cfg("waitingProperty", "note.Waiting")),
      blockedKey: propKey(this.cfg("blockedProperty", "note.Blocked by")),
      iconKey: propKey(this.cfg("iconProperty", "note.icon")),
      orderKey: propKey(this.cfg("orderProperty", "note.manual_order")),
      doneValues: new Set(
        (asList(this.cfg("doneValues", [])).length ? asList(this.cfg("doneValues", [])) : DEFAULT_DONE_VALUES).map((s) =>
          String(s).toLowerCase()
        )
      ),
      showDoneSubtasks: this.cfg("showDoneSubtasks", true) !== false,
      defaultIcon: this.cfg("defaultIcon", "circle"),
      cardWidth: this.cfg("cardWidth", "medium"),
    };
  }

  fm(file) {
    const c = this.app.metadataCache.getFileCache(file);
    return (c && c.frontmatter) || {};
  }

  resolve(raw, sourcePath) {
    const { linkpath, alias } = parseLink(raw);
    const file = this.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
    const name = file ? displayTitle(file, this.app) : alias || linkpath.split("/").pop();
    return { file, name, linkpath };
  }

  // ----- data shaping -----

  collect(s) {
    const entries = ((this.data && this.data.data) || []).filter((e) => e && e.file instanceof obsidian.TFile);
    const cards = entries.map((e, idx) => {
      const fm = this.fm(e.file);
      const status = asString(asList(fm[s.columnKey])[0]) || NO_VALUE;
      const lane = s.laneId ? this.laneValue(e, fm, s) : null;
      const ord = s.orderKey ? Number(fm[s.orderKey]) : NaN;
      return { entry: e, file: e.file, fm, status, lane, order: Number.isFinite(ord) ? ord : null, idx };
    });

    // columns
    const seen = new Set(cards.map((c) => c.status));
    const lower = (x) => x.toLowerCase();
    let columns = [...s.columnOrder];
    if (!s.hideUnlisted) {
      const listed = new Set(columns.map(lower));
      const extra = [...seen].filter((v) => !listed.has(lower(v))).sort((a, b) => (a === NO_VALUE ? 1 : b === NO_VALUE ? -1 : a.localeCompare(b)));
      columns = columns.concat(extra);
    }
    if (s.hideEmptyColumns) columns = columns.filter((c) => [...seen].some((v) => lower(v) === lower(c)));
    const colIndex = new Map(columns.map((c, i) => [lower(c), i]));

    // lanes
    let lanes = [null];
    if (s.laneId) {
      const counts = new Map();
      for (const c of cards) counts.set(c.lane, (counts.get(c.lane) || 0) + 1);
      // lanes listed in "Lane order" come first, in that order; the rest follow alphabetically
      const rank = new Map(s.laneOrder.map((v, i) => [v.toLowerCase(), i]));
      const found = [...counts.keys()];
      if (!s.hideEmptyLanes) {
        for (const v of s.laneOrder) if (!found.some((f) => f.toLowerCase() === v.toLowerCase())) found.push(v);
      }
      lanes = found.sort((a, b) => {
        const ra = rank.has(a.toLowerCase()) ? rank.get(a.toLowerCase()) : Infinity;
        const rb = rank.has(b.toLowerCase()) ? rank.get(b.toLowerCase()) : Infinity;
        if (ra !== rb) return ra - rb;
        return a === NO_VALUE ? 1 : b === NO_VALUE ? -1 : a.localeCompare(b);
      });
      if (!lanes.length) lanes = [NO_VALUE];
    }

    // buckets
    const buckets = new Map();
    for (const c of cards) {
      const ci = colIndex.get(lower(c.status));
      if (ci === undefined) continue;
      const key = `${c.lane}\u0000${ci}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(c);
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order || a.idx - b.idx;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return a.idx - b.idx;
      });
    }
    return { cards, columns, lanes, buckets };
  }

  laneValue(entry, fm, s) {
    if (s.laneKey) return asString(asList(fm[s.laneKey])[0]) || NO_VALUE;
    // formula.* and file.* values come from Bases itself
    try {
      const v = entry.getValue(s.laneId);
      const t = v ? v.toString() : "";
      return t && t !== "null" ? t : NO_VALUE;
    } catch (e) {
      return NO_VALUE;
    }
  }

  subtaskState(file, s) {
    const fm = this.fm(file);
    const status = asString(asList(fm[s.columnKey])[0]).toLowerCase();
    const tags = asList(s.tagKey ? fm[s.tagKey] : []).map((t) => String(t).toLowerCase());
    const waiting = s.waitingKey ? asString(fm[s.waitingKey]).toLowerCase() : "";
    const blockedBy = s.blockedKey ? asList(fm[s.blockedKey]) : [];
    if (s.doneValues.has(status)) return "done";
    if (blockedBy.length || tags.includes("blocked") || status === "blocked") return "blocked";
    if (status === "in progress") return "progress";
    if (tags.some((t) => t.includes("waiting")) || waiting === "true" || fm[s.waitingKey] === true) return "waiting";
    return "todo";
  }

  // ----- rendering -----

  render() {
    if (!this.rootEl) return;
    const scrollLeft = this.rootEl.scrollLeft;
    const scrollTop = this.rootEl.scrollTop;
    const s = this.settings();
    this.s = s;
    if (this.collapsedLanes === null) this.collapsedLanes = new Set(asList(this.cfg("collapsedLanes", [])).map(String));
    const { columns, lanes, buckets } = this.collect(s);
    this.childPaths = new Set();

    const root = this.rootEl;
    root.empty();
    root.className = `nk-root nk-width-${s.cardWidth}`;
    const board = root.createDiv({ cls: "nk-board" });
    board.style.setProperty("--nk-cols", String(columns.length));

    // column headers
    const header = board.createDiv({ cls: "nk-row nk-header-row" });
    columns.forEach((col, ci) => {
      const rgb = rgbFor(this.plugin.schemas.colorOf(s.columnKey, col) || s.columnColors.get(col.toLowerCase()) || "gray");
      const h = header.createDiv({ cls: "nk-col-header" });
      h.style.setProperty("--nk-rgb", rgb);
      const pill = h.createSpan({ cls: "nk-status-pill" });
      pill.createSpan({ cls: "nk-dot" });
      pill.createSpan({ text: col });
      let total = 0;
      for (const lane of lanes) total += (buckets.get(`${lane}\u0000${ci}`) || []).length;
      h.createSpan({ cls: "nk-count", text: String(total) });
      const add = h.createSpan({ cls: "nk-header-add", attr: { "aria-label": "New task" } });
      setIconSafe(add, ["plus"]);
      add.onclick = () => this.createCard(col, lanes.length === 1 ? lanes[0] : null);
    });

    for (const lane of lanes) {
      if (s.laneId) {
        const collapsed = this.collapsedLanes.has(lane);
        const lh = board.createDiv({ cls: "nk-lane-header" + (collapsed ? " is-collapsed" : "") });
        const caret = lh.createSpan({ cls: "nk-caret" });
        setIconSafe(caret, ["chevron-down"]);
        const lanePill = lh.createSpan({ cls: "nk-lane-pill", text: lane });
        lanePill.style.setProperty("--nk-rgb", rgbFor((s.laneKey && this.plugin.schemas.colorOf(s.laneKey, lane)) || s.laneColors.get(lane.toLowerCase()) || s.tagColors.get(lane.toLowerCase()) || "blue"));
        let n = 0;
        columns.forEach((_, ci) => (n += (buckets.get(`${lane}\u0000${ci}`) || []).length));
        lh.createSpan({ cls: "nk-count", text: String(n) });
        lh.onclick = () => this.toggleLane(lane);
        if (collapsed) continue;
      }
      const row = board.createDiv({ cls: "nk-row" });
      columns.forEach((col, ci) => {
        const rgb = rgbFor(this.plugin.schemas.colorOf(s.columnKey, col) || s.columnColors.get(col.toLowerCase()) || "gray");
        const cell = row.createDiv({ cls: "nk-cell" });
        cell.style.setProperty("--nk-rgb", rgb);
        const list = buckets.get(`${lane}\u0000${ci}`) || [];
        for (const c of list) this.renderCard(cell, c, s);
        const add = cell.createDiv({ cls: "nk-add" });
        setIconSafe(add.createSpan({ cls: "nk-add-icon" }), ["plus"]);
        add.createSpan({ text: "New task" });
        add.onclick = () => this.createCard(col, lane);
        this.wireDrop(cell, col, lane, list);
      });
    }

    root.scrollLeft = scrollLeft;
    root.scrollTop = scrollTop;
  }

  renderCard(cell, c, s) {
    const card = cell.createDiv({ cls: "nk-card", attr: { draggable: "true", "data-path": c.file.path } });

    const titleRow = card.createDiv({ cls: "nk-title-row" });
    const iconVal = s.iconKey ? asString(c.fm[s.iconKey]) : "";
    let titleIcon = null;
    if (iconVal) {
      titleIcon = titleRow.createSpan({ cls: "nk-title-icon" });
      renderIconValue(titleIcon, iconVal);
    } else if (s.defaultIcon !== "none") {
      titleIcon = titleRow.createSpan({ cls: "nk-title-icon nk-default-icon" });
      setIconSafe(titleIcon, ["circle"]);
    }
    if (titleIcon && s.iconKey) {
      titleIcon.addClass("is-clickable");
      titleIcon.setAttr("aria-label", "Change icon");
      titleIcon.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.plugin.openIconPicker(c.file, s.iconKey, titleIcon);
      };
    }
    titleRow.createSpan({ cls: "nk-title", text: displayTitle(c.file, this.app) });

    // tags
    const tags = s.tagKey ? asList(c.fm[s.tagKey]).map(String) : [];
    if (tags.length) {
      const tagRow = card.createDiv({ cls: "nk-tags" });
      for (const t of tags) {
        const p = tagRow.createSpan({ cls: "nk-tag", text: t });
        p.style.setProperty("--nk-rgb", rgbFor(this.plugin.schemas.colorOf(s.tagKey, t) || s.tagColors.get(t.toLowerCase()) || hashColor(t.toLowerCase())));
      }
    }

    // extra properties chosen in the Bases "Properties" menu
    const skip = new Set(["file.name", "note." + s.subtaskKey, "note." + s.tagKey, "note." + s.iconKey, "note." + s.orderKey]);
    let order = [];
    try { order = this.config.getOrder() || []; } catch (e) { order = []; }
    const extras = order.filter((id) => !skip.has(id));
    if (extras.length) {
      const props = card.createDiv({ cls: "nk-props" });
      for (const id of extras) {
        let text = "";
        let links = [];
        const k = propKey(id);
        if (k) {
          const vals = asList(c.fm[k]);
          links = vals.filter((x) => typeof x === "string" && x.startsWith("[["));
          text = vals.filter((x) => !links.includes(x)).map(asString).filter(Boolean).join(", ");
        } else {
          try { const v = c.entry.getValue(id); text = v ? v.toString() : ""; } catch (e) { text = ""; }
        }
        if (text === "null") text = "";
        if (!text && !links.length) continue;
        const pr = props.createDiv({ cls: "nk-prop" });
        if (s.showPropertyLabels) {
          let label = id;
          try { label = this.config.getDisplayName(id); } catch (e) {}
          pr.createSpan({ cls: "nk-prop-label", text: label });
        }
        const val = pr.createSpan({ cls: "nk-prop-value" });
        for (const raw of links) this.renderLinkChip(val, raw, c, s);
        if (text) val.createSpan({ text });
      }
      if (!props.childElementCount) props.remove();
    }

    // sub-tasks
    const subs = s.subtaskKey ? asList(c.fm[s.subtaskKey]) : [];
    if (subs.length) {
      const list = card.createDiv({ cls: "nk-subtasks" });
      for (const raw of subs) {
        const r = this.resolve(raw, c.file.path);
        const state = r.file ? this.subtaskState(r.file, s) : "todo";
        if (state === "done" && !s.showDoneSubtasks) continue;
        if (r.file) this.childPaths.add(r.file.path);
        const row = list.createDiv({ cls: `nk-sub nk-sub-${state}` });
        const box = row.createSpan({ cls: "nk-sub-icon", attr: { "aria-label": "Toggle done" } });
        const icons = {
          done: ["square-check", "check-square"],
          blocked: ["ban"],
          waiting: ["ban"],
          progress: ["ellipsis", "more-horizontal"],
          todo: ["square"],
        };
        // A sub-task's own icon (e.g. backfilled from Notion) wins over the status-based guess,
        // except when it's done, which always shows a checked box like Notion.
        const childIcon = r.file && s.iconKey ? asString(this.fm(r.file)[s.iconKey]) : "";
        if (!(childIcon && state !== "done" && renderIconValue(box, childIcon))) setIconSafe(box, icons[state]);
        if (childIcon && state !== "done") row.addClass("has-own-icon");
        box.onclick = (ev) => {
          ev.stopPropagation();
          if (r.file) this.toggleSubtask(r.file, state === "done");
        };
        const link = row.createSpan({ cls: "nk-sub-link" + (r.file ? "" : " is-unresolved"), text: r.name });
        link.onclick = (ev) => {
          ev.stopPropagation();
          this.app.workspace.openLinkText(r.file ? r.file.path : r.linkpath, c.file.path, obsidian.Keymap.isModEvent(ev));
        };
        link.onmouseover = (ev) => {
          this.app.workspace.trigger("hover-link", {
            event: ev, source: HOVER_SOURCE, hoverParent: this, targetEl: link,
            linktext: r.file ? r.file.path : r.linkpath, sourcePath: c.file.path,
          });
        };
        if (r.file) {
          row.oncontextmenu = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const menu = new obsidian.Menu();
            this.app.workspace.trigger("file-menu", menu, r.file, HOVER_SOURCE);
            menu.showAtMouseEvent(ev);
          };
        }
      }
    }

    card.onclick = (ev) => {
      if (ev.defaultPrevented) return;
      this.app.workspace.getLeaf(obsidian.Keymap.isModEvent(ev) || false).openFile(c.file);
    };
    card.onmouseover = (ev) => {
      if (ev.target !== card && !ev.target.closest(".nk-title-row")) return;
      this.app.workspace.trigger("hover-link", {
        event: ev, source: HOVER_SOURCE, hoverParent: this, targetEl: card, linktext: c.file.path, sourcePath: "",
      });
    };
    card.oncontextmenu = (ev) => {
      ev.preventDefault();
      const menu = new obsidian.Menu();
      this.app.workspace.trigger("file-menu", menu, c.file, HOVER_SOURCE);
      menu.showAtMouseEvent(ev);
    };
    card.addEventListener("dragstart", (ev) => {
      this.dragPath = c.file.path;
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", c.file.path);
      window.setTimeout(() => card.addClass("is-dragging"), 0);
    });
    card.addEventListener("dragend", () => {
      card.removeClass("is-dragging");
      this.rootEl && this.rootEl.querySelectorAll(".nk-drop-marker").forEach((m) => m.remove());
      if (this.dragPath) { this.dragPath = null; this.renderSoon(); }
    });
  }

  // A linked note, drawn like a Notion relation: its icon, then its underlined name.
  renderLinkChip(parent, raw, c, s) {
    const r = this.resolve(raw, c.file.path);
    const chip = parent.createSpan({ cls: "nk-link" + (r.file ? "" : " is-unresolved") });
    const iconVal = r.file && s.iconKey ? asString(this.fm(r.file)[s.iconKey]) : "";
    const ic = chip.createSpan({ cls: "nk-link-icon" });
    if (!(iconVal && renderIconValue(ic, iconVal))) setIconSafe(ic, ["file-text", "file"]);
    chip.createSpan({ cls: "nk-link-name", text: r.name });
    if (r.file) this.childPaths.add(r.file.path);
    chip.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.app.workspace.openLinkText(r.file ? r.file.path : r.linkpath, c.file.path, obsidian.Keymap.isModEvent(ev));
    };
    chip.onmouseover = (ev) => {
      this.app.workspace.trigger("hover-link", {
        event: ev, source: HOVER_SOURCE, hoverParent: this, targetEl: chip,
        linktext: r.file ? r.file.path : r.linkpath, sourcePath: c.file.path,
      });
    };
  }

  // ----- drag & drop -----

  wireDrop(cell, column, lane, list) {
    const marker = createDiv({ cls: "nk-drop-marker" });
    const indexAt = (y) => {
      const cards = [...cell.querySelectorAll(".nk-card:not(.is-dragging)")];
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) return { i, before: cards[i] };
      }
      return { i: cards.length, before: cell.querySelector(".nk-add") };
    };
    cell.addEventListener("dragover", (ev) => {
      if (!this.dragPath) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
      const { before } = indexAt(ev.clientY);
      if (marker.nextSibling !== before) cell.insertBefore(marker, before);
    });
    cell.addEventListener("dragleave", (ev) => {
      if (!cell.contains(ev.relatedTarget)) marker.remove();
    });
    cell.addEventListener("drop", async (ev) => {
      ev.preventDefault();
      marker.remove();
      const path = this.dragPath;
      this.dragPath = null;
      if (!path) return;
      const { i } = indexAt(ev.clientY);
      const others = list.filter((c) => c.file.path !== path);
      await this.moveCard(path, column, lane, others, i);
    });
  }

  async moveCard(path, column, lane, others, index) {
    const s = this.s;
    const file = this.app.vault.getFileByPath(path);
    if (!file) return;
    let newOrder = null;
    const renumber = [];
    if (s.orderKey) {
      const prev = others[index - 1];
      const next = others[index];
      const pv = prev ? prev.order : null;
      const nv = next ? next.order : null;
      if ((prev && pv === null) || (next && nv === null) || (pv !== null && nv !== null && nv - pv < 1e-6)) {
        // neighbours have no usable order: renumber the whole column
        const seq = [...others];
        seq.splice(index, 0, { file });
        seq.forEach((c, k) => renumber.push([c.file, (k + 1) * 1024]));
      } else if (pv !== null && nv !== null) newOrder = (pv + nv) / 2;
      else if (pv !== null) newOrder = pv + 1024;
      else if (nv !== null) newOrder = nv - 1024;
      else newOrder = 1024;
    }

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (column !== NO_VALUE) {
        fm[s.columnKey] = Array.isArray(fm[s.columnKey]) ? [column] : column;
      } else delete fm[s.columnKey];
      if (s.laneKey && lane !== null) {
        if (lane === NO_VALUE) delete fm[s.laneKey];
        else fm[s.laneKey] = Array.isArray(fm[s.laneKey]) ? [lane] : lane;
      }
      if (newOrder !== null) fm[s.orderKey] = newOrder;
    });
    for (const [f, o] of renumber) {
      await this.app.fileManager.processFrontMatter(f, (fm) => { fm[s.orderKey] = o; });
    }
    this.renderSoon();
  }

  async toggleSubtask(file, isDone) {
    const s = this.s;
    const doneValue = [...s.doneValues].length ? (DEFAULT_DONE_VALUES.find((d) => s.doneValues.has(d.toLowerCase())) || [...s.doneValues][0]) : "Done";
    const target = isDone ? s.columnOrder[0] || "Not started" : doneValue;
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm[s.columnKey] = Array.isArray(fm[s.columnKey]) ? [target] : target;
    });
  }

  toggleLane(lane) {
    if (this.collapsedLanes.has(lane)) this.collapsedLanes.delete(lane);
    else this.collapsedLanes.add(lane);
    try { this.config.set("collapsedLanes", [...this.collapsedLanes]); } catch (e) {}
    this.render();
  }

  // ----- new card -----

  async createCard(column, lane) {
    const s = this.s;
    // Notion: + on a board column uses the database's default template
    const lib = this.plugin.templates;
    const baseFile = this.boardBaseFile();
    const db = lib && baseFile ? lib.dbForBase(baseFile) : null;
    const def = db ? lib.defaultTemplate(db) : null;
    if (def) {
      const props = {};
      if (column !== NO_VALUE) props[s.columnKey] = column;
      if (s.laneKey && lane && lane !== NO_VALUE) props[s.laneKey] = lane;
      if (s.orderKey) props[s.orderKey] = 0;
      return lib.guard(() => lib.create(db, def, { properties: props }));
    }
    const entries = ((this.data && this.data.data) || []).filter((e) => e && e.file instanceof obsidian.TFile);
    const sample = entries[0] ? entries[0].file : null;
    const folder = sample && sample.parent ? sample.parent.path : "";
    const sampleFm = sample ? this.fm(sample) : {};
    const file = await this.app.vault.create(uniqueNotePath(this.app, folder, "Untitled"), "");
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      // an empty title puts the Notion-style title header on the note; typing in it names the task
      fm[TITLE_KEY] = "";
      // keep the note inside this base's filter (the importer links notes to their base)
      if (sampleFm.base) fm.base = sampleFm.base;
      if (column !== NO_VALUE) fm[s.columnKey] = column;
      if (s.laneKey && lane && lane !== NO_VALUE) fm[s.laneKey] = lane;
      if (s.orderKey) fm[s.orderKey] = 0;
    });
    this.plugin.focusTitlePath = file.path;
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file, { state: { mode: "source" } });
  }
}

// ---------- plugin ----------

// the .base file a board belongs to (the leaf whose container holds this view)
NotionKanbanView.prototype.boardBaseFile = function () {
  for (const leaf of this.app.workspace.getLeavesOfType("bases")) {
    const v = leaf.view;
    if (v && v.containerEl && this.containerEl && v.containerEl.contains(this.containerEl) && v.file) return v.file;
  }
  // embedded or unknown: fall back to the base linked from the board's notes
  const e = ((this.data && this.data.data) || []).find((x) => x && x.file instanceof obsidian.TFile);
  if (!e) return null;
  const link = parseLink(asString(this.fm(e.file).base)).linkpath;
  return link ? this.app.metadataCache.getFirstLinkpathDest(link, e.file.path) : null;
};

function viewOptions() {
  return [
    {
      type: "group",
      displayName: "Columns",
      items: [
        { type: "property", key: "columnProperty", displayName: "Column property", placeholder: "Status" },
        { type: "multitext", key: "columnOrder", displayName: "Column order", default: DEFAULT_COLUMN_ORDER },
        { type: "multitext", key: "columnColors", displayName: "Column colors (Value=color)", default: [] },
        { type: "multitext", key: "doneValues", displayName: "Values that count as done", default: DEFAULT_DONE_VALUES },
        { type: "toggle", key: "hideUnlistedColumns", displayName: "Only show listed columns", default: false },
        { type: "toggle", key: "hideEmptyColumns", displayName: "Hide empty columns", default: false },
      ],
    },
    {
      type: "group",
      displayName: "Swimlanes",
      items: [
        { type: "property", key: "laneProperty", displayName: "Swimlane property", placeholder: "Team" },
        { type: "multitext", key: "laneOrder", displayName: "Swimlane order (others follow A-Z)", default: [] },
        { type: "multitext", key: "laneColors", displayName: "Swimlane colors (Value=color)", default: [] },
        { type: "toggle", key: "hideEmptyLanes", displayName: "Hide empty swimlanes", default: false },
      ],
    },
    {
      type: "group",
      displayName: "Cards",
      items: [
        { type: "property", key: "subtaskProperty", displayName: "Sub-task property", placeholder: "Sub-task" },
        { type: "toggle", key: "showDoneSubtasks", displayName: "Show done sub-tasks", default: true },
        { type: "property", key: "tagProperty", displayName: "Tag property", placeholder: "Tag" },
        { type: "multitext", key: "tagColors", displayName: "Tag colors (Tag=color)", default: [] },
        { type: "property", key: "waitingProperty", displayName: "Waiting property", placeholder: "Waiting" },
        { type: "property", key: "blockedProperty", displayName: "Blocked-by property", placeholder: "Blocked by" },
        { type: "property", key: "iconProperty", displayName: "Icon property", placeholder: "icon" },
        { type: "dropdown", key: "defaultIcon", displayName: "Icon when none set", default: "circle", options: { circle: "Circle", none: "None" } },
        { type: "property", key: "orderProperty", displayName: "Manual order property", placeholder: "manual_order" },
        { type: "toggle", key: "showPropertyLabels", displayName: "Show property names on cards", default: false },
        { type: "dropdown", key: "cardWidth", displayName: "Column width", default: "medium", options: { small: "Small", medium: "Medium", large: "Large" } },
      ],
    },
  ];
}

// ---------- icon picker ----------

const PICKER_COLORS = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];

// emoji + search words, grouped like Notion's picker
const EMOJI_GROUPS = [
  ["Smileys & people", "😀 grin smile happy|😃 smile happy|😄 laugh smile|😁 grin|😆 laugh|😅 sweat relief|😂 joy tears laugh|🙂 slight smile|😉 wink|😊 blush|😇 angel halo|🥰 love hearts|😍 heart eyes love|🤩 star struck|😘 kiss|😋 yum tasty|😎 cool sunglasses|🤓 nerd|🧐 monocle inspect|🤔 thinking question|🤨 raised eyebrow skeptical|😐 neutral|😑 expressionless|😶 silent|🙄 eye roll|😏 smirk|😬 grimace awkward|😮‍💨 exhale relief|😌 relieved|😴 sleep tired|🤒 sick|🤯 mind blown|🥳 party celebrate|😕 confused|😟 worried|😮 surprised wow|😳 flushed|🥺 pleading|😢 cry sad|😭 sob|😱 scream fear|😤 triumph huff|😡 angry rage|🤬 swear|💀 skull dead|👻 ghost|🤖 robot bot|👋 wave hello|👍 thumbs up yes approve|👎 thumbs down no|👌 ok|✌️ peace victory|🤞 fingers crossed luck|👏 clap applause|🙌 raised hands celebrate|🙏 pray please thanks|💪 muscle strong|🤝 handshake deal agreement|✋ hand stop|☝️ point up|👉 point right|👀 eyes look watch|🧠 brain think|👤 person user|👥 people users team|🧑‍💻 developer coder|🧑‍🔧 mechanic fix|🧑‍⚕️ doctor health|🧑‍🏫 teacher|🧑‍💼 office worker business"],
  ["Animals & nature", "🐶 dog|🐱 cat|🐭 mouse|🦊 fox|🐻 bear|🐼 panda|🐨 koala|🐯 tiger|🦁 lion|🐮 cow|🐷 pig|🐸 frog|🐵 monkey|🐔 chicken|🐧 penguin|🐦 bird|🦉 owl|🦋 butterfly|🐝 bee|🐞 ladybug|🐢 turtle slow|🐍 snake|🐙 octopus|🐬 dolphin|🐳 whale|🦈 shark|🐌 snail slow|🐛 bug|🌱 seedling sprout grow|🌿 herb leaf|☘️ shamrock|🍀 clover luck|🌲 tree evergreen|🌳 tree|🌵 cactus|🌸 blossom flower|🌻 sunflower|🌹 rose|🍁 maple leaf fall|🍂 fallen leaves autumn|🌍 earth globe world|🌙 moon night|⭐ star|🌟 glowing star|✨ sparkles new|⚡ lightning zap fast|🔥 fire hot urgent|🌈 rainbow|☀️ sun|🌤️ sun cloud|☁️ cloud|🌧️ rain|❄️ snow cold|🌊 wave water|💧 droplet water"],
  ["Food & drink", "🍎 apple|🍊 orange|🍋 lemon|🍌 banana|🍉 watermelon|🍇 grapes|🍓 strawberry|🍒 cherries|🍑 peach|🥑 avocado|🥕 carrot|🌽 corn|🍞 bread|🧀 cheese|🍳 egg cooking|🥓 bacon|🍔 burger|🍟 fries|🍕 pizza|🌮 taco|🍣 sushi|🍜 noodles ramen|🍝 pasta spaghetti|🍰 cake|🎂 birthday cake|🍪 cookie|🍩 donut|🍫 chocolate|🍿 popcorn|☕ coffee|🍵 tea|🥤 drink soda|🍺 beer|🍷 wine|🥂 cheers toast|🍽️ dinner plate"],
  ["Activities", "⚽ soccer|🏀 basketball|🏈 football|⚾ baseball|🎾 tennis|🏐 volleyball|🎳 bowling|⛳ golf|🎣 fishing|🏃 run|🚴 bike cycling|🏋️ weights gym|🧘 yoga meditate|🏆 trophy win award|🥇 gold medal first|🎯 target goal|🎮 game controller|🕹️ joystick arcade|🎲 dice game|♟️ chess strategy|🧩 puzzle|🎨 art palette design|🎬 movie film|🎤 microphone sing|🎧 headphones music|🎵 music note|🎸 guitar|🎹 piano|🎉 party tada celebrate|🎊 confetti|🎁 gift present|🎈 balloon|🎟️ ticket"],
  ["Travel & places", "🚗 car|🚕 taxi|🚌 bus|🚑 ambulance|🚒 fire truck|🚚 truck delivery shipping|🚲 bicycle|🛵 scooter|✈️ airplane plane travel flight|🚀 rocket launch release ship|🛸 ufo|🚁 helicopter|⛵ sailboat|🚢 ship|🚦 traffic light|🚧 construction wip|⚓ anchor|🗺️ map|🧭 compass|🏔️ mountain|🏖️ beach vacation|🏕️ camping|🏠 house home|🏢 office building|🏥 hospital|🏦 bank|🏪 store shop|🏫 school|🏭 factory|🏛️ classical building|⛪ church|🗽 statue liberty|🌉 bridge|🌃 night city"],
  ["Objects", "⌚ watch|📱 phone mobile|💻 laptop computer|🖥️ desktop monitor|⌨️ keyboard|🖱️ mouse|🖨️ printer|💾 floppy save|💿 disc|📷 camera|📹 video camera|📺 tv|📻 radio|🔋 battery|🔌 plug power|💡 bulb idea|🔦 flashlight|🕯️ candle|💰 money bag|💵 dollar cash|💳 credit card payment|🧾 receipt invoice|💎 gem diamond|⚖️ scale balance legal|🔧 wrench fix tool|🔨 hammer build|🛠️ tools|⚙️ gear settings|🔩 bolt|🧰 toolbox|🧲 magnet|🔬 microscope science|🔭 telescope|📡 satellite antenna|💉 syringe vaccine|💊 pill medicine pharmacy|🩺 stethoscope health|🩹 bandage|🧪 test tube lab experiment|🧬 dna|🔑 key|🗝️ old key|🔒 lock secure|🔓 unlock|🛡️ shield security|🚪 door|🛒 cart shopping|📦 package box shipping|📫 mailbox|✉️ envelope email|📧 email|📨 incoming mail|📝 memo note write|✏️ pencil edit|🖊️ pen|📌 pushpin pin|📍 location pin|📎 paperclip attach|📏 ruler|✂️ scissors cut|🗂️ dividers folder|📁 folder|📂 open folder|🗃️ card box archive|🗄️ cabinet|🗑️ trash delete|📅 calendar date|📆 calendar|🗓️ spiral calendar schedule|📇 rolodex contacts|📈 chart up growth|📉 chart down|📊 bar chart stats|📋 clipboard checklist|📄 page document|📃 curled page|📑 bookmark tabs|📒 ledger|📓 notebook|📔 notebook|📕 closed book|📗 green book|📘 blue book|📙 orange book|📚 books library|📖 open book read|🔖 bookmark|🏷️ label tag|🔍 search magnify|🔗 link chain|⏰ alarm clock|⏳ hourglass wait|⌛ hourglass done|⏱️ stopwatch timer|🧯 extinguisher|🪣 bucket|🧹 broom clean"],
  ["Symbols", "❤️ red heart love|🧡 orange heart|💛 yellow heart|💚 green heart|💙 blue heart|💜 purple heart|🖤 black heart|🤍 white heart|💔 broken heart|❗ exclamation important|❓ question|‼️ double exclamation|⚠️ warning caution|🚫 prohibited no blocked|⛔ no entry stop|🛑 stop sign|✅ check done complete yes|☑️ checkbox checked|✔️ check mark|❌ cross x no fail|❎ cross button|➕ plus add|➖ minus|➗ divide|✖️ multiply|♻️ recycle|🔄 refresh sync repeat|🔁 repeat loop recurring|🔂 repeat once|▶️ play|⏸️ pause hold|⏹️ stop|⏭️ next skip|⏪ rewind|🔼 up|🔽 down|⬆️ up arrow|⬇️ down arrow|⬅️ left arrow|➡️ right arrow|↩️ return back|🔀 shuffle|🔃 clockwise|🆕 new|🆗 ok|🆙 up|🆒 cool|🆓 free|🔝 top|🔜 soon|💯 hundred perfect|🔴 red circle|🟠 orange circle|🟡 yellow circle|🟢 green circle|🔵 blue circle|🟣 purple circle|⚫ black circle|⚪ white circle|🟥 red square|🟧 orange square|🟨 yellow square|🟩 green square|🟦 blue square|🟪 purple square|⬛ black square|⬜ white square|🔶 orange diamond|🔷 blue diamond|💬 speech chat comment|💭 thought|🗨️ speech|🔔 bell notification|🔕 mute|📣 megaphone announce|📢 loudspeaker|💤 sleep zzz|♾️ infinity|#️⃣ number hash|ℹ️ info information"],
];

const isEmoji = (v) => /\p{Extended_Pictographic}/u.test(String(v || ""));
const RECENT_LIMIT = 20;

class IconPicker {
  constructor(plugin, file, iconKey, anchorEl, pos) {
    this.plugin = plugin;
    this.app = plugin.app;
    // `file` is a note, or a custom target { current, write(value) } (e.g. a view tab)
    this.target = file && typeof file.write === "function" ? file : null;
    this.file = this.target ? null : file;
    this.iconKey = iconKey || "icon";
    this.anchorEl = anchorEl;
    this.pos = pos;
    const fm = this.file ? (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {} : {};
    const cur = this.target ? asString(this.target.current) : asString(fm[this.iconKey]);
    const m = cur.match(/:([a-z]+)$/) || cur.match(/^icons\/.*_([a-z]+)$/);
    this.color = m && PICKER_COLORS.includes(m[1]) ? m[1] : (m && NOTION_ICON_COLORS[m[1]]) || "default";
    const s = plugin.settings;
    this.tab = s.pickerTab || (cur && isEmoji(cur) ? "emoji" : "icons");
    if (this.tab === "recent" && !s.recentIcons.length) this.tab = "icons";
    if (this.tab === "saved" && !s.savedIcons.length) this.tab = "icons";
    this.query = "";
  }

  open() {
    const el = (this.el = document.body.createDiv({ cls: "nk-picker" }));
    const head = el.createDiv({ cls: "nk-picker-tabs" });
    this.tabEls = {};
    for (const [id, label] of [["recent", "Recent"], ["saved", "Saved"], ["emoji", "Emoji"], ["icons", "Icons"]]) {
      const t = head.createDiv({ cls: "nk-picker-tab", text: label });
      t.onclick = () => {
        this.tab = id;
        this.plugin.settings.pickerTab = id;
        this.plugin.saveData(this.plugin.settings);
        this.refresh();
      };
      this.tabEls[id] = t;
    }
    const remove = head.createDiv({ cls: "nk-picker-remove", text: "Remove" });
    remove.onclick = () => this.save(null, false);

    const bar = el.createDiv({ cls: "nk-picker-bar" });
    const searchWrap = bar.createDiv({ cls: "nk-picker-search" });
    setIconSafe(searchWrap.createSpan({ cls: "nk-picker-search-icon" }), ["search"]);
    this.input = searchWrap.createEl("input", { attr: { type: "text", placeholder: "Filter…", spellcheck: "false" } });
    this.input.oninput = () => { this.query = this.input.value.trim().toLowerCase(); this.renderGrid(); };
    this.shuffleBtn = bar.createDiv({ cls: "nk-picker-btn", attr: { "aria-label": "Random" } });
    setIconSafe(this.shuffleBtn, ["shuffle"]);
    this.shuffleBtn.onclick = () => {
      const pool = this.tab === "emoji" ? this.allEmoji().map((e) => e.char) : this.allIcons();
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.save(this.tab === "emoji" ? pick : this.iconValue(pick), false); // random isn't a manual pick
    };
    this.colorBtn = bar.createDiv({ cls: "nk-picker-btn nk-picker-colorbtn", attr: { "aria-label": "Icon color" } });
    this.colorDot = this.colorBtn.createSpan({ cls: "nk-picker-dot" });
    this.colorBtn.onclick = (ev) => { ev.stopPropagation(); this.toggleColors(); };
    this.colorRow = el.createDiv({ cls: "nk-picker-colors" });
    this.colorRow.hide();

    this.body = el.createDiv({ cls: "nk-picker-body" });
    this.body.addEventListener("scroll", () => this.maybeRenderMore());
    this.footer = el.createDiv({ cls: "nk-picker-footer" });

    // Clicks inside Obsidian's context menus (Add to Saved…) must not close the picker
    this.onDocDown = (ev) => { if (!el.contains(ev.target) && !ev.target.closest(".menu")) this.close(); };
    this.onKey = (ev) => { if (ev.key === "Escape" && !document.querySelector("body > .menu")) { ev.stopPropagation(); this.close(); } };
    window.setTimeout(() => {
      document.addEventListener("mousedown", this.onDocDown, true);
      document.addEventListener("keydown", this.onKey, true);
    }, 0);

    this.position();
    this.refresh();
    this.input.focus();
  }

  position() {
    const el = this.el;
    const w = 420, h = 460, pad = 8;
    let x, y;
    const r = this.anchorEl && this.anchorEl.isConnected ? this.anchorEl.getBoundingClientRect() : null;
    if (r) { x = r.left; y = r.bottom + 6; }
    else if (this.pos) { x = this.pos.x; y = this.pos.y; }
    else { x = (window.innerWidth - w) / 2; y = (window.innerHeight - h) / 3; }
    x = Math.max(pad, Math.min(x, window.innerWidth - w - pad));
    if (y + h > window.innerHeight - pad) y = Math.max(pad, r ? r.top - h - 6 : window.innerHeight - h - pad);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  close() {
    document.removeEventListener("mousedown", this.onDocDown, true);
    document.removeEventListener("keydown", this.onKey, true);
    if (this.el) this.el.remove();
    this.el = null;
  }

  toggleColors() {
    const row = this.colorRow;
    if (row.isShown()) { row.hide(); return; }
    row.empty();
    for (const c of PICKER_COLORS) {
      const sw = row.createDiv({ cls: "nk-picker-swatch" + (c === this.color ? " is-active" : ""), attr: { "aria-label": c } });
      if (c === "default") sw.addClass("is-default");
      else sw.style.background = `rgb(${COLORS[c]})`;
      sw.onclick = () => { this.color = c; row.hide(); this.refresh(); };
    }
    row.show();
  }

  iconValue(name) {
    return this.color === "default" ? name : `${name}:${this.color}`;
  }

  allIcons() {
    if (!this.plugin._iconIds) {
      let ids = [];
      try { ids = obsidian.getIconIds(); } catch (e) { ids = []; }
      this.plugin._iconIds = [...new Set(ids.filter((i) => i.startsWith("lucide-")).map((i) => i.slice(7)))].sort();
    }
    return this.plugin._iconIds;
  }

  allEmoji() {
    if (!this.plugin._emoji) {
      const out = [];
      for (const [group, s] of EMOJI_GROUPS) {
        for (const item of s.split("|")) {
          const sp = item.indexOf(" ");
          out.push({ char: item.slice(0, sp), words: item.slice(sp + 1), group });
        }
      }
      this.plugin._emoji = out;
    }
    return this.plugin._emoji;
  }

  // words used to filter a saved/recent value
  wordsFor(value) {
    if (isEmoji(value)) {
      const e = this.allEmoji().find((x) => x.char === value);
      return e ? e.words : "";
    }
    return value.replace(/^icons\//, "").replace(/[:_]/g, " ");
  }

  refresh() {
    for (const [id, t] of Object.entries(this.tabEls)) t.toggleClass("is-active", id === this.tab);
    this.colorBtn.toggle(this.tab === "icons");
    this.shuffleBtn.toggle(this.tab === "icons" || this.tab === "emoji");
    if (this.tab !== "icons") this.colorRow.hide();
    this.colorDot.style.background = this.color === "default" ? "var(--text-muted)" : `rgb(${COLORS[this.color]})`;
    const hints = {
      recent: "Your last 20 picks.",
      saved: "Right-click any icon or emoji to save it here. Hover to remove.",
      emoji: "Right-click to add to Saved.",
      icons: "Pick a color with the dot first. Right-click to add to Saved.",
    };
    this.footer.setText(hints[this.tab]);
    this.renderGrid();
  }

  section(title) {
    if (title) this.body.createDiv({ cls: "nk-picker-heading", text: title });
    return this.body.createDiv({ cls: "nk-picker-grid" });
  }

  empty(text) {
    this.body.createDiv({ cls: "nk-picker-empty", text });
  }

  renderGrid() {
    const body = this.body;
    body.empty();
    body.scrollTop = 0;
    this.pending = null;
    const q = this.query;
    const s = this.plugin.settings;

    if (this.tab === "recent" || this.tab === "saved") {
      const all = this.tab === "recent" ? s.recentIcons.slice(0, RECENT_LIMIT) : s.savedIcons;
      const list = all.filter((v) => !q || this.wordsFor(v).toLowerCase().includes(q));
      if (!all.length) return this.empty(this.tab === "recent" ? "Icons you pick will show up here." : "No saved icons yet. Right-click any icon or emoji in the other tabs and choose “Add to Saved”.");
      if (!list.length) return this.empty("No results");
      const grid = this.section(null);
      for (const v of list) this.valueCell(grid, v, this.tab === "saved");
      return;
    }

    if (this.tab === "emoji") {
      const list = this.allEmoji().filter((e) => !q || e.words.includes(q) || e.group.toLowerCase().includes(q));
      if (!list.length) return this.empty("No results");
      let current = null, grid = null;
      for (const e of list) {
        const heading = q ? "Results" : e.group;
        if (heading !== current) { current = heading; grid = this.section(heading); }
        this.valueCell(grid, e.char, false, e.words);
      }
      return;
    }

    const list = this.allIcons().filter((n) => !q || n.includes(q.replace(/\s+/g, "-")));
    if (!list.length) return this.empty("No results");
    // ~1,500 icons: draw them in batches as you scroll
    this.pending = { list, grid: this.section(q ? "Results" : "Icons"), i: 0 };
    this.renderMore(300);
  }

  renderMore(n) {
    const p = this.pending;
    if (!p) return;
    const end = Math.min(p.i + n, p.list.length);
    for (; p.i < end; p.i++) this.valueCell(p.grid, this.iconValue(p.list[p.i]), false, p.list[p.i]);
    if (p.i >= p.list.length) this.pending = null;
  }

  maybeRenderMore() {
    const b = this.body;
    if (this.pending && b.scrollTop + b.clientHeight > b.scrollHeight - 300) this.renderMore(300);
  }

  /** One grid cell for a stored value: emoji, "name:color", or Notion "icons/name_color". */
  valueCell(grid, value, removable, label) {
    const cell = grid.createDiv({ cls: "nk-picker-cell", attr: { "aria-label": label || this.wordsFor(value) || value } });
    if (isEmoji(value)) { cell.addClass("nk-picker-emoji"); cell.setText(value); }
    else renderIconValue(cell, value);
    cell.onclick = () => this.save(value, true);
    cell.oncontextmenu = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const saved = this.plugin.settings.savedIcons.includes(value);
      const menu = new obsidian.Menu();
      menu.addItem((i) =>
        i.setTitle(saved ? "Remove from Saved" : "Add to Saved").setIcon(saved ? "bookmark-minus" : "bookmark-plus")
          .onClick(() => (saved ? this.unsave(value) : this.addSaved(value)))
      );
      menu.addItem((i) => i.setTitle("Use this icon").setIcon("check").onClick(() => this.save(value, true)));
      menu.showAtMouseEvent(ev);
    };
    if (removable) {
      const x = cell.createDiv({ cls: "nk-picker-x", attr: { "aria-label": "Remove from Saved" } });
      setIconSafe(x, ["x"]);
      x.onclick = (ev) => { ev.stopPropagation(); this.unsave(value); };
    } else if (this.plugin.settings.savedIcons.includes(value)) {
      cell.addClass("is-saved");
    }
  }

  async addSaved(value) {
    const s = this.plugin.settings;
    if (!s.savedIcons.includes(value)) s.savedIcons.push(value);
    await this.plugin.saveData(s);
    new obsidian.Notice("Added to Saved icons");
    if (this.el) this.renderGrid();
  }

  async unsave(value) {
    const s = this.plugin.settings;
    s.savedIcons = s.savedIcons.filter((v) => v !== value);
    await this.plugin.saveData(s);
    if (this.el) this.renderGrid();
  }

  async save(value, manual) {
    const key = this.iconKey;
    if (this.target) await this.target.write(value);
    else
      await this.app.fileManager.processFrontMatter(this.file, (fm) => {
        if (value === null) delete fm[key];
        else fm[key] = value;
      });
    if (value && manual) {
      const s = this.plugin.settings;
      s.recentIcons = [value, ...s.recentIcons.filter((v) => v !== value)].slice(0, RECENT_LIMIT);
      await this.plugin.saveData(s);
    }
    this.close();
  }
}

// ---------- big icon above the note title ----------

class NoteIconHeader {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.refreshSoon = obsidian.debounce(() => this.refreshAll(), 50, true);
  }

  load() {
    const p = this.plugin;
    p.registerEvent(this.app.workspace.on("layout-change", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("file-open", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshSoon()));
    p.registerEvent(this.app.metadataCache.on("changed", () => this.refreshSoon()));
    // Reading view re-renders its header; re-attach when that happens
    this.observer = new MutationObserver(() => this.refreshSoon());
    this.app.workspace.onLayoutReady(() => this.refreshAll());
  }

  unload() {
    if (this.observer) this.observer.disconnect();
    document.querySelectorAll(".nk-note-icon-wrap, .nk-title-header").forEach((e) => e.remove());
    document.querySelectorAll(".nk-hidden-inline-title").forEach((e) => e.removeClass("nk-hidden-inline-title"));
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const t = leaf.tabHeaderInnerTitleEl;
      if (t && leaf.view && leaf.view.file) t.setText(leaf.view.file.basename);
    }
  }

  refreshAll() {
    if (this.observer) this.observer.disconnect();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!view || !view.file || !view.containerEl) continue;
      this.renderInView(view);
      // the tab shows the display title too (Obsidian resets it on rename; this runs again after)
      const tab = leaf.tabHeaderInnerTitleEl;
      const want = displayTitle(view.file, this.app);
      if (tab && tab.textContent !== want) tab.setText(want);
      // watch only the header level (not the note text) so typing doesn't trigger work
      if (this.observer) {
        view.containerEl.querySelectorAll(".markdown-preview-sizer, .cm-sizer").forEach((h) => this.observer.observe(h, { childList: true }));
      }
    }
  }

  renderInView(view) {
    const file = view.file;
    const fm = (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {};
    const value = asString(fm.icon);
    // one slot per mode container (editing + reading)
    const hosts = view.containerEl.querySelectorAll(".markdown-source-view .cm-sizer, .markdown-preview-view .markdown-preview-sizer");
    hosts.forEach((host) => {
      let wrap = host.querySelector(":scope > .nk-note-icon-wrap, :scope > .mod-header > .nk-note-icon-wrap");
      const title = host.querySelector(":scope > .inline-title, :scope > .mod-header > .inline-title");
      const anchorParent = title ? title.parentElement : host;
      if (!wrap || wrap.parentElement !== anchorParent) {
        if (wrap) wrap.remove();
        wrap = createDiv({ cls: "nk-note-icon-wrap" });
        anchorParent.insertBefore(wrap, title || anchorParent.firstChild);
      }
      this.renderTitle(view, host, title, fm);
      if (wrap.dataset.value === value && wrap.dataset.path === file.path && wrap.childElementCount) return;
      wrap.dataset.value = value;
      wrap.dataset.path = file.path;
      wrap.empty();
      if (value) {
        const big = wrap.createDiv({ cls: "nk-note-icon", attr: { "aria-label": "Change icon" } });
        renderIconValue(big, value);
        big.onclick = (ev) => { ev.preventDefault(); this.plugin.openIconPicker(file, "icon", big); };
      } else {
        const add = wrap.createDiv({ cls: "nk-note-icon-add" });
        setIconSafe(add.createSpan(), ["smile-plus", "smile"]);
        add.createSpan({ text: "Add icon" });
        add.onclick = (ev) => { ev.preventDefault(); this.plugin.openIconPicker(file, "icon", add); };
      }
    });
  }

  // Notes with a `title` property get a Notion-style title in place of Obsidian's inline title
  // (which shows, and renames, the file). Editing it changes the title; the file follows when it can.
  renderTitle(view, host, native, fm) {
    let el = host.querySelector(":scope > .nk-title-header, :scope > .mod-header > .nk-title-header");
    const on = native && Object.prototype.hasOwnProperty.call(fm, TITLE_KEY);
    if (!on) {
      if (el) el.remove();
      if (native) native.removeClass("nk-hidden-inline-title");
      return;
    }
    native.addClass("nk-hidden-inline-title");
    if (!el || el.previousElementSibling !== native) {
      if (el) el.remove();
      el = createDiv({ cls: "nk-title-header", attr: { contenteditable: "plaintext-only", spellcheck: "false", "data-placeholder": "Untitled" } });
      native.insertAdjacentElement("afterend", el);
      this.wireTitle(view, el);
    }
    if (el.dataset.editing === "1") return;
    const text = titleOf(fm) || (fm[TITLE_KEY] === "" || fm[TITLE_KEY] === null ? "" : view.file.basename);
    if (el.textContent !== text) el.textContent = text;
    if (this.plugin.focusTitlePath === view.file.path && host.closest(".markdown-source-view") && host.isShown()) {
      this.plugin.focusTitlePath = null;
      window.setTimeout(() => {
        el.focus();
        const sel = window.getSelection();
        if (sel) { const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r); }
      }, 0);
    }
  }

  wireTitle(view, el) {
    let original = "";
    el.addEventListener("focus", () => { el.dataset.editing = "1"; original = el.textContent; });
    el.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === "Escape") {
        ev.preventDefault();
        if (ev.key === "Escape") el.textContent = original;
        el.blur();
        if (view.editor && view.getMode && view.getMode() === "source") view.editor.focus();
      }
    });
    el.addEventListener("paste", (ev) => {
      // keep it one line of plain text
      ev.preventDefault();
      const text = ((ev.clipboardData && ev.clipboardData.getData("text/plain")) || "").replace(/\s+/g, " ");
      document.execCommand("insertText", false, text);
    });
    el.addEventListener("blur", async () => {
      delete el.dataset.editing;
      const text = el.textContent.replace(/\s+/g, " ").trim();
      if (text !== original.replace(/\s+/g, " ").trim() && view.file) await this.plugin.setDisplayTitle(view.file, text);
      this.refreshSoon();
    });
  }
}

// ---------- Notion titles for imported notes ----------

// Previews, then applies, the real Notion page titles to imported notes whose file names differ
// (numbered duplicates, "/" turned into "-", dropped date mentions). The titles come from
// notion-titles.json in the plugin folder: { "<notion page id>": "<title>" }.
class NotionTitlesModal extends obsidian.Modal {
  constructor(plugin, plan) {
    super(plugin.app);
    this.plugin = plugin;
    this.plan = plan;
    this.fixLinks = true;
  }
  onOpen() {
    const { contentEl, plan } = this;
    this.modalEl.addClass("nk-titles-modal");
    this.titleEl.setText("Use Notion page titles");
    contentEl.createEl("p", {
      text: `${plan.notes.length} imported notes have a file name that differs from their Notion title. ` +
        "Each gets a title property with the Notion title, which the board, links, tabs and note header show. File names don't change.",
    });
    const list = contentEl.createDiv({ cls: "nk-titles-list" });
    for (const n of plan.notes) {
      const row = list.createDiv({ cls: "nk-titles-row" });
      row.createSpan({ cls: "nk-titles-old", text: n.file.path.replace(/\.md$/, "") });
      row.createSpan({ cls: "nk-titles-arrow", text: "→" });
      row.createSpan({ cls: "nk-titles-new", text: n.title });
    }
    new obsidian.Setting(contentEl)
      .setName("Also update link labels")
      .setDesc(`Relabel ${plan.links} links in ${plan.sources} notes (e.g. Sub-task and Parent task) that show the old file name.`)
      .addToggle((t) => t.setValue(true).onChange((v) => { this.fixLinks = v; }));
    const row = contentEl.createDiv({ cls: "modal-button-container" });
    const ok = row.createEl("button", { cls: "mod-cta", text: `Apply to ${plan.notes.length} notes` });
    ok.onclick = async () => {
      ok.disabled = true;
      this.close();
      await this.plugin.applyNotionTitles(plan, this.fixLinks);
    };
    row.createEl("button", { text: "Cancel" }).onclick = () => this.close();
  }
  onClose() { this.contentEl.empty(); }
}

// ---------- Notion-style property options (select / multi-select) ----------

const OPTION_COLORS = ["default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
const COLOR_LABELS = {
  default: "Default", gray: "Gray", brown: "Brown", orange: "Orange", yellow: "Yellow",
  green: "Green", blue: "Blue", purple: "Purple", pink: "Pink", red: "Red",
};

function sameText(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

// Option lists, colors and icons for properties, shared by every note and board in the vault.
// Stored in data.json as settings.properties = { Tag: { type: "multi", options: [{ name, color }] } }
// and settings.propertyIcons = { Tag: "tag:gray" }.
class PropertySchemas {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  get all() {
    const s = this.plugin.settings;
    if (!s.properties || typeof s.properties !== "object") s.properties = {};
    return s.properties;
  }

  get icons() {
    const s = this.plugin.settings;
    if (!s.propertyIcons || typeof s.propertyIcons !== "object") s.propertyIcons = {};
    return s.propertyIcons;
  }

  keyOf(name) {
    if (!name) return null;
    if (this.all[name]) return name;
    return Object.keys(this.all).find((k) => sameText(k, name)) || null;
  }

  find(name) {
    const k = this.keyOf(name);
    return k ? this.all[k] : null;
  }

  isManaged(name) {
    const p = this.find(name);
    return !!(p && (p.type === "select" || p.type === "multi"));
  }

  option(prop, value) {
    const p = this.find(prop);
    return p && Array.isArray(p.options) ? p.options.find((o) => sameText(o.name, value)) || null : null;
  }

  colorOf(prop, value) {
    const o = prop ? this.option(prop, value) : null;
    return o ? o.color || "default" : null;
  }

  get visibility() {
    const s = this.plugin.settings;
    if (!s.propertyVisibility || typeof s.propertyVisibility !== "object") s.propertyVisibility = {};
    return s.propertyVisibility;
  }

  // "always" (default), "hide_if_empty" or "hide"
  visibilityOf(prop) {
    if (!prop) return "always";
    const k = Object.keys(this.visibility).find((n) => sameText(n, prop));
    // the title shows in the note header, so its property row is hidden unless chosen otherwise
    return (k && this.visibility[k]) || (sameText(prop, TITLE_KEY) ? "hide" : "always");
  }

  async setVisibility(prop, mode) {
    const k = Object.keys(this.visibility).find((n) => sameText(n, prop)) || prop;
    if (!mode || mode === "always") delete this.visibility[k];
    else this.visibility[k] = mode;
    await this.save();
  }

  iconOf(prop) {
    if (!prop) return "";
    const k = Object.keys(this.icons).find((n) => sameText(n, prop));
    return k ? this.icons[k] : "";
  }

  async setIcon(prop, value) {
    const k = Object.keys(this.icons).find((n) => sameText(n, prop)) || prop;
    if (value) this.icons[k] = value;
    else delete this.icons[k];
    await this.save();
  }

  // Turn a property into a select / multi-select, seeding options from values already in the vault.
  async manage(prop, type) {
    const k = this.keyOf(prop) || prop;
    const existing = this.all[k];
    if (existing) existing.type = type;
    else {
      const options = [];
      for (const v of this.valuesInVault(prop)) options.push({ name: v, color: OPTION_COLORS[(options.length % 9) + 1] });
      this.all[k] = { type, options };
    }
    await this.save();
  }

  async unmanage(prop) {
    const k = this.keyOf(prop);
    if (k) delete this.all[k];
    await this.save();
  }

  addOption(prop, name, color) {
    const p = this.find(prop);
    if (!p) return null;
    if (!Array.isArray(p.options)) p.options = [];
    let o = p.options.find((x) => sameText(x.name, name));
    if (!o) {
      o = { name: String(name), color: color || OPTION_COLORS[1 + Math.floor(Math.random() * 9)] };
      p.options.push(o);
    }
    return o;
  }

  async save() {
    await this.plugin.saveData(this.plugin.settings);
    this.plugin.schemaChanged();
  }

  // frontmatter key on a note that matches `prop` (property names are case-insensitive in Obsidian)
  fmKey(fm, prop) {
    if (!fm) return null;
    if (prop in fm) return prop;
    return Object.keys(fm).find((k) => sameText(k, prop)) || null;
  }

  *notesWith(prop) {
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
      const k = this.fmKey(fm, prop);
      if (k) yield { file, key: k, values: asList(fm[k]).map(asString).filter(Boolean) };
    }
  }

  valuesInVault(prop) {
    const seen = new Map();
    for (const n of this.notesWith(prop)) for (const v of n.values) if (!seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }

  usage(prop, name) {
    let n = 0;
    for (const x of this.notesWith(prop)) if (x.values.some((v) => sameText(v, name))) n++;
    return n;
  }

  // Rename (newName) or remove (newName === null) a value on every note that has it.
  async rewriteValue(prop, oldName, newName) {
    const targets = [...this.notesWith(prop)].filter((x) => x.values.some((v) => sameText(v, oldName)));
    for (const t of targets) {
      await this.app.fileManager.processFrontMatter(t.file, (fm) => {
        const k = this.fmKey(fm, prop);
        if (!k) return;
        const cur = fm[k];
        if (Array.isArray(cur)) {
          const out = [];
          for (const v of cur) {
            if (sameText(asString(v), oldName)) {
              if (newName !== null && !out.some((x) => sameText(x, newName))) out.push(newName);
            } else out.push(v);
          }
          fm[k] = out;
        } else if (sameText(asString(cur), oldName)) {
          fm[k] = newName === null ? "" : newName;
        }
      });
    }
    return targets.length;
  }

  async renameOption(prop, oldName, newName) {
    newName = String(newName).trim();
    const o = this.option(prop, oldName);
    if (!o || !newName || newName === o.name) return 0;
    const dup = this.option(prop, newName);
    const p = this.find(prop);
    if (dup && dup !== o) p.options = p.options.filter((x) => x !== o); // merging into an existing option
    else o.name = newName;
    await this.save();
    return this.rewriteValue(prop, oldName, dup && dup !== o ? dup.name : newName);
  }

  async deleteOption(prop, name) {
    const p = this.find(prop);
    if (!p) return 0;
    p.options = (p.options || []).filter((o) => !sameText(o.name, name));
    await this.save();
    return this.rewriteValue(prop, name, null);
  }
}

class ConfirmModal extends obsidian.Modal {
  constructor(app, title, body, cta, onConfirm) {
    super(app);
    this.titleText = title;
    this.bodyText = body;
    this.cta = cta;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.titleEl.setText(this.titleText);
    this.contentEl.createEl("p", { text: this.bodyText });
    const row = this.contentEl.createDiv({ cls: "modal-button-container" });
    const ok = row.createEl("button", { cls: "mod-warning", text: this.cta });
    ok.onclick = () => { this.close(); this.onConfirm(); };
    const cancel = row.createEl("button", { text: "Cancel" });
    cancel.onclick = () => this.close();
  }
  onClose() { this.contentEl.empty(); }
}

function renderOptionPill(parent, name, color, extraCls) {
  const pill = parent.createSpan({ cls: "nk-pill" + (extraCls ? " " + extraCls : ""), text: name });
  pill.style.setProperty("--nk-rgb", rgbFor(color || "default"));
  return pill;
}

// The dropdown you get when clicking a select / multi-select property, like Notion's.
class OptionsPopover {
  constructor(plugin, file, prop, anchorEl) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.schemas = plugin.schemas;
    this.file = file;
    this.prop = prop;
    this.anchorEl = anchorEl;
    this.query = "";
    this.active = 0;
    this.menu = null;
  }

  get schema() { return this.schemas.find(this.prop) || { type: "multi", options: [] }; }
  get multi() { return this.schema.type === "multi"; }

  readValues() {
    const fm = (this.app.metadataCache.getFileCache(this.file) || {}).frontmatter || {};
    const k = this.schemas.fmKey(fm, this.prop);
    return k ? asList(fm[k]).map(asString).filter(Boolean) : [];
  }

  async writeValues(values) {
    await this.app.fileManager.processFrontMatter(this.file, (fm) => {
      const k = this.schemas.fmKey(fm, this.prop) || this.prop;
      const wasList = Array.isArray(fm[k]);
      if (this.multi) fm[k] = values;
      else if (!values.length) fm[k] = wasList ? [] : "";
      else fm[k] = wasList ? [values[0]] : values[0];
    });
    this.values = values;
    this.render();
  }

  open() {
    this.values = this.readValues();
    const el = (this.el = document.body.createDiv({ cls: "nk-options" }));
    this.top = el.createDiv({ cls: "nk-options-top" });
    this.hint = el.createDiv({ cls: "nk-options-hint" });
    this.list = el.createDiv({ cls: "nk-options-list" });

    this.onDocDown = (ev) => {
      if (el.contains(ev.target) || (this.menu && this.menu.contains(ev.target)) || ev.target.closest(".modal-container, .menu")) return;
      this.close();
    };
    this.onKey = (ev) => this.handleKey(ev);
    window.setTimeout(() => {
      document.addEventListener("mousedown", this.onDocDown, true);
      document.addEventListener("keydown", this.onKey, true);
    }, 0);
    this.render();
    this.position();
    this.input.focus();
  }

  position() {
    const el = this.el;
    const pad = 8, w = 300;
    const h = Math.min(el.offsetHeight || 360, 420);
    const r = this.anchorEl && this.anchorEl.isConnected ? this.anchorEl.getBoundingClientRect() : null;
    let x = r ? r.left : (window.innerWidth - w) / 2;
    let y = r ? r.top : window.innerHeight / 3;
    x = Math.max(pad, Math.min(x, window.innerWidth - w - pad));
    if (y + h > window.innerHeight - pad) y = Math.max(pad, window.innerHeight - h - pad);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  close() {
    this.closeMenu();
    document.removeEventListener("mousedown", this.onDocDown, true);
    document.removeEventListener("keydown", this.onKey, true);
    if (this.el) this.el.remove();
    this.el = null;
    if (this.plugin.activeOptions === this) this.plugin.activeOptions = null;
    if (this.plugin.propertyPanel) this.plugin.propertyPanel.refreshSoon();
  }

  // rows the keyboard can move through: matching options, then "Create …"
  rows() {
    const q = this.query.trim();
    const opts = (this.schema.options || []).filter((o) => !q || o.name.toLowerCase().includes(q.toLowerCase()));
    const rows = opts.map((o) => ({ kind: "option", option: o }));
    if (q && !(this.schema.options || []).some((o) => sameText(o.name, q))) rows.push({ kind: "create", name: q });
    return rows;
  }

  render() {
    if (!this.el) return;
    const colorOf = (v) => this.schemas.colorOf(this.prop, v) || "default";

    // selected values + search box
    const hadFocus = this.input && document.activeElement === this.input;
    this.top.empty();
    for (const v of this.values) {
      const pill = renderOptionPill(this.top, v, colorOf(v), "is-removable");
      const x = pill.createSpan({ cls: "nk-pill-x", attr: { "aria-label": "Remove" } });
      setIconSafe(x, ["x"]);
      x.onclick = (ev) => { ev.stopPropagation(); this.writeValues(this.values.filter((y) => y !== v)); };
    }
    this.input = this.top.createEl("input", {
      cls: "nk-options-input",
      attr: { type: "text", placeholder: this.values.length ? "" : "Search for an option…", spellcheck: "false" },
    });
    this.input.value = this.query;
    this.input.oninput = () => { this.query = this.input.value; this.active = 0; this.renderList(); };
    this.top.onclick = () => this.input.focus();
    if (hadFocus) this.input.focus();

    this.hint.setText(this.multi ? "Select options or create one" : "Select an option or create one");
    this.renderList();
  }

  renderList() {
    this.list.empty();
    const rows = this.rows();
    if (this.active >= rows.length) this.active = Math.max(0, rows.length - 1);
    rows.forEach((row, i) => {
      const r = this.list.createDiv({ cls: "nk-options-row" + (i === this.active ? " is-active" : "") });
      r.onmouseenter = () => { this.active = i; this.list.querySelectorAll(".nk-options-row").forEach((e, j) => e.toggleClass("is-active", j === i)); };
      r.onclick = () => this.choose(row);
      if (row.kind === "create") {
        r.createSpan({ cls: "nk-options-create", text: "Create" });
        renderOptionPill(r, row.name, "default");
        return;
      }
      const o = row.option;
      const handle = r.createSpan({ cls: "nk-options-handle", attr: { draggable: "true", "aria-label": "Drag to reorder" } });
      setIconSafe(handle, ["grip-vertical"]);
      renderOptionPill(r, o.name, o.color);
      if (this.values.some((v) => sameText(v, o.name))) {
        const chk = r.createSpan({ cls: "nk-options-check" });
        setIconSafe(chk, ["check"]);
      }
      r.createSpan({ cls: "nk-options-spacer" });
      const more = r.createSpan({ cls: "nk-options-more", attr: { "aria-label": "Edit option" } });
      setIconSafe(more, ["more-horizontal", "ellipsis"]);
      more.onclick = (ev) => { ev.stopPropagation(); this.openMenu(o, more); };

      // drag to reorder (only meaningful when the list isn't filtered)
      handle.addEventListener("dragstart", (ev) => { this.dragName = o.name; ev.dataTransfer.effectAllowed = "move"; ev.dataTransfer.setData("text/plain", o.name); r.addClass("is-dragging"); });
      handle.addEventListener("dragend", () => { this.dragName = null; r.removeClass("is-dragging"); });
      r.addEventListener("dragover", (ev) => { if (this.dragName) { ev.preventDefault(); r.addClass("is-drop-target"); } });
      r.addEventListener("dragleave", () => r.removeClass("is-drop-target"));
      r.addEventListener("drop", async (ev) => {
        ev.preventDefault();
        r.removeClass("is-drop-target");
        const from = this.dragName;
        this.dragName = null;
        if (!from || sameText(from, o.name)) return;
        const opts = this.schema.options;
        const fi = opts.findIndex((x) => sameText(x.name, from));
        if (fi < 0) return;
        const [moved] = opts.splice(fi, 1);
        const ti = opts.findIndex((x) => sameText(x.name, o.name));
        const rect = r.getBoundingClientRect();
        opts.splice(ev.clientY > rect.top + rect.height / 2 ? ti + 1 : ti, 0, moved);
        await this.schemas.save();
        this.renderList();
      });
    });
    if (!rows.length) this.list.createDiv({ cls: "nk-options-empty", text: "No options yet. Type to create one." });
  }

  async choose(row) {
    let name;
    if (row.kind === "create") {
      const o = this.schemas.addOption(this.prop, row.name.trim());
      await this.schemas.save();
      name = o.name;
    } else name = row.option.name;
    this.query = "";
    if (this.input) this.input.value = "";
    const has = this.values.some((v) => sameText(v, name));
    if (this.multi) await this.writeValues(has ? this.values.filter((v) => !sameText(v, name)) : [...this.values, name]);
    else {
      await this.writeValues(has ? [] : [name]);
      this.close();
    }
  }

  handleKey(ev) {
    if (!this.el) return;
    if (this.menu) {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); this.closeMenu(); }
      return;
    }
    if (document.activeElement !== this.input && ev.key !== "Escape") return;
    const rows = this.rows();
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); this.close(); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); this.active = Math.min(rows.length - 1, this.active + 1); this.renderList(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); this.active = Math.max(0, this.active - 1); this.renderList(); }
    else if (ev.key === "Enter") { ev.preventDefault(); if (rows[this.active]) this.choose(rows[this.active]); }
    else if (ev.key === "Backspace" && !this.input.value && this.values.length) {
      ev.preventDefault();
      this.writeValues(this.values.slice(0, -1));
    }
  }

  // "…" menu on an option: rename, delete, color
  openMenu(option, anchor) {
    this.closeMenu();
    const m = (this.menu = document.body.createDiv({ cls: "nk-options-menu" }));
    const input = m.createEl("input", { cls: "nk-options-rename", attr: { type: "text", spellcheck: "false" } });
    input.value = option.name;
    const commitRename = async () => {
      const next = input.value.trim();
      if (!next || next === option.name) return;
      const old = option.name;
      const n = await this.schemas.renameOption(this.prop, old, next);
      this.values = this.values.map((v) => (sameText(v, old) ? next : v));
      if (n) new obsidian.Notice(`Renamed "${old}" to "${next}" on ${n} note${n === 1 ? "" : "s"}.`);
      this.render();
    };
    input.onkeydown = (ev) => { if (ev.key === "Enter") { ev.preventDefault(); commitRename().then(() => this.closeMenu()); } };
    input.onblur = () => commitRename();

    const del = m.createDiv({ cls: "nk-options-menu-item" });
    setIconSafe(del.createSpan({ cls: "nk-options-menu-icon" }), ["trash-2", "trash"]);
    del.createSpan({ text: "Delete" });
    del.onclick = () => {
      const n = this.schemas.usage(this.prop, option.name);
      this.closeMenu();
      const run = async () => {
        const changed = await this.schemas.deleteOption(this.prop, option.name);
        this.values = this.values.filter((v) => !sameText(v, option.name));
        if (changed) new obsidian.Notice(`Removed "${option.name}" from ${changed} note${changed === 1 ? "" : "s"}.`);
        this.render();
      };
      if (!n) run();
      else new ConfirmModal(this.app, `Delete "${option.name}"?`, `This option will be removed from ${n} note${n === 1 ? "" : "s"}.`, "Delete", run).open();
    };

    m.createDiv({ cls: "nk-options-menu-heading", text: "Colors" });
    for (const c of OPTION_COLORS) {
      const row = m.createDiv({ cls: "nk-options-menu-item" });
      const sw = row.createSpan({ cls: "nk-options-swatch" });
      sw.style.setProperty("--nk-rgb", rgbFor(c));
      row.createSpan({ text: COLOR_LABELS[c] });
      if ((option.color || "default") === c) setIconSafe(row.createSpan({ cls: "nk-options-menu-check" }), ["check"]);
      row.onclick = async () => {
        option.color = c;
        await this.schemas.save();
        this.closeMenu();
        this.render();
      };
    }

    const r = anchor.getBoundingClientRect();
    const w = 220, pad = 8;
    let x = r.right + 6, y = r.top - 8;
    if (x + w > window.innerWidth - pad) x = Math.max(pad, r.left - w - 6);
    m.style.left = `${x}px`;
    m.style.top = `${y}px`;
    const h = m.offsetHeight;
    if (y + h > window.innerHeight - pad) m.style.top = `${Math.max(pad, window.innerHeight - h - pad)}px`;
    input.focus();
    input.select();
  }

  closeMenu() {
    if (this.menu) this.menu.remove();
    this.menu = null;
  }
}

// Decorates Obsidian's Properties panel: colored pills + Notion dropdown for select properties,
// and custom icons for any property.
class PropertyPanel {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.schemas = plugin.schemas;
    this.refreshSoon = obsidian.debounce(() => this.refreshAll(), 40, true);
    this.expanded = new Set(); // notes whose hidden properties are currently shown
  }

  load() {
    const p = this.plugin;
    p.registerEvent(this.app.workspace.on("layout-change", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("file-open", () => this.refreshSoon()));
    // a property being edited stays visible until you click away from it
    p.registerDomEvent(document, "focusout", () => window.setTimeout(() => this.refreshSoon(), 0));
    p.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshSoon()));
    p.registerEvent(this.app.metadataCache.on("changed", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("nk:schema-changed", () => this.refreshSoon()));
    // The properties list re-renders when you edit it; re-apply then.
    this.observer = new MutationObserver(() => this.refreshSoon());
    // Right-click a property's icon to give it a custom icon.
    p.registerDomEvent(document, "contextmenu", (ev) => {
      const iconEl = ev.target.closest && ev.target.closest(".metadata-property-icon");
      if (!iconEl) return;
      const propEl = iconEl.closest(".metadata-property[data-property-key]");
      if (!propEl) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.propertyMenu(propEl.dataset.propertyKey, iconEl, ev);
    }, true);
    this.app.workspace.onLayoutReady(() => this.refreshAll());
  }

  unload() {
    if (this.observer) this.observer.disconnect();
    document.querySelectorAll(".nk-select-value, .nk-prop-icon, .nk-hidden-toggle").forEach((e) => e.remove());
    document.querySelectorAll(".nk-prop-hidden").forEach((e) => e.removeClass("nk-prop-hidden"));
    document.querySelectorAll(".nk-show-hidden").forEach((e) => e.removeClass("nk-show-hidden"));
    document.querySelectorAll(".nk-managed, .nk-has-icon").forEach((e) => e.removeClass("nk-managed", "nk-has-icon"));
  }

  propertyMenu(prop, iconEl, ev) {
    const menu = new obsidian.Menu();
    menu.addItem((i) => i.setTitle("Change icon").setIcon("smile-plus").onClick(() => this.pickIcon(prop, iconEl)));
    if (this.schemas.iconOf(prop)) menu.addItem((i) => i.setTitle("Remove icon").setIcon("x").onClick(() => this.schemas.setIcon(prop, null)));
    menu.addSeparator();
    const vis = this.schemas.visibilityOf(prop);
    for (const [mode, title, icon] of [["always", "Always show", "eye"], ["hide_if_empty", "Hide when empty", "eye-off"], ["hide", "Always hide", "eye-off"]]) {
      menu.addItem((i) => i.setTitle(title).setIcon(icon).setChecked(vis === mode).onClick(() => this.schemas.setVisibility(prop, mode)));
    }
    menu.addSeparator();
    const cur = this.schemas.find(prop);
    const kind = cur ? cur.type : "";
    menu.addItem((i) => i.setTitle("Notion-style select").setChecked(kind === "select").onClick(() => this.schemas.manage(prop, "select")));
    menu.addItem((i) => i.setTitle("Notion-style multi-select").setChecked(kind === "multi").onClick(() => this.schemas.manage(prop, "multi")));
    if (cur) menu.addItem((i) => i.setTitle("Plain Obsidian property").setChecked(false).onClick(() => this.schemas.unmanage(prop)));
    menu.showAtMouseEvent(ev);
  }

  pickIcon(prop, anchorEl) {
    this.plugin.openIconPicker({
      current: this.schemas.iconOf(prop),
      write: (value) => this.schemas.setIcon(prop, value),
    }, "icon", anchorEl);
  }

  refreshAll() {
    if (this.observer) this.observer.disconnect();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!view || !view.file || !view.containerEl) continue;
      view.containerEl.querySelectorAll(".metadata-container").forEach((box) => {
        box.querySelectorAll(".metadata-property[data-property-key]").forEach((el) => this.decorate(el, view.file));
        this.renderHiddenToggle(box, view.file);
      });
      if (this.observer) view.containerEl.querySelectorAll(".metadata-properties").forEach((h) => this.observer.observe(h, { childList: true, subtree: true }));
    }
  }

  isEmpty(v) {
    if (v === undefined || v === null) return true;
    if (Array.isArray(v)) return v.every((x) => this.isEmpty(x));
    return typeof v === "string" && v.trim() === "";
  }

  renderHiddenToggle(box, file) {
    const hidden = box.querySelectorAll(".metadata-property.nk-prop-hidden").length;
    const open = this.expanded.has(file.path);
    box.toggleClass("nk-show-hidden", open);
    const list = box.querySelector(".metadata-properties");
    let t = box.querySelector(".nk-hidden-toggle");
    if (!hidden || !list) { if (t) t.remove(); return; }
    const label = open ? `Hide ${hidden} propert${hidden === 1 ? "y" : "ies"}` : `${hidden} more propert${hidden === 1 ? "y" : "ies"}`;
    if (t && t.dataset.label === label && t.previousElementSibling === list) return;
    if (t) t.remove();
    t = createDiv({ cls: "nk-hidden-toggle" });
    list.insertAdjacentElement("afterend", t);
    t.dataset.label = label;
    setIconSafe(t.createSpan({ cls: "nk-hidden-toggle-icon" }), [open ? "chevron-up" : "chevron-down"]);
    t.createSpan({ text: label });
    t.onclick = (ev) => {
      ev.preventDefault();
      if (this.expanded.has(file.path)) this.expanded.delete(file.path);
      else this.expanded.add(file.path);
      this.refreshAll();
    };
  }

  decorate(propEl, file) {
    const prop = propEl.dataset.propertyKey;
    if (!prop) return;

    // visibility (Notion's "Always show" / "Hide when empty" / "Always hide")
    const mode = this.schemas.visibilityOf(prop);
    let hide = false;
    if (mode === "hide") hide = true;
    else if (mode === "hide_if_empty") {
      const fm0 = (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {};
      const k0 = this.schemas.fmKey(fm0, prop);
      hide = this.isEmpty(k0 ? fm0[k0] : undefined);
    }
    if (hide && (propEl.contains(document.activeElement) || (this.plugin.activeOptions && this.plugin.activeOptions.prop === prop))) hide = false;
    if (propEl.hasClass("nk-prop-hidden") !== hide) propEl.toggleClass("nk-prop-hidden", hide);

    // icon
    const iconBox = propEl.querySelector(".metadata-property-icon");
    const iconVal = this.schemas.iconOf(prop);
    if (iconBox) {
      let mine = iconBox.querySelector(":scope > .nk-prop-icon");
      if (iconVal) {
        if (!mine || mine.dataset.value !== iconVal) {
          if (mine) mine.remove();
          mine = iconBox.createSpan({ cls: "nk-prop-icon" });
          mine.dataset.value = iconVal;
          renderIconValue(mine, iconVal);
        }
        if (!iconBox.hasClass("nk-has-icon")) iconBox.addClass("nk-has-icon");
      } else {
        if (mine) mine.remove();
        if (iconBox.hasClass("nk-has-icon")) iconBox.removeClass("nk-has-icon");
      }
    }

    // select / multi-select values
    const valueEl = propEl.querySelector(".metadata-property-value");
    if (!valueEl) return;
    let box = valueEl.querySelector(":scope > .nk-select-value");
    if (!this.schemas.isManaged(prop)) {
      if (box) box.remove();
      if (propEl.hasClass("nk-managed")) propEl.removeClass("nk-managed");
      return;
    }
    const fm = (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {};
    const k = this.schemas.fmKey(fm, prop);
    const values = k ? asList(fm[k]).map(asString).filter(Boolean) : [];
    const sig = JSON.stringify([file.path, values, values.map((v) => this.schemas.colorOf(prop, v))]);
    if (!propEl.hasClass("nk-managed")) propEl.addClass("nk-managed");
    if (box && box.dataset.sig === sig) return;
    if (!box) {
      box = valueEl.createDiv({ cls: "nk-select-value" });
      box.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const f = this.app.vault.getFileByPath(box.dataset.path);
        if (f) this.plugin.openOptions(f, box.dataset.prop, box);
      };
    }
    box.dataset.sig = sig;
    box.dataset.path = file.path;
    box.dataset.prop = prop;
    box.empty();
    for (const v of values) renderOptionPill(box, v, this.schemas.colorOf(prop, v) || "default");
    if (!values.length) box.createSpan({ cls: "nk-select-empty", text: "Empty" });
  }
}

// ---------- Notion-style view tabs above every base ----------

const VIEW_TYPE_ICONS = { table: "table", cards: "layout-grid", list: "list", kanban: "square-kanban", "notion-kanban": "square-kanban", map: "map" };

class ViewTabsBar {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.refreshSoon = obsidian.debounce(() => this.refreshAll(), 60, true);
    this.viewsCache = new Map(); // base path -> { mtime, views }
  }

  load() {
    const p = this.plugin;
    p.registerEvent(this.app.workspace.on("layout-change", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshSoon()));
    p.registerEvent(this.app.vault.on("modify", (f) => { if (f.extension === "base") { this.viewsCache.delete(f.path); this.refreshSoon(); } }));
    p.registerEvent(this.app.vault.on("rename", () => this.refreshSoon()));
    // Bases redraws its content when the view changes; re-attach / re-highlight then
    this.observer = new MutationObserver(() => this.refreshSoon());
    this.app.workspace.onLayoutReady(() => this.refreshAll());
  }

  unload() {
    if (this.observer) this.observer.disconnect();
    document.querySelectorAll(".nk-view-tabs").forEach((e) => e.remove());
  }

  settings() {
    const s = this.plugin.settings;
    if (!s.viewTabs) s.viewTabs = {};
    return s.viewTabs;
  }

  key(path, name) { return `${path}::${name}`; }

  async getViews(file) {
    const c = this.viewsCache.get(file.path);
    if (c && c.mtime === file.stat.mtime) return c.views;
    let views = [];
    try {
      const data = obsidian.parseYaml(await this.app.vault.cachedRead(file)) || {};
      views = (Array.isArray(data.views) ? data.views : []).filter((v) => v && v.name).map((v) => ({ name: String(v.name), type: String(v.type || "") }));
    } catch (e) { views = []; }
    this.viewsCache.set(file.path, { mtime: file.stat.mtime, views });
    return views;
  }

  async refreshAll() {
    if (this.observer) this.observer.disconnect();
    for (const leaf of this.app.workspace.getLeavesOfType("bases")) {
      try { await this.renderInLeaf(leaf); } catch (e) { console.error("[notion-style-kanban] tabs", e); }
    }
  }

  async renderInLeaf(leaf) {
    const view = leaf.view;
    const content = view && view.containerEl && view.containerEl.querySelector(":scope > .view-content");
    const file = view && view.file;
    if (!content || !file) return;
    const views = await this.getViews(file);
    let state = {};
    try { state = (leaf.getViewState() || {}).state || {}; } catch (e) {}
    const current = state.viewName || (views[0] && views[0].name) || "";
    const conf = this.settings();
    const hidden = new Set((conf[file.path] && conf[file.path].hidden) || []);
    const db = this.plugin.templates ? this.plugin.templates.dbForBase(file) : null;
    const tpls = db ? this.plugin.templates.templates(db).map((t) => [t.name, t.isDefault, !!t.repeat]) : [];
    const sig = JSON.stringify([file.path, current, views, [...hidden], views.map((v) => conf[this.key(file.path, v.name)] || ""), tpls]);

    let bar = content.querySelector(":scope > .nk-view-tabs");
    if (!bar || content.firstElementChild !== bar) {
      if (bar) bar.remove();
      bar = createDiv({ cls: "nk-view-tabs" });
      content.prepend(bar);
      bar.dataset.sig = "";
    }
    if (this.observer) this.observer.observe(content, { childList: true });
    if (bar.dataset.sig === sig) return;
    bar.dataset.sig = sig;
    bar.empty();
    // the tab bar shows with two or more views; the New button always shows
    if (views.length < 2) bar.addClass("nk-view-tabs-only-new"); else bar.removeClass("nk-view-tabs-only-new");
    bar.show();
    this.renderNewButton(bar, db);

    const shown = views.length < 2 ? [] : views.filter((v) => !hidden.has(v.name) || v.name === current);
    for (const v of shown) {
      const tab = bar.createDiv({ cls: "nk-view-tab" + (v.name === current ? " is-active" : "") });
      const ic = tab.createSpan({ cls: "nk-view-tab-icon" });
      const iconVal = conf[this.key(file.path, v.name)];
      if (!(iconVal && renderIconValue(ic, iconVal))) setIconSafe(ic, [VIEW_TYPE_ICONS[v.type] || "layout-list"]);
      tab.createSpan({ cls: "nk-view-tab-name", text: v.name });
      tab.onclick = () => { if (v.name !== current) this.switchTo(leaf, file, v.name); };
      tab.oncontextmenu = (ev) => {
        ev.preventDefault();
        const menu = new obsidian.Menu();
        menu.addItem((i) => i.setTitle("Change icon").setIcon("smile-plus").onClick(() => this.pickIcon(file, v.name, ic)));
        if (v.name !== current)
          menu.addItem((i) => i.setTitle("Hide from tab bar").setIcon("eye-off").onClick(() => this.setHidden(file, v.name, true)));
        menu.showAtMouseEvent(ev);
      };
    }
    const hiddenViews = views.length < 2 ? [] : views.filter((v) => hidden.has(v.name) && v.name !== current);
    if (hiddenViews.length) {
      const more = bar.createDiv({ cls: "nk-view-tab nk-view-tab-more", text: `${hiddenViews.length} more…` });
      more.onclick = (ev) => {
        const menu = new obsidian.Menu();
        for (const v of hiddenViews) {
          menu.addItem((i) => i.setTitle(v.name).setIcon(VIEW_TYPE_ICONS[v.type] || "layout-list").onClick(() => this.switchTo(leaf, file, v.name)));
        }
        menu.addSeparator();
        for (const v of hiddenViews) {
          menu.addItem((i) => i.setTitle(`Show "${v.name}" tab`).setIcon("eye").onClick(() => this.setHidden(file, v.name, false)));
        }
        menu.showAtMouseEvent(ev);
      };
    }
  }

  // Notion's split "New ▾" button: New uses the default template, the arrow lists them all
  renderNewButton(bar, db) {
    if (!db) return;
    const lib = this.plugin.templates;
    const wrap = bar.createDiv({ cls: "nk-new-button" });
    const main = wrap.createEl("button", { cls: "nk-new-main mod-cta", text: "New" });
    const def = lib.defaultTemplate(db);
    main.setAttr("aria-label", def ? `New from "${def.name}"` : "New empty page");
    main.onclick = () => lib.guard(() => lib.newDefault(db));
    const arrow = wrap.createEl("button", { cls: "nk-new-arrow mod-cta", attr: { "aria-label": "Choose a template" } });
    setIconSafe(arrow, ["chevron-down"]);
    arrow.onclick = (ev) => { ev.preventDefault(); lib.showNewMenu(db, wrap); };
    wrap.oncontextmenu = (ev) => { ev.preventDefault(); lib.showNewMenu(db, ev); };
  }

  async switchTo(leaf, file, name) {
    const vs = leaf.getViewState();
    vs.state = Object.assign({}, vs.state || {}, { file: file.path, viewName: name });
    await leaf.setViewState(vs);
    this.refreshSoon();
  }

  async setHidden(file, name, hide) {
    const conf = this.settings();
    const entry = conf[file.path] || (conf[file.path] = { hidden: [] });
    entry.hidden = entry.hidden.filter((n) => n !== name);
    if (hide) entry.hidden.push(name);
    await this.plugin.saveData(this.plugin.settings);
    this.refreshAll();
  }

  pickIcon(file, name, anchorEl) {
    const conf = this.settings();
    const k = this.key(file.path, name);
    this.plugin.openIconPicker({
      current: conf[k] || "",
      write: async (value) => {
        if (value) conf[k] = value; else delete conf[k];
        await this.plugin.saveData(this.plugin.settings);
        this.refreshAll();
      },
    }, "icon", anchorEl);
  }
}

// ---------- Notion-style buttons in notes ----------
//
// A ```notion-button``` code block draws a button. Its body is YAML:
//   label: Add subtask
//   icon: plus
//   confirm: Are you sure?            (optional)
//   steps:                            (or a single top-level `action:`)
//     - action: add-subtask
//       name: Subtask
// "Insert button" (command, or right-click in the editor) picks a ready-made
// button or builds a new one step by step; the gear on a button edits it.
// See docs/notion-buttons.md.

const BUTTON_DEFAULTS = {
  parentProperty: "Parent task",
  subtaskProperty: "Sub-task",
  completedProperty: "Completed Tasks",
  statusProperty: "Status",
};
const BUTTON_KEYS = Object.keys(BUTTON_DEFAULTS);
const DEFAULT_SUBTASK_TEMPLATE = "Templates/RM Tasks/RM Sub-task.md";
const TEMPLATE_SKIP_KEYS = new Set(["base", "notion-id", "position", "manual_order", "Last edited time"]);
// template settings (template-default, template-repeat, …) stay on the template
const skipTemplateKey = (k) => TEMPLATE_SKIP_KEYS.has(k) || /^template-/i.test(k);

const STEP_TYPES = [
  { id: "add-subtask", name: "Add sub-task", icon: "list-plus", desc: "Create a note with Parent task = this page" },
  { id: "add-task", name: "Add task", icon: "file-plus", desc: "Create a note from a template, not linked to this page" },
  { id: "complete-subtask", name: "Move to Completed Tasks", icon: "check-square", desc: "On a sub-task: move it to the parent's Completed Tasks and set its status" },
  { id: "unparent-all", name: "Un-parent all sub-tasks", icon: "unlink", desc: "Clear this page's Sub-task list and each child's Parent task" },
  { id: "adopt-matching", name: "Make matching tasks sub-tasks", icon: "filter", desc: "Find tasks that match filters and set their Parent task to this page" },
  { id: "edit-matching", name: "Edit pages that match", icon: "list-filter", desc: "Change properties on the pages of a database that match filters" },
  { id: "edit-properties", name: "Edit this page's properties", icon: "pencil", desc: "Set, add to or remove from this page's properties" },
  { id: "rename", name: "Rename this page", icon: "text-cursor-input", desc: "Give this page a new name, with optional dates" },
  { id: "insert", name: "Insert text", icon: "text", desc: "Insert lines above or below the button" },
];
const STEP_TYPE = Object.fromEntries(STEP_TYPES.map((t) => [t.id, t]));

const FILTER_OPS = [
  ["contains", "contains"],
  ["not-contains", "does not contain"],
  ["is", "is"],
  ["is-not", "is not"],
  ["is-any", "is any of (comma separated)"],
  ["starts-with", "starts with"],
  ["not-starts-with", "does not start with"],
  ["is-empty", "is empty"],
  ["not-empty", "is not empty"],
];

const RP = "Templates/RM Tasks/RP - ";
const tagButtons = (tag, icon) => [
  { label: `Add "${tag}" tag`, icon: icon || "tag", steps: [{ action: "edit-properties", changes: [{ property: "Tag", mode: "add", value: tag }] }] },
  { label: `Remove "${tag}" tag`, icon: "x", steps: [{ action: "edit-properties", changes: [{ property: "Tag", mode: "remove", value: tag }] }] },
];
const holderButton = (tag) => ({
  label: `Create new "${tag}" holder task`,
  icon: "clock",
  confirm: "Are you sure you want to create a new task? Please confirm that an open task does not already exist.",
  steps: [{ action: "add-task", template: `Templates/RM Tasks/${tag}.md`, open: "tab" }],
});
const adoptButton = (tag) => ({
  label: `Add tasks with "${tag}" tag as sub-tasks`,
  icon: "filter",
  steps: [{
    action: "adopt-matching",
    where: [
      { property: "Tag", op: "contains", value: tag },
      { property: "Status", op: "is-any", value: "Not started, Up next, In progress" },
      { property: "Parent task", op: "is-empty" },
      // Notion: Name is not "<tag>". Obsidian numbers repeat names ("… 1"), so match the start.
      { property: "file.name", op: "not-starts-with", value: tag },
    ],
  }],
});
const SET_DONE = { label: "Set this item's status to Done", icon: "check", steps: [{ action: "edit-properties", changes: [{ property: "Status", mode: "set", value: "Done" }] }] };
const nestedBlock = (btn) => buttonBlock(normalizeButton(btn)).replace(/\n$/, "").split("\n").map((l) => "\t" + l).join("\n");

// The buttons on the RM Tasks templates in Notion (read 2026-11-27)
const BUILTIN_BUTTONS = [
  { label: "Add subtask", icon: "plus", steps: [{ action: "add-subtask", name: "Subtask", template: DEFAULT_SUBTASK_TEMPLATE }] },
  {
    label: "Move to Completed Tasks and set to Closed",
    icon: "check-square",
    steps: [{ action: "complete-subtask", status: "Closed" }],
  },
  SET_DONE,
  {
    label: "Create release planning subtasks",
    icon: "calendar-plus",
    confirm: "Are you sure you want to create sub-tasks?",
    steps: [
      { action: "add-subtask", name: "Create RM work item and SPR", template: RP + "Create RM work item and SPR.md", open: "none" },
      { action: "add-subtask", name: "Request documentation and approval", template: RP + "Request documentation and approval.md", open: "none" },
      { action: "add-subtask", name: "Get initial list of candidate sites", template: RP + "Get initial list of candidate sites.md", open: "none" },
      { action: "add-subtask", name: "Create release planning document", template: RP + "Create release planning document.md", open: "none" },
      { action: "add-subtask", name: "Schedule release planning meeting", template: RP + "Schedule release planning meeting.md", open: "none" },
      { action: "add-subtask", name: "Hold meeting and update document-SPR", template: RP + "Hold meeting and update document-SPR-Notion-Pilot board.md", open: "none" },
    ],
  },
  {
    label: "Create product development lifecycle meeting sub-tasks",
    icon: "calendar-plus",
    confirm: "Are you sure you want to create sub-tasks?",
    confirmText: "Yes",
    steps: [
      { action: "add-subtask", name: "Meeting preparation tasks", template: "Templates/RM Tasks/PDLC meeting - prep.md", open: "none" },
      { action: "add-subtask", name: "Meeting follow-up tasks", template: "Templates/RM Tasks/PDLC post-meeting follow-up.md", open: "none" },
    ],
  },
  holderButton("Waiting for CCB meeting"),
  holderButton("Waiting to update BCM"),
  adoptButton("Waiting for CCB meeting"),
  adoptButton("Waiting to update BCM"),
  { label: "Un-parent all sub-tasks", icon: "unlink", steps: [{ action: "unparent-all" }] },
  null, // "Add standard tasks", filled in below (it contains buttons)
  ...tagButtons("Waiting for CCB meeting"),
  ...tagButtons("Waiting for feedback"),
  ...tagButtons("Waiting on dev work"),
  ...tagButtons("Waiting on testing"),
  {
    label: "Add \"Waiting on testing\" tag and move to backlog",
    icon: "archive",
    steps: [{ action: "edit-properties", changes: [{ property: "Tag", mode: "add", value: "Waiting on testing" }, { property: "Team", mode: "set", value: "General Backlog" }] }],
  },
  {
    label: "Remove \"Waiting on testing\" tag and move out of backlog",
    icon: "archive-restore",
    steps: [{ action: "edit-properties", changes: [{ property: "Tag", mode: "remove", value: "Waiting on testing" }, { property: "Team", mode: "set", value: "Release Management" }] }],
  },
  // Notes Database templates (read 2026-11-27)
  {
    label: "Add \"Needs transcription\" tag and set status to \"Needs work\"",
    icon: "mic",
    steps: [{ action: "edit-properties", changes: [{ property: "Sub-topic", mode: "set", value: "Needs transcription" }, { property: "Status", mode: "set", value: "Needs work" }] }],
  },
  {
    label: "Add today's date to title",
    icon: "calendar",
    steps: [{ action: "rename", name: "{{title}} {{today:MM/DD/YYYY}}" }],
  },
  {
    // RM Standup is on Tuesdays and Thursdays: Tue/Wed -> Thursday, otherwise the next Tuesday
    label: "Set Future status and Date to next meeting",
    icon: "calendar-clock",
    steps: [
      { action: "edit-properties", changes: [{ property: "Status", mode: "set", value: "Future" }, { property: "Date", mode: "set", value: "{{after:tue,thu:YYYY-MM-DD}}" }] },
      { action: "rename", name: "RM Standup {{after:tue,thu:MM/DD/YYYY}}" },
    ],
  },
  {
    label: "Set Future tag and Date to next meeting (meeting is next Tuesday or today)",
    icon: "calendar-clock",
    steps: [
      { action: "edit-properties", changes: [{ property: "Status", mode: "set", value: "Future" }, { property: "Date", mode: "set", value: "{{next:tue:YYYY-MM-DD}}" }] },
      { action: "rename", name: "1-1 Meeting {{next:tue:MM/DD/YYYY}}" },
    ],
  },
  {
    label: "Set Future tag and Date to next meeting (meeting is next next Tuesday)",
    icon: "calendar-clock",
    steps: [
      { action: "edit-properties", changes: [{ property: "Status", mode: "set", value: "Future" }, { property: "Date", mode: "set", value: "{{next:tue+1:YYYY-MM-DD}}" }] },
      { action: "rename", name: "1-1 Meeting {{next:tue+1:MM/DD/YYYY}}" },
    ],
  },
  // Backup Tasks templates (read 2026-11-27)
  {
    label: "Mark as Done and update Last Backup Dates",
    icon: "check-circle",
    steps: [
      { action: "edit-properties", changes: [{ property: "Status", mode: "set", value: "Done" }, { property: "Date Completed", mode: "set", value: "{{now:YYYY-MM-DDTHH:mm}}" }] },
      { action: "edit-matching", base: "Backup Strategy.base", where: [{ property: "Details", op: "contains", value: "FreeFileSync" }, { property: "Backup Status", op: "is", value: "Done (Manual)" }], changes: [{ property: "Last Backup Date", mode: "set", value: "{{now:YYYY-MM-DDTHH:mm}}" }] },
    ],
  },
  {
    label: "Mark as Done and update Last Backup Date",
    icon: "check-circle",
    steps: [
      { action: "edit-properties", changes: [{ property: "Status", mode: "set", value: "Done" }, { property: "Date Completed", mode: "set", value: "{{now:YYYY-MM-DDTHH:mm}}" }] },
      { action: "edit-matching", base: "Backup Strategy.base", where: [{ property: "file.name", op: "contains", value: "SD Card" }, { property: "Parent item", op: "contains", value: "Steam Deck" }], changes: [{ property: "Last Backup Date", mode: "set", value: "{{now:YYYY-MM-DDTHH:mm}}" }] },
    ],
  },
  {
    label: "Two week reminder and move to General Backlog",
    icon: "alarm-clock",
    steps: [{ action: "edit-properties", changes: [{ property: "Reminder Date", mode: "set", value: "{{today+14:YYYY-MM-DD}}T09:00" }, { property: "Team", mode: "set", value: "General Backlog" }] }],
  },
];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function safeFileName(name) {
  return String(name || "Untitled").replace(/[\\/:*?"<>|#^[\]]/g, "-").replace(/\s+/g, " ").trim() || "Untitled";
}

// {{today}}, {{today:YYYY-MM-DD}}, {{next:tuesday:MM-DD-YYYY}}, {{next:tue+1}} (one week later), {{title}}, {{now}}
// `now` (a moment) stands in for the current time, e.g. the scheduled time of a repeating template
function expandVars(text, file, now) {
  const m = () => (now ? obsidian.moment(now) : obsidian.moment());
  return String(text === undefined || text === null ? "" : text).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (all, expr) => {
    const parts = expr.split(":");
    const kind = parts[0].trim().toLowerCase();
    if (kind === "title") return file ? displayTitle(file) : "";
    if (kind === "now") return m().format(parts.slice(1).join(":") || "YYYY-MM-DDTHH:mm:ss");
    if (kind === "time") return m().format(parts.slice(1).join(":") || "HH:mm");
    const rel = kind.match(/^(today|date)([+-]\d+)?$/);
    if (rel) return m().add(Number(rel[2] || 0), "days").format(parts.slice(1).join(":") || "YYYY-MM-DD");
    // {{next:tue}} the coming Tuesday, today included; {{after:tue,thu}} the first of those days after today
    if (kind === "next" || kind === "after") {
      const spec = (parts[1] || "").trim().toLowerCase();
      const mm = spec.match(/^([a-z, ]+?)(?:\+(\d+))?$/);
      const days = mm ? mm[1].split(/[ ,]+/).filter(Boolean).map((n) => WEEKDAYS.findIndex((d) => d.startsWith(n.slice(0, 3)))) : [];
      if (!days.length || days.some((d) => d < 0)) return all;
      const start = m().startOf("day");
      let best = Infinity;
      for (const day of days) {
        let add = day - start.day();
        if (add < 0 || (add === 0 && kind === "after")) add += 7; // "next": the same weekday counts (Notion's formula)
        best = Math.min(best, add);
      }
      return start.add(best + 7 * Number(mm[2] || 0), "days").format(parts.slice(2).join(":") || "YYYY-MM-DD");
    }
    return all;
  });
}

// Like expandVars, but leaves notion-button blocks alone, so a button inside a template
// still works out {{today}} (and friends) when it's clicked, not when the note was made.
function expandBody(text, file, now) {
  const parts = String(text || "").split(/((?:^|\n)[ \t]*(?:```|~~~)[ \t]*notion-button[\s\S]*?\n[ \t]*(?:```|~~~)[ \t]*(?=\n|$))/);
  return parts.map((p, i) => (i % 2 ? p : expandVars(p, file, now))).join("");
}

// Template values: strings (and lists of strings) get the same variables as names
function expandValue(v, file, now) {
  if (typeof v === "string") return expandVars(v, file, now);
  if (Array.isArray(v)) return v.map((x) => expandValue(x, file, now));
  return v;
}

function normalizeButton(raw) {
  const cfg = Object.assign({}, raw || {});
  let steps = Array.isArray(cfg.steps) ? cfg.steps.filter((s) => s && typeof s === "object") : null;
  if (!steps) {
    // older single-action form: action + options at the top level
    const step = { action: cfg.action || "add-subtask" };
    for (const k of ["name", "template", "tasks", "properties", "open", "folder", "status", "text", "position", "where", "changes"]) {
      if (cfg[k] !== undefined) step[k] = cfg[k];
    }
    if (step.action === "add-subtask" && step.template === undefined && !step.tasks) step.template = DEFAULT_SUBTASK_TEMPLATE;
    steps = [step];
  }
  cfg.steps = steps.map((s) => Object.assign({}, s, { action: String(s.action || "add-subtask").toLowerCase() }));
  for (const k of BUTTON_KEYS) if (cfg[k] === undefined) cfg[k] = BUTTON_DEFAULTS[k];
  return cfg;
}

// The YAML we write back for a button: only what the user set
function buttonToYaml(btn) {
  const out = {};
  out.label = btn.label || "Button";
  if (btn.icon) out.icon = btn.icon;
  if (btn.description) out.description = btn.description;
  if (btn.confirm) out.confirm = btn.confirm;
  if (btn.confirm && btn.confirmText && btn.confirmText !== "Continue") out.confirmText = btn.confirmText;
  for (const k of BUTTON_KEYS) if (btn[k] && btn[k] !== BUTTON_DEFAULTS[k]) out[k] = btn[k];
  out.steps = (btn.steps || []).map((s) => {
    const o = { action: s.action };
    for (const [k, v] of Object.entries(s)) {
      if (k === "action" || v === undefined || v === null || v === "") continue;
      if (Array.isArray(v) && !v.length) continue;
      if (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) continue;
      o[k] = v;
    }
    return o;
  });
  return obsidian.stringifyYaml(out).replace(/\s+$/, "");
}

function buttonBlock(btn) {
  return "```notion-button\n" + buttonToYaml(btn) + "\n```\n";
}

function standardTasksButton() {
  const ccb = tagButtons("Waiting for CCB meeting");
  return {
    label: "Add standard tasks",
    icon: "list-checks",
    steps: [{
      action: "insert",
      position: "top",
      text: [
        "- [ ] Test in .local",
        "- [ ] Enter CCB",
        nestedBlock(ccb[0]),
        "- [ ] Confirm that CCB is approved",
        nestedBlock(ccb[1]),
        "- [ ] Deploy to 1x/2x",
        "- [ ] Update BCM",
        "- [ ] Close item on RM board",
        nestedBlock(Object.assign({}, SET_DONE, { label: "Set Status to Done" })),
      ].join("\n"),
    }],
  };
}

class NoteButtons {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
  }

  load() {
    const p = this.plugin;
    p.registerMarkdownCodeBlockProcessor("notion-button", (src, el, ctx) => this.render(src, el, ctx));
    p.addCommand({
      id: "insert-button",
      name: "Insert button",
      editorCallback: (editor) => this.openPicker(editor),
    });
    p.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        menu.addItem((item) => item.setTitle("Insert button").setIcon("mouse-pointer-click").onClick(() => this.openPicker(editor)));
      })
    );
    p.addCommand({
      id: "add-subtask",
      name: "Add sub-task to current note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) this.guard(() => this.runButton(normalizeButton(BUILTIN_BUTTONS[0]), file));
        return true;
      },
    });
    p.addCommand({
      id: "complete-subtask",
      name: "Move current sub-task to Completed Tasks and set to Closed",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) this.guard(() => this.runButton(normalizeButton(BUILTIN_BUTTONS[1]), file));
        return true;
      },
    });
  }

  // ----- library -----

  library() {
    const i = BUILTIN_BUTTONS.indexOf(null);
    if (i >= 0) BUILTIN_BUTTONS[i] = standardTasksButton();
    const mine = asList(this.plugin.settings.buttonLibrary).filter((b) => b && typeof b === "object" && b.label);
    return { builtin: BUILTIN_BUTTONS, mine };
  }

  async saveToLibrary(btn) {
    const fresh = (await this.plugin.loadData()) || {};
    const list = asList(fresh.buttonLibrary).filter((b) => b && b.label !== btn.label);
    list.push(JSON.parse(JSON.stringify(Object.assign({}, btn))));
    this.plugin.settings.buttonLibrary = list;
    await this.plugin.saveData(Object.assign(fresh, { buttonLibrary: list }));
    new obsidian.Notice(`Saved "${btn.label}" to My buttons`);
  }

  async removeFromLibrary(label) {
    const fresh = (await this.plugin.loadData()) || {};
    const list = asList(fresh.buttonLibrary).filter((b) => b && b.label !== label);
    this.plugin.settings.buttonLibrary = list;
    await this.plugin.saveData(Object.assign(fresh, { buttonLibrary: list }));
  }

  openPicker(editor) {
    new ButtonPickerModal(this, (btn) => {
      if (!btn) {
        new ButtonBuilderModal(this, null, (made) => this.insertBlock(editor, made)).open();
        return;
      }
      this.insertBlock(editor, btn);
    }).open();
  }

  insertBlock(editor, btn) {
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    const before = line.trim() ? "\n" : "";
    editor.replaceRange(before + buttonBlock(normalizeButton(btn)), { line: cur.line, ch: line.length });
  }

  // ----- rendering -----

  parse(src) {
    let raw;
    try { raw = obsidian.parseYaml(src); } catch (e) { return { error: e.message }; }
    if (raw === null || raw === undefined) raw = {};
    if (typeof raw !== "object" || Array.isArray(raw)) return { error: "the block should hold lines like  label: Add subtask" };
    return normalizeButton(raw);
  }

  render(src, el, ctx) {
    const cfg = this.parse(src);
    const wrap = el.createDiv({ cls: "nk-note-button-wrap" });
    if (cfg.error) {
      wrap.createDiv({ cls: "nk-note-button-error", text: "Button settings can't be read: " + cfg.error });
      return;
    }
    const btn = wrap.createEl("button", { cls: "nk-note-button" });
    if (cfg.icon) renderIconValue(btn.createSpan({ cls: "nk-note-button-icon" }), String(cfg.icon));
    btn.createSpan({ cls: "nk-note-button-label", text: String(cfg.label || "Button") });
    if (cfg.description) btn.setAttr("aria-label", String(cfg.description));
    btn.addEventListener("mousedown", (ev) => ev.stopPropagation());
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
      if (!(file instanceof obsidian.TFile)) return;
      const run = () => {
        btn.disabled = true;
        this.guard(() => this.runButton(cfg, file, el, ctx)).finally(() => { btn.disabled = false; });
      };
      if (cfg.confirm) new ConfirmModal(this.app, String(cfg.label || "Confirm"), String(cfg.confirm), String(cfg.confirmText || "Continue"), run).open();
      else run();
    });
    const gear = wrap.createDiv({ cls: "nk-note-button-gear clickable-icon", attr: { "aria-label": "Edit button" } });
    obsidian.setIcon(gear, "settings");
    gear.addEventListener("mousedown", (ev) => ev.stopPropagation());
    gear.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      new ButtonBuilderModal(this, cfg, (made) => this.guard(() => this.replaceBlock(ctx, el, src, made))).open();
    });
  }

  async replaceBlock(ctx, el, src, btn) {
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof obsidian.TFile)) return;
    const info = ctx.getSectionInfo(el);
    const block = buttonBlock(normalizeButton(btn)).replace(/\n$/, "");
    await this.app.vault.process(file, (data) => {
      const nl = data.includes("\r\n") ? "\r\n" : "\n";
      const lines = data.split(/\r?\n/);
      if (info && /^\s*(```|~~~)\s*notion-button/.test(lines[info.lineStart] || "")) {
        lines.splice(info.lineStart, info.lineEnd - info.lineStart + 1, ...block.split("\n"));
        return lines.join(nl);
      }
      const body = src.replace(/\s+$/, "");
      const re = new RegExp("```notion-button\\r?\\n" + body.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\n/g, "\\r?\\n") + "\\s*\\r?\\n```");
      if (re.test(data)) return data.replace(re, block.split("\n").join(nl));
      new obsidian.Notice("Couldn't find this button in the note to update it.");
      return data;
    });
  }

  async guard(fn) {
    try { await fn(); } catch (e) {
      console.error("[notion-style-kanban] button failed", e);
      new obsidian.Notice("Button failed: " + (e && e.message ? e.message : e));
    }
  }

  // ----- running -----

  async runButton(cfg, file, el, ctx) {
    const state = { file, created: [] };
    for (const step of cfg.steps) {
      await this.runStep(cfg, step, state, el, ctx);
    }
    const toOpen = state.created.filter((c) => c.open !== "none");
    if (toOpen.length) {
      const c = toOpen[0];
      const leaf = c.open === "split" ? this.app.workspace.getLeaf("split") : this.app.workspace.getLeaf("tab");
      await leaf.openFile(c.file, { state: { mode: "source" }, eState: { rename: "all" } });
    } else if (state.created.length) {
      const n = state.created.length;
      new obsidian.Notice(n === 1 ? `Added "${displayTitle(state.created[0].file)}"` : `Added ${n} tasks`);
    }
  }

  async runStep(cfg, step, state, el, ctx) {
    const file = state.file;
    switch (step.action) {
      case "add-subtask":
      case "add-subtasks": {
        let specs = asList(step.tasks).map((t) => (typeof t === "string" ? { name: t } : t || {}));
        if (!specs.length) specs = [step];
        for (const spec of specs) {
          const child = await this.createNote(cfg, Object.assign({}, step, spec), file, true);
          state.created.push({ file: child, open: this.openMode(step, specs.length) });
        }
        return;
      }
      case "add-task": {
        const note = await this.createNote(cfg, step, file, false);
        state.created.push({ file: note, open: this.openMode(step, 1) });
        return;
      }
      case "complete-subtask": return this.completeSubtask(cfg, step, file);
      case "unparent-all": return this.unparentAll(cfg, file);
      case "adopt-matching": return this.adoptMatching(cfg, step, file);
      case "edit-matching": return this.editMatching(step, file);
      case "edit-properties": return this.editProperties(step, file);
      case "rename": return this.renameNote(step, file);
      case "insert": return this.insertText(step, file, el, ctx);
      default: new obsidian.Notice(`Unknown button step "${step.action}"`);
    }
  }

  openMode(step, count) {
    const v = step.open === undefined ? (count === 1 ? "tab" : "none") : String(step.open).toLowerCase();
    return v === "false" || v === "no" ? "none" : v;
  }

  // ----- links -----

  fm(file) {
    const c = this.app.metadataCache.getFileCache(file);
    return (c && c.frontmatter) || {};
  }
  linkTo(file) {
    return `[[${file.path.replace(/\.md$/, "")}|${linkAlias(displayTitle(file))}]]`;
  }
  resolve(raw, from) {
    const { linkpath } = parseLink(raw);
    if (!linkpath) return null;
    return this.app.metadataCache.getFirstLinkpathDest(linkpath, from.path);
  }
  has(list, target, from) {
    return asList(list).some((x) => { const f = this.resolve(x, from); return f && f.path === target.path; });
  }
  withLink(list, target, from) {
    const l = asList(list);
    return this.has(l, target, from) ? l : [...l, this.linkTo(target)];
  }
  withoutLink(list, target, from) {
    return asList(list).filter((x) => { const f = this.resolve(x, from); return !(f && f.path === target.path); });
  }
  linkedFiles(list, from) {
    const out = [];
    for (const x of asList(list)) {
      const f = this.resolve(x, from);
      if (f instanceof obsidian.TFile && !out.some((o) => o.path === f.path)) out.push(f);
    }
    return out;
  }

  // ----- templates -----

  async readTemplate(path) {
    if (!path) return { fm: {}, body: "" };
    const norm = obsidian.normalizePath(String(path).endsWith(".md") ? String(path) : String(path) + ".md");
    let t = this.app.vault.getAbstractFileByPath(norm);
    if (!(t instanceof obsidian.TFile)) t = this.app.metadataCache.getFirstLinkpathDest(String(path).replace(/\.md$/, ""), "");
    if (!(t instanceof obsidian.TFile)) {
      new obsidian.Notice(`Template "${path}" not found; creating a blank note.`);
      return { fm: {}, body: "" };
    }
    const text = await this.app.vault.read(t);
    const c = this.app.metadataCache.getFileCache(t);
    const end = c && c.frontmatterPosition ? c.frontmatterPosition.end.offset : -1;
    let body = text;
    if (end >= 0) body = text.slice(end).replace(/^\s*---\s*\r?\n?/, "").replace(/^\r?\n/, "");
    else body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    const fm = JSON.parse(JSON.stringify((c && c.frontmatter) || {}));
    return { fm, body };
  }

  // ----- actions -----

  // Notion: "Add page to RM Tasks as <template>", with Parent task = This page for sub-tasks
  async createNote(cfg, step, from, asChild) {
    const fromFm = this.fm(from);
    const tplPath = step.template !== undefined ? step.template : (asChild ? DEFAULT_SUBTASK_TEMPLATE : "");
    const tpl = await this.readTemplate(tplPath);
    const folder = step.folder ? obsidian.normalizePath(String(step.folder)) : (from.parent ? from.parent.path : "");
    const tplName = tplPath ? String(tplPath).split("/").pop().replace(/\.md$/, "") : "";
    // Notion keeps the title as typed; the file gets a safe, unique name and the title goes in a property
    const title = expandVars(step.name || (asChild ? "Subtask" : titleOf(tpl.fm) || tplName || "Untitled"), from).replace(/\s+/g, " ").trim() || "Untitled";
    const note = await this.app.vault.create(uniqueNotePath(this.app, folder, safeFileName(title)), expandBody(tpl.body || "", from));
    await this.app.fileManager.processFrontMatter(note, (fm) => {
      for (const [k, v] of Object.entries(tpl.fm)) if (!skipTemplateKey(k)) fm[k] = expandValue(v, from);
      fm[TITLE_KEY] = title;
      if (fromFm.base) fm.base = fromFm.base;
      if (asChild) fm[cfg.parentProperty] = [this.linkTo(from)];
      for (const [k, v] of Object.entries(step.properties || {})) fm[k] = typeof v === "string" ? expandVars(v, from) : v;
      if (cfg.statusProperty && (fm[cfg.statusProperty] === undefined || fm[cfg.statusProperty] === "")) fm[cfg.statusProperty] = "Not started";
    });
    if (asChild) {
      // the other side of the two-way relation (Obsidian doesn't keep it in sync on its own)
      await this.app.fileManager.processFrontMatter(from, (fm) => {
        fm[cfg.subtaskProperty] = this.withLink(fm[cfg.subtaskProperty], note, from);
      });
    }
    return note;
  }

  // Notion: Completed Tasks += parent, Parent task -= parent, Status = Closed
  async completeSubtask(cfg, step, child) {
    const parents = this.linkedFiles(this.fm(child)[cfg.parentProperty], child);
    const status = step.status === undefined ? "Closed" : step.status;
    await this.app.fileManager.processFrontMatter(child, (fm) => {
      let done = asList(fm[cfg.completedProperty]);
      for (const p of parents) done = this.withLink(done, p, child);
      if (cfg.completedProperty) fm[cfg.completedProperty] = done;
      let left = asList(fm[cfg.parentProperty]);
      for (const p of parents) left = this.withoutLink(left, p, child);
      fm[cfg.parentProperty] = left;
      if (cfg.statusProperty && status) fm[cfg.statusProperty] = Array.isArray(fm[cfg.statusProperty]) ? [status] : status;
    });
    for (const p of parents) {
      await this.app.fileManager.processFrontMatter(p, (fm) => {
        fm[cfg.subtaskProperty] = this.withoutLink(fm[cfg.subtaskProperty], child, p);
        if (cfg.completedProperty) fm[cfg.completedProperty] = this.withLink(fm[cfg.completedProperty], child, p);
      });
    }
    new obsidian.Notice(parents.length ? `Moved to Completed Tasks of "${parents.map((p) => displayTitle(p)).join('", "')}"` : `Set to ${status} (no parent task)`);
  }

  // Notion: Sub-task -= all (the two-way relation clears each child's Parent task)
  async unparentAll(cfg, parent) {
    const children = this.linkedFiles(this.fm(parent)[cfg.subtaskProperty], parent);
    await this.app.fileManager.processFrontMatter(parent, (fm) => { fm[cfg.subtaskProperty] = []; });
    for (const c of children) {
      await this.app.fileManager.processFrontMatter(c, (fm) => {
        fm[cfg.parentProperty] = this.withoutLink(fm[cfg.parentProperty], parent, c);
      });
    }
    new obsidian.Notice(`Un-parented ${children.length} sub-task${children.length === 1 ? "" : "s"}`);
  }

  matches(file, fm, rule) {
    const prop = String(rule.property || "");
    const raw = prop === "file.name" || prop.toLowerCase() === "name" ? displayTitle(file) : fm[prop];
    const vals = asList(raw).map((v) => {
      const s = asString(v);
      const l = parseLink(s);
      return (l.alias || (s.startsWith("[[") ? l.linkpath.split("/").pop() : s)).toLowerCase();
    });
    const want = String(rule.value === undefined || rule.value === null ? "" : rule.value).toLowerCase();
    const any = want.split(",").map((x) => x.trim()).filter(Boolean);
    switch (String(rule.op || "contains")) {
      case "contains": return vals.some((v) => v === want || (vals.length === 1 && v.includes(want)));
      case "not-contains": return !vals.some((v) => v === want || (vals.length === 1 && v.includes(want)));
      case "is": return vals.length === 1 ? vals[0] === want : vals.includes(want);
      case "is-not": return !(vals.length === 1 ? vals[0] === want : vals.includes(want));
      case "is-any": return vals.some((v) => any.includes(v));
      case "starts-with": return vals.some((v) => v.startsWith(want));
      case "not-starts-with": return !vals.some((v) => v.startsWith(want));
      case "is-empty": return vals.length === 0;
      case "not-empty": return vals.length > 0;
      default: return false;
    }
  }

  // Notion: "Edit tasks that match <filters> in RM Tasks: Parent task = This page"
  async adoptMatching(cfg, step, parent) {
    const parentFm = this.fm(parent);
    const sameBase = parentFm.base ? asString(parentFm.base) : null;
    const rules = asList(step.where);
    const hits = [];
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path === parent.path) continue;
      const fm = this.fm(f);
      if (sameBase ? asString(fm.base) !== sameBase : (f.parent && parent.parent && f.parent.path !== parent.parent.path)) continue;
      if (rules.every((r) => this.matches(f, fm, r))) hits.push(f);
    }
    for (const c of hits) {
      const oldParents = this.linkedFiles(this.fm(c)[cfg.parentProperty], c).filter((p) => p.path !== parent.path);
      await this.app.fileManager.processFrontMatter(c, (fm) => { fm[cfg.parentProperty] = [this.linkTo(parent)]; });
      for (const op of oldParents) {
        await this.app.fileManager.processFrontMatter(op, (fm) => { fm[cfg.subtaskProperty] = this.withoutLink(fm[cfg.subtaskProperty], c, op); });
      }
    }
    await this.app.fileManager.processFrontMatter(parent, (fm) => {
      let list = asList(fm[cfg.subtaskProperty]);
      for (const c of hits) list = this.withLink(list, c, parent);
      fm[cfg.subtaskProperty] = list;
    });
    new obsidian.Notice(`Added ${hits.length} matching task${hits.length === 1 ? "" : "s"} as sub-tasks`);
  }

  // Notion: "Edit pages in <database> that match <filters>: <property> = <value>"
  async editMatching(step, from) {
    const fromFm = this.fm(from);
    const base = step.base ? `[[${String(step.base).replace(/^\[\[|\]\]$/g, "").replace(/(\.base)?$/, ".base")}]]` : asString(fromFm.base);
    const want = parseLink(base).linkpath.split("/").pop();
    const rules = asList(step.where);
    const hits = this.app.vault.getMarkdownFiles().filter((f) => {
      if (f.path === from.path) return false;
      const fm = this.fm(f);
      if (!want || parseLink(asString(fm.base)).linkpath.split("/").pop() !== want) return false;
      return rules.every((r) => this.matches(f, fm, r));
    });
    for (const f of hits) await this.editProperties(step, f, from);
    new obsidian.Notice(`Updated ${hits.length} page${hits.length === 1 ? "" : "s"}`);
  }

  // Notion: "Edit This page: <property> set / add / remove <value>"
  async editProperties(step, file, varsFrom) {
    const changes = asList(step.changes);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      for (const ch of changes) {
        const key = ch && ch.property;
        if (!key) continue;
        const mode = String(ch.mode || "set").toLowerCase();
        const value = typeof ch.value === "string" ? expandVars(ch.value, varsFrom || file) : ch.value;
        const values = asList(value).map((v) => (typeof v === "string" ? v : v));
        if (mode === "add") {
          const cur = asList(fm[key]);
          for (const v of values) if (!cur.some((c) => asString(c).toLowerCase() === asString(v).toLowerCase())) cur.push(v);
          fm[key] = cur;
        } else if (mode === "remove") {
          if (Array.isArray(fm[key])) fm[key] = fm[key].filter((c) => !values.some((v) => asString(c).toLowerCase() === asString(v).toLowerCase()));
          else if (values.some((v) => asString(fm[key]).toLowerCase() === asString(v).toLowerCase())) fm[key] = "";
        } else if (mode === "clear") {
          fm[key] = Array.isArray(fm[key]) ? [] : "";
        } else {
          fm[key] = Array.isArray(fm[key]) && !Array.isArray(value) ? asList(value) : value;
        }
      }
    });
  }

  async renameNote(step, file) {
    await this.plugin.setDisplayTitle(file, expandVars(step.name || displayTitle(file), file));
  }

  // Notion: "Insert blocks above/below button"
  async insertText(step, file, el, ctx) {
    const text = expandVars(step.text || "", file).replace(/\s+$/, "");
    if (!text) return;
    const info = ctx && el ? ctx.getSectionInfo(el) : null;
    const pos = String(step.position || "above").toLowerCase();
    const below = pos === "below";
    await this.app.vault.process(file, (data) => {
      const nl = data.includes("\r\n") ? "\r\n" : "\n";
      const lines = data.split(/\r?\n/);
      const add = text.split(/\r?\n/);
      if (pos === "top") {
        // Notion: "top of page" = right under the properties (and under the comments section)
        let at = 0;
        if (lines[0] === "---") { const end = lines.indexOf("---", 1); if (end > 0) at = end + 1; }
        let k = at;
        while (k < lines.length && !lines[k].trim()) k++;
        if ((lines[k] || "").includes("notion-comments:start")) {
          const end = lines.findIndex((l, j) => j > k && l.includes("notion-comments:end"));
          if (end > 0) at = end + 1;
        }
        lines.splice(at, 0, ...(at > 0 && lines[at - 1].trim() && lines[at - 1] !== "---" ? [""] : []), ...add, "");
        return lines.join(nl);
      }
      if (!info) return data.replace(/\s*$/, "") + nl + add.join(nl) + nl;
      const at = below ? info.lineEnd + 1 : info.lineStart;
      lines.splice(at, 0, ...add);
      return lines.join(nl);
    });
  }
}

// ----- "Insert button": pick a ready-made button or start a new one -----

class ButtonPickerModal extends obsidian.SuggestModal {
  constructor(buttons, onPick) {
    super(buttons.app);
    this.buttons = buttons;
    this.onPick = onPick;
    this.setPlaceholder("Insert a button… (type to filter)");
    this.setInstructions([{ command: "↵", purpose: "insert" }, { command: "esc", purpose: "cancel" }]);
  }

  getSuggestions(query) {
    const q = query.trim().toLowerCase();
    const { builtin, mine } = this.buttons.library();
    const items = [{ kind: "new", label: "New button…", description: "Build a button step by step, like Notion" }];
    for (const b of mine) items.push({ kind: "mine", label: b.label, btn: b });
    for (const b of builtin) items.push({ kind: "builtin", label: b.label, btn: b });
    return items.filter((it) => !q || it.label.toLowerCase().includes(q) || it.kind === "new");
  }

  renderSuggestion(it, el) {
    el.addClass("nk-button-suggestion");
    const icon = el.createSpan({ cls: "nk-button-suggestion-icon" });
    if (it.kind === "new") obsidian.setIcon(icon, "plus");
    else if (it.btn.icon) renderIconValue(icon, String(it.btn.icon));
    else obsidian.setIcon(icon, "mouse-pointer-click");
    const text = el.createDiv({ cls: "nk-button-suggestion-text" });
    text.createDiv({ cls: "nk-button-suggestion-title", text: it.label });
    const desc = it.kind === "new" ? it.description : (it.btn.description || this.summary(it.btn));
    if (desc) text.createDiv({ cls: "nk-button-suggestion-desc", text: desc });
    if (it.kind === "mine") {
      el.createSpan({ cls: "nk-button-suggestion-badge", text: "My button" });
      const del = el.createSpan({ cls: "nk-button-suggestion-del clickable-icon", attr: { "aria-label": "Remove from My buttons" } });
      obsidian.setIcon(del, "trash-2");
      del.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        await this.buttons.removeFromLibrary(it.label);
        this.inputEl.dispatchEvent(new Event("input"));
      });
    }
  }

  summary(btn) {
    const steps = normalizeButton(btn).steps;
    return steps.map((s) => (STEP_TYPE[s.action] ? STEP_TYPE[s.action].name : s.action)).join(" → ");
  }

  onChooseSuggestion(it) {
    this.onPick(it.kind === "new" ? null : it.btn);
  }
}

// ----- the step builder (Notion's "When button is clicked / Do") -----

class ButtonBuilderModal extends obsidian.Modal {
  constructor(buttons, initial, onDone) {
    super(buttons.app);
    this.buttons = buttons;
    this.onDone = onDone;
    const start = initial ? normalizeButton(JSON.parse(JSON.stringify(initial))) : { label: "", steps: [] };
    this.btn = {
      label: start.label || "",
      icon: start.icon || "",
      description: start.description || "",
      confirm: start.confirm || "",
      confirmText: start.confirmText || "",
      steps: (start.steps || []).map((s) => Object.assign({}, s)),
    };
    for (const k of BUTTON_KEYS) if (start[k] && start[k] !== BUTTON_DEFAULTS[k]) this.btn[k] = start[k];
    this.editing = !!initial;
    this.saveToLibrary = false;
  }

  onOpen() {
    this.modalEl.addClass("nk-button-builder");
    this.titleEl.setText(this.editing ? "Edit button" : "New button");
    this.draw();
  }

  onClose() { this.contentEl.empty(); }

  templateFiles() {
    return this.app.vault.getMarkdownFiles().filter((f) => /(^|\/)templates?\//i.test(f.path)).map((f) => f.path).sort();
  }

  draw() {
    const c = this.contentEl;
    c.empty();
    const b = this.btn;

    new obsidian.Setting(c).setName("Button name").addText((t) => t.setPlaceholder("Add subtask").setValue(b.label).onChange((v) => { b.label = v; }));
    new obsidian.Setting(c)
      .setName("Icon")
      .setDesc("Optional. A Lucide icon name with an optional color (plus, check:green) or an emoji.")
      .addText((t) => t.setPlaceholder("plus").setValue(b.icon).onChange((v) => { b.icon = v.trim(); }));

    c.createDiv({ cls: "nk-bb-section", text: "When" });
    const when = c.createDiv({ cls: "nk-bb-card nk-bb-when" });
    obsidian.setIcon(when.createSpan({ cls: "nk-bb-card-icon" }), "mouse-pointer-click");
    when.createSpan({ text: "Button is clicked" });

    c.createDiv({ cls: "nk-bb-section", text: "Do" });
    const confirmCard = c.createDiv({ cls: "nk-bb-card" });
    new obsidian.Setting(confirmCard)
      .setName("Show confirmation")
      .addToggle((t) => t.setValue(!!b.confirm).onChange((v) => { b.confirm = v ? (b.confirm || "Are you sure?") : ""; this.draw(); }));
    if (b.confirm) {
      new obsidian.Setting(confirmCard).setName("Confirmation message").addText((t) => t.setValue(b.confirm).onChange((v) => { b.confirm = v || "Are you sure?"; }));
      new obsidian.Setting(confirmCard).setName("Continue button text").addText((t) => t.setPlaceholder("Continue").setValue(b.confirmText || "").onChange((v) => { b.confirmText = v.trim(); }));
    }

    b.steps.forEach((step, i) => this.drawStep(c, step, i));

    const addRow = c.createDiv({ cls: "nk-bb-add" });
    const add = addRow.createEl("button", { cls: "nk-bb-add-btn" });
    obsidian.setIcon(add.createSpan({ cls: "nk-bb-card-icon" }), "plus");
    add.createSpan({ text: "Add action" });
    add.onclick = (ev) => {
      const menu = new obsidian.Menu();
      for (const t of STEP_TYPES) {
        menu.addItem((item) => item.setTitle(t.name).setIcon(t.icon).onClick(() => {
          b.steps.push(this.newStep(t.id));
          this.draw();
        }));
      }
      menu.showAtMouseEvent(ev);
    };

    const foot = c.createDiv({ cls: "nk-bb-foot" });
    new obsidian.Setting(foot)
      .setName("Save to My buttons")
      .setDesc("Adds it to the Insert button list so you can reuse it on other pages.")
      .addToggle((t) => t.setValue(this.saveToLibrary).onChange((v) => { this.saveToLibrary = v; }));
    const row = foot.createDiv({ cls: "modal-button-container" });
    const done = row.createEl("button", { cls: "mod-cta", text: this.editing ? "Done" : "Insert" });
    done.onclick = async () => {
      if (!b.label.trim()) { new obsidian.Notice("Give the button a name first."); return; }
      if (!b.steps.length) { new obsidian.Notice("Add at least one action."); return; }
      const out = Object.assign({}, b, { label: b.label.trim() });
      if (this.saveToLibrary) await this.buttons.saveToLibrary(out);
      this.close();
      this.onDone(out);
    };
    const cancel = row.createEl("button", { text: "Cancel" });
    cancel.onclick = () => this.close();
  }

  newStep(id) {
    if (id === "add-subtask") return { action: id, name: "Subtask", template: DEFAULT_SUBTASK_TEMPLATE, open: "tab" };
    if (id === "add-task") return { action: id, name: "", template: "", open: "tab" };
    if (id === "complete-subtask") return { action: id, status: "Closed" };
    if (id === "adopt-matching") return { action: id, where: [{ property: "Tag", op: "contains", value: "" }] };
    if (id === "edit-properties") return { action: id, changes: [{ property: "Tag", mode: "add", value: "" }] };
    if (id === "edit-matching") return { action: id, base: "", where: [{ property: "file.name", op: "contains", value: "" }], changes: [{ property: "", mode: "set", value: "" }] };
    if (id === "rename") return { action: id, name: "{{title}}" };
    if (id === "insert") return { action: id, text: "- [ ] ", position: "above" };
    return { action: id };
  }

  drawStep(c, step, i) {
    const b = this.btn;
    const type = STEP_TYPE[step.action] || { name: step.action, icon: "help-circle", desc: "" };
    const card = c.createDiv({ cls: "nk-bb-card nk-bb-step" });
    const head = card.createDiv({ cls: "nk-bb-step-head" });
    obsidian.setIcon(head.createSpan({ cls: "nk-bb-card-icon" }), type.icon);
    head.createSpan({ cls: "nk-bb-step-title", text: type.name });
    const tools = head.createDiv({ cls: "nk-bb-step-tools" });
    const tool = (icon, label, fn, disabled) => {
      const t = tools.createDiv({ cls: "clickable-icon" + (disabled ? " is-disabled" : ""), attr: { "aria-label": label } });
      obsidian.setIcon(t, icon);
      if (!disabled) t.onclick = fn;
    };
    tool("arrow-up", "Move up", () => { [b.steps[i - 1], b.steps[i]] = [b.steps[i], b.steps[i - 1]]; this.draw(); }, i === 0);
    tool("arrow-down", "Move down", () => { [b.steps[i + 1], b.steps[i]] = [b.steps[i], b.steps[i + 1]]; this.draw(); }, i === b.steps.length - 1);
    tool("trash-2", "Delete action", () => { b.steps.splice(i, 1); this.draw(); });
    if (type.desc) card.createDiv({ cls: "nk-bb-step-desc", text: type.desc });

    const text = (name, key, placeholder, desc) =>
      new obsidian.Setting(card).setName(name).setDesc(desc || "").addText((t) => t.setPlaceholder(placeholder || "").setValue(step[key] === undefined ? "" : String(step[key])).onChange((v) => { step[key] = v; }));
    const templateField = () => {
      const s = new obsidian.Setting(card).setName("Template").setDesc("A note whose properties and content are copied into the new note.");
      s.addText((t) => {
        t.setPlaceholder("Templates/RM Tasks/RM Sub-task.md").setValue(step.template || "").onChange((v) => { step.template = v.trim(); });
        const listId = "nk-bb-templates-" + Math.random().toString(36).slice(2);
        const dl = card.createEl("datalist", { attr: { id: listId } });
        for (const p of this.templateFiles()) dl.createEl("option", { attr: { value: p } });
        t.inputEl.setAttr("list", listId);
        t.inputEl.addClass("nk-bb-wide");
      });
    };
    const openField = () =>
      new obsidian.Setting(card).setName("Then").addDropdown((d) => d
        .addOption("tab", "Open it in a new tab")
        .addOption("split", "Open it to the right")
        .addOption("none", "Don't open it")
        .setValue(step.open || "tab")
        .onChange((v) => { step.open = v; }));
    const propsField = () => {
      const s = new obsidian.Setting(card).setName("Also set").setDesc("One per line, like  Team: Personal");
      s.addTextArea((t) => {
        t.setPlaceholder("Team: Release Management").setValue(Object.entries(step.properties || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n"));
        t.onChange((v) => {
          const props = {};
          for (const line of v.split(/\r?\n/)) {
            const at = line.indexOf(":");
            if (at > 0) props[line.slice(0, at).trim()] = line.slice(at + 1).trim();
          }
          step.properties = props;
        });
      });
    };

    const whereUI = (label) => {
      step.where = asList(step.where);
      card.createDiv({ cls: "nk-bb-step-sub", text: label });
      step.where.forEach((rule, k) => {
        const s = new obsidian.Setting(card).setClass("nk-bb-rule");
        s.addText((t) => t.setPlaceholder("Property (or file.name)").setValue(rule.property || "").onChange((v) => { rule.property = v.trim(); }));
        s.addDropdown((d) => {
          for (const [id, label] of FILTER_OPS) d.addOption(id, label);
          d.setValue(rule.op || "contains").onChange((v) => { rule.op = v; this.draw(); });
        });
        if (!["is-empty", "not-empty"].includes(rule.op)) s.addText((t) => t.setPlaceholder("Value").setValue(rule.value === undefined ? "" : String(rule.value)).onChange((v) => { rule.value = v; }));
        s.addExtraButton((x) => x.setIcon("x").setTooltip("Remove filter").onClick(() => { step.where.splice(k, 1); this.draw(); }));
      });
      new obsidian.Setting(card).addButton((x) => x.setButtonText("Add filter").onClick(() => { step.where.push({ property: "", op: "contains", value: "" }); this.draw(); }));
    };
    const changesUI = () => {
      step.changes = asList(step.changes);
      step.changes.forEach((ch, k) => {
        const s = new obsidian.Setting(card).setClass("nk-bb-rule");
        s.addText((t) => t.setPlaceholder("Property").setValue(ch.property || "").onChange((v) => { ch.property = v.trim(); }));
        s.addDropdown((d) => d
          .addOption("set", "set to")
          .addOption("add", "add")
          .addOption("remove", "remove")
          .addOption("clear", "clear")
          .setValue(ch.mode || "set")
          .onChange((v) => { ch.mode = v; this.draw(); }));
        if (ch.mode !== "clear") s.addText((t) => t.setPlaceholder("Value").setValue(ch.value === undefined ? "" : asString(ch.value)).onChange((v) => { ch.value = v; }));
        s.addExtraButton((x) => x.setIcon("x").setTooltip("Remove").onClick(() => { step.changes.splice(k, 1); this.draw(); }));
      });
      new obsidian.Setting(card).addButton((x) => x.setButtonText("Edit another property").onClick(() => { step.changes.push({ property: "", mode: "set", value: "" }); this.draw(); }));
    };
    switch (step.action) {
      case "add-subtask":
        text("Name", "name", "Subtask", "Use {{title}} for this page's name, {{today:MM-DD-YYYY}} for a date.");
        templateField();
        propsField();
        openField();
        break;
      case "add-task":
        text("Name", "name", "Leave empty to use the template's name");
        templateField();
        propsField();
        openField();
        break;
      case "complete-subtask":
        text("Set status to", "status", "Closed");
        break;
      case "unparent-all":
        break;
      case "adopt-matching":
        whereUI("Tasks in the same database where every filter matches:");
        break;
      case "edit-properties":
        changesUI();
        break;
      case "edit-matching":
        text("Database", "base", "Leave empty for this page's database", "The .base file name, e.g. Backup Strategy.base");
        whereUI("Pages in that database where every filter matches:");
        card.createDiv({ cls: "nk-bb-step-sub", text: "Change on each of them:" });
        changesUI();
        break;
      case "rename":
        text("New name", "name", "1-1 Meeting {{next:tuesday:MM-DD-YYYY}}", "{{title}} = current name, {{today:FORMAT}}, {{next:tuesday:FORMAT}} = the coming Tuesday (today counts), {{next:tuesday+1:FORMAT}} = a week after that.");
        break;
      case "insert": {
        new obsidian.Setting(card).setName("Text").addTextArea((t) => {
          t.setValue(step.text || "").onChange((v) => { step.text = v; });
          t.inputEl.rows = 4;
          t.inputEl.addClass("nk-bb-wide");
        });
        new obsidian.Setting(card).setName("Where").addDropdown((d) => d
          .addOption("above", "Above the button")
          .addOption("below", "Below the button")
          .addOption("top", "Top of the page")
          .setValue(step.position || "above")
          .onChange((v) => { step.position = v; }));
        break;
      }
      default:
        card.createDiv({ cls: "nk-bb-step-sub", text: "This action can only be edited in the code block." });
    }
  }
}

// ---------- Notion-style database templates ----------
//
// Each base ("database") gets its templates from Templates/<base name>/, e.g.
// Templates/RM Tasks/ for RM Tasks.base. A template is an ordinary note: its
// properties and content are copied into the new note, which goes in the base's
// folder with base: [[<base>.base]]. Template settings live in the template's
// own frontmatter, so they sync to every device:
//   title: Update Pilot Tracking {{today:MM/DD/YYYY}}   the new note's title
//   template-default: true                             the New button / board + use it
//   template-repeat: weekly on wed at 08:00            make one on a schedule
//   template-repeat-last: 2026-11-25T08:00             last scheduled run made
//   template-repeat-catch-up: latest                   missed runs: all (default) or latest
// Repeats run while Obsidian is open; runs missed while every device was off are made
// the next time Obsidian starts or comes back to the foreground (after a short wait
// so sync can bring in notes another device already made). Each scheduled note gets
// template-run: <database>/<template>@<time>, and a run that already has a note is skipped.
// See docs/templates.md.

const TEMPLATES_ROOT = "Templates";
const RUN_KEY = "template-run";
const REPEAT_KEY = "template-repeat";
const REPEAT_LAST_KEY = "template-repeat-last";
const REPEAT_CATCHUP_KEY = "template-repeat-catch-up";
const DEFAULT_KEY = "template-default";
const SLOT_FORMAT = "YYYY-MM-DDTHH:mm";
const MAX_CATCH_UP = 60;
const DAY_ABBR = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDINALS = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th" };
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ----- repeat rules -----
//   daily at 08:00                 every 2 days at 08:00 from 2026-11-27
//   weekdays at 08:00
//   weekly on mon, wed at 08:00    every 2 weeks on fri at 09:00 from 2026-11-27
//   monthly on day 1 at 06:00      every 3 months on day 1 at 06:00 from 2026-10-01
//   monthly on last day at 17:00
//   yearly on 01-15 at 09:00

function parseRepeat(raw) {
  if (raw === undefined || raw === null || raw === false) return null;
  let t = String(raw).trim().toLowerCase().replace(/\s+/g, " ");
  if (!t || t === "off" || t === "none" || t === "false") return null;
  const r = { freq: null, every: 1, days: [], monthDay: 1, month: 1, time: "09:00", from: null };
  let m = t.match(/\s+from (\d{4}-\d{2}-\d{2})$/);
  if (m) { r.from = m[1]; t = t.slice(0, m.index); }
  m = t.match(/\s+at (\d{1,2})(?::(\d{2}))? ?(am|pm)?$/);
  if (m) {
    let h = Number(m[1]);
    if (m[3] === "pm" && h < 12) h += 12;
    if (m[3] === "am" && h === 12) h = 0;
    r.time = `${String(Math.min(h, 23)).padStart(2, "0")}:${m[2] || "00"}`;
    t = t.slice(0, m.index);
  }
  m = t.match(/^every (\d+) (day|week|month|year)s?(?: (.*))?$/);
  let rest = "";
  if (m) { r.every = Math.max(1, Number(m[1])); r.freq = m[2]; rest = m[3] || ""; }
  else if ((m = t.match(/^(daily|weekdays|weekly|monthly|quarterly|yearly|annually)(?: (.*))?$/))) {
    r.freq = { daily: "day", weekdays: "weekdays", weekly: "week", monthly: "month", quarterly: "month", yearly: "year", annually: "year" }[m[1]];
    if (m[1] === "quarterly") r.every = 3;
    rest = m[2] || "";
  } else return null;
  if (r.freq === "week") {
    r.days = (rest.replace(/^on /, "").match(/[a-z]+/g) || []).map((d) => DAY_ABBR.indexOf(d.slice(0, 3))).filter((d) => d >= 0);
    if (!r.days.length) r.days = [r.from ? obsidian.moment(r.from).day() : 1];
    r.days = [...new Set(r.days)].sort();
  } else if (r.freq === "month") {
    const wk = rest.match(/(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last) (sun|mon|tue|wed|thu|fri|sat)[a-z]*/);
    if (wk) {
      const n = { "1st": 1, first: 1, "2nd": 2, second: 2, "3rd": 3, third: 3, "4th": 4, fourth: 4, "5th": 5, fifth: 5, last: "last" }[wk[1]];
      r.weekOfMonth = n;
      r.weekday = DAY_ABBR.indexOf(wk[2]);
    } else {
      const d = rest.match(/(last|\d{1,2})/);
      r.monthDay = d ? (d[1] === "last" ? "last" : Math.min(31, Math.max(1, Number(d[1])))) : 1;
    }
  } else if (r.freq === "year") {
    const d = rest.match(/(\d{1,2})-(\d{1,2})/);
    if (d) { r.month = Math.min(12, Number(d[1])); r.monthDay = Math.min(31, Number(d[2])); }
  }
  return r;
}

function repeatToString(r) {
  if (!r || !r.freq) return "";
  const at = ` at ${r.time || "09:00"}`;
  const n = Number(r.every) || 1;
  const from = n > 1 && r.from ? ` from ${r.from}` : "";
  const pad = (x) => String(x).padStart(2, "0");
  switch (r.freq) {
    case "day": return (n > 1 ? `every ${n} days` : "daily") + at + from;
    case "weekdays": return "weekdays" + at;
    case "week": return (n > 1 ? `every ${n} weeks` : "weekly") + ` on ${(r.days.length ? r.days : [1]).map((d) => DAY_ABBR[d]).join(", ")}` + at + from;
    case "month": return (n > 1 ? `every ${n} months` : "monthly") + ` on ${r.weekOfMonth ? `${r.weekOfMonth === "last" ? "last" : ORDINALS[r.weekOfMonth]} ${DAY_ABBR[r.weekday]}` : r.monthDay === "last" ? "last day" : "day " + r.monthDay}` + at + from;
    case "year": return (n > 1 ? `every ${n} years` : "yearly") + ` on ${pad(r.month)}-${pad(r.monthDay)}` + at + from;
  }
  return "";
}

function formatTime(time) {
  return obsidian.moment(time || "09:00", "HH:mm").format("h:mm A");
}

function describeRepeat(r) {
  if (!r) return "Doesn't repeat";
  const n = Number(r.every) || 1;
  const at = ` at ${formatTime(r.time)}`;
  const ord = (d) => obsidian.moment.localeData().ordinal(Number(d));
  switch (r.freq) {
    case "day": return (n > 1 ? `Every ${n} days` : "Every day") + at;
    case "weekdays": return "Every weekday" + at;
    case "week": return (n > 1 ? `Every ${n} weeks` : "Every week") + " on " + r.days.map((d) => DAY_LABEL[d]).join(", ") + at;
    case "month": {
      const on = r.weekOfMonth ? `the ${r.weekOfMonth === "last" ? "last" : ORDINALS[r.weekOfMonth]} ${DAY_LABEL[r.weekday]}` : r.monthDay === "last" ? "the last day" : "the " + ord(r.monthDay);
      return (n === 3 ? "Every quarter" : n > 1 ? `Every ${n} months` : "Every month") + ` on ${on}` + at;
    }
    case "year": return (n > 1 ? `Every ${n} years` : "Every year") + ` on ${MONTH_ABBR[r.month - 1]} ${r.monthDay}` + at;
  }
  return "Doesn't repeat";
}

function repeatMatchesDay(r, day) {
  const from = r.from ? obsidian.moment(r.from, "YYYY-MM-DD").startOf("day") : null;
  const n = Number(r.every) || 1;
  switch (r.freq) {
    case "day":
      return !from || n === 1 ? true : day.diff(from, "days") % n === 0 && !day.isBefore(from);
    case "weekdays":
      return day.day() >= 1 && day.day() <= 5;
    case "week": {
      if (!r.days.includes(day.day())) return false;
      if (n === 1 || !from) return true;
      const weeks = Math.round(day.clone().startOf("week").diff(from.clone().startOf("week"), "days") / 7);
      return weeks >= 0 && weeks % n === 0;
    }
    case "month": {
      const last = day.daysInMonth();
      if (r.weekOfMonth) {
        if (day.day() !== r.weekday) return false;
        if (r.weekOfMonth === "last" ? day.date() + 7 <= last : Math.ceil(day.date() / 7) !== r.weekOfMonth) return false;
      } else {
        const want = r.monthDay === "last" ? last : Math.min(Number(r.monthDay) || 1, last);
        if (day.date() !== want) return false;
      }
      if (n === 1 || !from) return true;
      const months = (day.year() - from.year()) * 12 + (day.month() - from.month());
      return months >= 0 && months % n === 0;
    }
    case "year": {
      if (day.month() + 1 !== r.month) return false;
      if (day.date() !== Math.min(r.monthDay, day.daysInMonth())) return false;
      return n === 1 || !from || ((day.year() - from.year()) >= 0 && (day.year() - from.year()) % n === 0);
    }
  }
  return false;
}

// the first scheduled time strictly after `after`
function nextRepeat(r, after) {
  if (!r) return null;
  const [h, mi] = String(r.time || "09:00").split(":").map(Number);
  let day = obsidian.moment(after).startOf("day");
  if (r.from && day.isBefore(obsidian.moment(r.from, "YYYY-MM-DD"))) day = obsidian.moment(r.from, "YYYY-MM-DD").startOf("day");
  for (let i = 0; i < 366 * Math.max(1, r.freq === "year" ? r.every : 1) + 400; i++) {
    if (repeatMatchesDay(r, day)) {
      const at = day.clone().hour(h || 0).minute(mi || 0).second(0).millisecond(0);
      if (at.isAfter(after)) return at;
    }
    day.add(1, "day");
  }
  return null;
}

// ----- the library -----

class TemplateLibrary {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.running = false;
    this.readyAt = 0;
  }

  get root() {
    return obsidian.normalizePath(this.plugin.settings.templatesFolder || TEMPLATES_ROOT);
  }
  get delaySeconds() {
    const v = Number(this.plugin.settings.repeatDelaySeconds);
    return Number.isFinite(v) && v >= 0 ? v : 15;
  }

  load() {
    const p = this.plugin;
    p.addCommand({ id: "new-from-template", name: "New note from template", callback: () => this.openPicker() });
    p.addCommand({ id: "manage-templates", name: "Manage templates", callback: () => this.openManager() });
    p.addCommand({ id: "run-repeating-templates", name: "Make any due repeating-template notes now", callback: () => this.runDue(true) });
    p.addRibbonIcon("copy-plus", "New note from template", () => this.openPicker());
    // repeats: after start-up (and after coming back to the foreground) wait for sync, then catch up
    this.app.workspace.onLayoutReady(() => this.scheduleCheck());
    p.registerDomEvent(document, "visibilitychange", () => { if (document.visibilityState === "visible") this.scheduleCheck(); });
    p.registerInterval(window.setInterval(() => { if (Date.now() >= this.readyAt) this.runDue(false); }, 60 * 1000));
  }

  scheduleCheck() {
    const ms = this.delaySeconds * 1000;
    this.readyAt = Date.now() + ms;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => { this.timer = null; this.runDue(false); }, ms);
  }

  unload() {
    if (this.timer) window.clearTimeout(this.timer);
  }

  // ----- databases and their templates -----

  fm(file) {
    const c = this.app.metadataCache.getFileCache(file);
    return (c && c.frontmatter) || {};
  }

  databases() {
    const out = [];
    for (const f of this.app.vault.getFiles()) {
      if (f.extension !== "base") continue;
      const folder = this.app.vault.getAbstractFileByPath(obsidian.normalizePath(`${this.root}/${f.basename}`));
      if (!(folder instanceof obsidian.TFolder)) continue;
      out.push(this.dbFor(f, folder));
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  dbFor(baseFile, folder) {
    return {
      name: baseFile.basename,
      base: baseFile,
      folderPath: folder ? folder.path : obsidian.normalizePath(`${this.root}/${baseFile.basename}`),
      notesFolder: baseFile.parent ? baseFile.parent.path : "",
      baseLink: `[[${baseFile.name}]]`,
    };
  }

  dbForBase(baseFile) {
    if (!baseFile) return null;
    const folder = this.app.vault.getAbstractFileByPath(obsidian.normalizePath(`${this.root}/${baseFile.basename}`));
    return this.dbFor(baseFile, folder instanceof obsidian.TFolder ? folder : null);
  }

  templates(db) {
    const prefix = db.folderPath + "/";
    const list = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(prefix));
    const name = (f) => f.path.slice(prefix.length).replace(/\.md$/, "");
    return list
      .map((f) => ({ file: f, name: name(f), fm: this.fm(f) }))
      .map((t) => Object.assign(t, { isDefault: t.fm[DEFAULT_KEY] === true || String(t.fm[DEFAULT_KEY]).toLowerCase() === "true", repeat: parseRepeat(t.fm[REPEAT_KEY]) }))
      .sort((a, b) => (b.isDefault - a.isDefault) || a.name.localeCompare(b.name));
  }

  defaultTemplate(db) {
    return db ? this.templates(db).find((t) => t.isDefault) || null : null;
  }

  templateIcon(t) {
    return t.fm.icon ? String(t.fm.icon) : "";
  }

  // ----- making notes -----

  // opts: { now (moment), open: "tab" | "none", properties: {}, runId }
  async create(db, tpl, opts) {
    opts = opts || {};
    const now = opts.now || null;
    const read = tpl ? await this.plugin.noteButtons.readTemplate(tpl.file.path) : { fm: {}, body: "" };
    const rawTitle = opts.title !== undefined ? opts.title : read.fm[TITLE_KEY] !== undefined ? String(read.fm[TITLE_KEY] || "") : tpl ? tpl.file.basename : "";
    const title = expandVars(rawTitle, null, now).replace(/\s+/g, " ").trim();
    const folder = db.notesFolder;
    if (folder && !this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
    const note = await this.app.vault.create(uniqueNotePath(this.app, folder, safeFileName(title || "Untitled")), expandBody(read.body || "", null, now));
    await this.app.fileManager.processFrontMatter(note, (fm) => {
      for (const [k, v] of Object.entries(read.fm)) if (!skipTemplateKey(k)) fm[k] = expandValue(v, null, now);
      fm[TITLE_KEY] = title;
      fm.base = db.baseLink;
      for (const [k, v] of Object.entries(opts.properties || {})) fm[k] = v;
      if (opts.runId) fm[RUN_KEY] = opts.runId;
    });
    if (opts.open !== "none") {
      // an empty title (or one ending in " - ", Notion's "finish typing the name") gets the cursor
      if (!title || / [-–:]$/.test(rawTitle.trimEnd())) this.plugin.focusTitlePath = note.path;
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(note, { state: { mode: "source" } });
    }
    return note;
  }

  async guard(fn) {
    try { return await fn(); } catch (e) {
      console.error("[notion-style-kanban] templates", e);
      new obsidian.Notice("Template failed: " + (e && e.message ? e.message : e));
    }
  }

  // ----- menus -----

  // the Notion "New ▾" menu for one database
  showNewMenu(db, ev, extra) {
    const menu = new obsidian.Menu();
    const list = this.templates(db);
    for (const t of list) {
      menu.addItem((i) => {
        i.setTitle(t.name + (t.isDefault ? "  (default)" : "") + (t.repeat ? "  ↻" : ""))
          .setIcon(t.repeat ? "repeat" : "file-text")
          .onClick(() => this.guard(() => this.create(db, t, extra)));
        const ic = this.templateIcon(t);
        if (ic && i.iconEl) { i.iconEl.empty(); if (!renderIconValue(i.iconEl, ic)) setIconSafe(i.iconEl, ["file-text"]); }
      });
    }
    if (list.length) menu.addSeparator();
    menu.addItem((i) => i.setTitle("Empty page").setIcon("file").onClick(() => this.guard(() => this.create(db, null, Object.assign({ title: "" }, extra || {})))));
    menu.addItem((i) => i.setTitle("New template").setIcon("plus").onClick(() => this.guard(() => this.newTemplate(db))));
    menu.addItem((i) => i.setTitle("Manage templates…").setIcon("settings").onClick(() => this.openManager(db)));
    if (ev instanceof MouseEvent) menu.showAtMouseEvent(ev);
    else if (ev && ev.getBoundingClientRect) { const r = ev.getBoundingClientRect(); menu.showAtPosition({ x: r.left, y: r.bottom + 4 }); }
    else menu.showAtPosition({ x: window.innerWidth / 2, y: 120 });
  }

  // the main "New" button: the default template, or an empty page
  async newDefault(db, extra) {
    const t = this.defaultTemplate(db);
    return this.create(db, t, Object.assign(t ? {} : { title: "" }, extra || {}));
  }

  openPicker() {
    const items = [];
    for (const db of this.databases()) {
      for (const t of this.templates(db)) items.push({ db, t });
      items.push({ db, t: null });
    }
    if (!items.length) {
      new obsidian.Notice(`No templates yet. Put templates in ${this.root}/<base name>/, or use "Manage templates".`);
      return;
    }
    new TemplatePickerModal(this, items).open();
  }

  openManager(db) {
    const dbs = this.databases();
    if (!db) {
      const active = this.app.workspace.getActiveFile();
      if (active && active.extension === "base") db = this.dbForBase(active);
      else if (active) {
        const base = parseLink(asString(this.fm(active).base)).linkpath;
        const bf = base ? this.app.metadataCache.getFirstLinkpathDest(base, active.path) : null;
        if (bf) db = this.dbForBase(bf);
      }
    }
    if (!db) db = dbs[0];
    if (!db) {
      const bases = this.app.vault.getFiles().filter((f) => f.extension === "base");
      if (!bases.length) return new obsidian.Notice("No bases in this vault yet.");
      db = this.dbForBase(bases[0]);
    }
    new TemplateManagerModal(this, db).open();
  }

  async newTemplate(db, name) {
    await this.ensureFolder(db.folderPath);
    const path = uniqueNotePath(this.app, db.folderPath, safeFileName(name || "New template"));
    const file = await this.app.vault.create(path, "");
    await this.app.fileManager.processFrontMatter(file, (fm) => { fm[TITLE_KEY] = ""; });
    this.plugin.focusTitlePath = null;
    await this.app.workspace.getLeaf("tab").openFile(file, { state: { mode: "source" } });
    new obsidian.Notice("New template: rename the file to name the template. Its title property becomes the new note's title.");
    return file;
  }

  async ensureFolder(path) {
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const p = parts.slice(0, i).join("/");
      if (!this.app.vault.getAbstractFileByPath(p)) await this.app.vault.createFolder(p);
    }
  }

  async setDefault(db, tpl) {
    for (const t of this.templates(db)) {
      const want = !!tpl && t.file.path === tpl.file.path && !t.isDefault;
      if (want === t.isDefault) continue;
      await this.app.fileManager.processFrontMatter(t.file, (fm) => { if (want) fm[DEFAULT_KEY] = true; else delete fm[DEFAULT_KEY]; });
    }
  }

  async duplicate(db, tpl) {
    const text = await this.app.vault.read(tpl.file);
    const folder = tpl.file.parent ? tpl.file.parent.path : db.folderPath;
    const file = await this.app.vault.create(uniqueNotePath(this.app, folder, tpl.file.basename + " copy"), text);
    await this.app.fileManager.processFrontMatter(file, (fm) => { delete fm[DEFAULT_KEY]; delete fm[REPEAT_KEY]; delete fm[REPEAT_LAST_KEY]; });
    return file;
  }

  async setRepeat(tpl, rule, catchUp) {
    const str = repeatToString(rule);
    await this.app.fileManager.processFrontMatter(tpl.file, (fm) => {
      const before = fm[REPEAT_KEY];
      if (!str) { delete fm[REPEAT_KEY]; delete fm[REPEAT_LAST_KEY]; delete fm[REPEAT_CATCHUP_KEY]; return; }
      fm[REPEAT_KEY] = str;
      // a new or changed schedule starts from now: no notes for times before it was set
      if (before !== str || !fm[REPEAT_LAST_KEY]) fm[REPEAT_LAST_KEY] = obsidian.moment().format(SLOT_FORMAT);
      if (catchUp === "latest") fm[REPEAT_CATCHUP_KEY] = "latest"; else delete fm[REPEAT_CATCHUP_KEY];
    });
  }

  // ----- repeats -----

  runIds() {
    const ids = new Set();
    for (const f of this.app.vault.getMarkdownFiles()) {
      const v = this.fm(f)[RUN_KEY];
      if (v) ids.add(String(v));
    }
    return ids;
  }

  async runDue(manual) {
    if (this.running) return;
    this.running = true;
    let made = 0;
    try {
      const now = obsidian.moment();
      let ids = null;
      for (const db of this.databases()) {
        for (const t of this.templates(db)) {
          if (!t.repeat) continue;
          const lastRaw = t.fm[REPEAT_LAST_KEY];
          const last = lastRaw ? obsidian.moment(String(lastRaw), [SLOT_FORMAT, "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"]) : null;
          if (!last || !last.isValid()) {
            // first time this device sees the schedule: start from now
            await this.app.fileManager.processFrontMatter(t.file, (fm) => { fm[REPEAT_LAST_KEY] = now.format(SLOT_FORMAT); });
            continue;
          }
          let due = [];
          let s = nextRepeat(t.repeat, last);
          while (s && !s.isAfter(now) && due.length < 1000) { due.push(s); s = nextRepeat(t.repeat, s); }
          if (!due.length) continue;
          const newest = due[due.length - 1];
          if (String(t.fm[REPEAT_CATCHUP_KEY] || "").toLowerCase() === "latest") due = [newest];
          else if (due.length > MAX_CATCH_UP) due = due.slice(-MAX_CATCH_UP);
          if (!ids) ids = this.runIds();
          for (const slot of due) {
            const runId = `${db.name}/${t.name}@${slot.format(SLOT_FORMAT)}`;
            if (ids.has(runId)) continue;
            await this.create(db, t, { now: slot, open: "none", runId });
            ids.add(runId);
            made++;
          }
          await this.app.fileManager.processFrontMatter(t.file, (fm) => { fm[REPEAT_LAST_KEY] = newest.format(SLOT_FORMAT); });
        }
      }
    } catch (e) {
      console.error("[notion-style-kanban] repeating templates", e);
      new obsidian.Notice("Repeating templates failed: " + (e && e.message ? e.message : e));
    } finally {
      this.running = false;
    }
    if (made) new obsidian.Notice(`Made ${made} note${made === 1 ? "" : "s"} from repeating templates`);
    else if (manual) new obsidian.Notice("No repeating templates are due.");
  }
}

class TemplatePickerModal extends obsidian.FuzzySuggestModal {
  constructor(lib, items) {
    super(lib.app);
    this.lib = lib;
    this.items = items;
    this.setPlaceholder("New note from template…");
  }
  getItems() { return this.items; }
  getItemText(it) { return `${it.db.name} › ${it.t ? it.t.name : "Empty page"}`; }
  renderSuggestion(match, el) {
    const it = match.item;
    el.addClass("nk-tpl-suggestion");
    const ic = el.createSpan({ cls: "nk-tpl-suggestion-icon" });
    if (!(it.t && it.t.fm.icon && renderIconValue(ic, String(it.t.fm.icon)))) setIconSafe(ic, [it.t ? (it.t.repeat ? "repeat" : "file-text") : "file"]);
    const body = el.createDiv({ cls: "nk-tpl-suggestion-body" });
    body.createDiv({ text: it.t ? it.t.name : "Empty page" });
    const sub = [it.db.name];
    if (it.t && it.t.isDefault) sub.push("default");
    if (it.t && it.t.repeat) sub.push(describeRepeat(it.t.repeat));
    body.createDiv({ cls: "nk-tpl-suggestion-sub", text: sub.join(" · ") });
  }
  onChooseItem(it) {
    this.lib.guard(() => this.lib.create(it.db, it.t, it.t ? {} : { title: "" }));
  }
}

class TemplateManagerModal extends obsidian.Modal {
  constructor(lib, db) {
    super(lib.app);
    this.lib = lib;
    this.db = db;
  }
  onOpen() {
    this.modalEl.addClass("nk-tpl-manager");
    this.draw();
    this.ref = this.app.metadataCache.on("changed", (f) => { if (f.path.startsWith(this.db.folderPath + "/")) this.drawSoon(); });
    this.drawSoon = obsidian.debounce(() => this.draw(), 150, true);
  }
  onClose() {
    if (this.ref) this.app.metadataCache.offref(this.ref);
    this.contentEl.empty();
  }
  draw() {
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.setText("Templates");
    const top = new obsidian.Setting(contentEl).setName("Database").setDesc(`Templates are the notes in ${this.db.folderPath}/`);
    const bases = this.app.vault.getFiles().filter((f) => f.extension === "base").sort((a, b) => a.basename.localeCompare(b.basename));
    top.addDropdown((d) => {
      for (const b of bases) d.addOption(b.path, b.basename);
      d.setValue(this.db.base.path).onChange((v) => {
        const bf = this.app.vault.getAbstractFileByPath(v);
        if (bf instanceof obsidian.TFile) { this.db = this.lib.dbForBase(bf); this.draw(); }
      });
    });
    top.addButton((b) => b.setButtonText("New template").setCta().onClick(async () => { this.close(); await this.lib.guard(() => this.lib.newTemplate(this.db)); }));

    const list = this.lib.templates(this.db);
    if (!list.length) contentEl.createDiv({ cls: "nk-tpl-empty", text: "No templates yet." });
    for (const t of list) {
      const row = new obsidian.Setting(contentEl);
      row.settingEl.addClass("nk-tpl-row");
      const nameEl = row.nameEl;
      nameEl.empty();
      const ic = nameEl.createSpan({ cls: "nk-tpl-row-icon" });
      if (!(t.fm.icon && renderIconValue(ic, String(t.fm.icon)))) setIconSafe(ic, ["file-text"]);
      nameEl.createSpan({ text: t.name });
      if (t.isDefault) nameEl.createSpan({ cls: "nk-tpl-badge", text: "Default" });
      const desc = [];
      if (t.fm[TITLE_KEY]) desc.push(`Title: ${t.fm[TITLE_KEY]}`);
      if (t.repeat) {
        const next = nextRepeat(t.repeat, obsidian.moment());
        desc.push(`↻ ${describeRepeat(t.repeat)}${next ? ` · next ${next.format("ddd MMM D, h:mm A")}` : ""}`);
      }
      row.setDesc(desc.join("  ·  "));
      row.addExtraButton((b) => b.setIcon("file-plus").setTooltip("New note from this template").onClick(() => { this.close(); this.lib.guard(() => this.lib.create(this.db, t)); }));
      row.addExtraButton((b) => b.setIcon("pencil").setTooltip("Edit template").onClick(() => { this.close(); this.app.workspace.getLeaf("tab").openFile(t.file, { state: { mode: "source" } }); }));
      row.addExtraButton((b) => b.setIcon("repeat").setTooltip("Repeat…").onClick(() => new RepeatModal(this.lib, t, () => this.draw()).open()));
      row.addExtraButton((b) => b.setIcon(t.isDefault ? "star-off" : "star").setTooltip(t.isDefault ? "Stop using as default" : "Set as default").onClick(async () => { await this.lib.setDefault(this.db, t); window.setTimeout(() => this.draw(), 150); }));
      row.addExtraButton((b) => b.setIcon("copy").setTooltip("Duplicate").onClick(async () => { await this.lib.guard(() => this.lib.duplicate(this.db, t)); window.setTimeout(() => this.draw(), 150); }));
      row.addExtraButton((b) => b.setIcon("trash-2").setTooltip("Delete").onClick(() => {
        new ConfirmModal(this.app, "Delete template", `Delete the template "${t.name}"? Notes made from it are kept.`, "Delete", async () => {
          await this.app.vault.trash(t.file, true);
          window.setTimeout(() => this.draw(), 150);
        }).open();
      }));
    }
  }
}

class RepeatModal extends obsidian.Modal {
  constructor(lib, tpl, onDone) {
    super(lib.app);
    this.lib = lib;
    this.tpl = tpl;
    this.onDone = onDone;
    const r = tpl.repeat;
    this.r = r ? Object.assign({}, r, { days: [...r.days] }) : { freq: null, every: 1, days: [obsidian.moment().day()], monthDay: obsidian.moment().date(), month: obsidian.moment().month() + 1, time: "09:00", from: null };
    this.catchUp = String(tpl.fm[REPEAT_CATCHUP_KEY] || "").toLowerCase() === "latest" ? "latest" : "all";
  }
  onOpen() {
    this.modalEl.addClass("nk-repeat-modal");
    this.titleEl.setText(`Repeat “${this.tpl.name}”`);
    this.draw();
  }
  onClose() { this.contentEl.empty(); }
  draw() {
    const { contentEl } = this;
    const r = this.r;
    contentEl.empty();
    new obsidian.Setting(contentEl).setName("Repeat").addDropdown((d) => {
      d.addOption("", "Off").addOption("day", "Daily").addOption("weekdays", "Every weekday").addOption("week", "Weekly").addOption("month", "Monthly").addOption("year", "Yearly");
      d.setValue(r.freq || "").onChange((v) => { r.freq = v || null; if (r.freq === "weekdays") r.every = 1; this.draw(); });
    });
    if (r.freq && r.freq !== "weekdays") {
      const unit = { day: "days", week: "weeks", month: "months", year: "years" }[r.freq];
      new obsidian.Setting(contentEl).setName("Every").setDesc(unit).addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "1";
        t.inputEl.style.width = "5em";
        t.setValue(String(r.every || 1)).onChange((v) => { r.every = Math.max(1, Number(v) || 1); this.preview(); });
      });
    }
    if (r.freq === "week") {
      const s = new obsidian.Setting(contentEl).setName("On");
      const box = s.controlEl.createDiv({ cls: "nk-repeat-days" });
      DAY_LABEL.forEach((label, i) => {
        const b = box.createEl("button", { text: label, cls: r.days.includes(i) ? "is-on mod-cta" : "" });
        b.onclick = () => {
          r.days = r.days.includes(i) ? r.days.filter((d) => d !== i) : [...r.days, i].sort();
          if (!r.days.length) r.days = [i];
          this.draw();
        };
      });
    }
    if (r.freq === "month") {
      new obsidian.Setting(contentEl).setName("On").addDropdown((d) => {
        d.addOption("date", "Day of the month").addOption("weekday", "Weekday of the month");
        d.setValue(r.weekOfMonth ? "weekday" : "date").onChange((v) => {
          if (v === "weekday") { r.weekOfMonth = Math.min(4, Math.ceil(obsidian.moment().date() / 7)); r.weekday = obsidian.moment().day(); }
          else r.weekOfMonth = null;
          this.draw();
        });
      });
      if (r.weekOfMonth) {
        new obsidian.Setting(contentEl).setName("Which").addDropdown((d) => {
          for (const k of [1, 2, 3, 4, 5]) d.addOption(String(k), ORDINALS[k]);
          d.addOption("last", "Last");
          d.setValue(String(r.weekOfMonth)).onChange((v) => { r.weekOfMonth = v === "last" ? "last" : Number(v); this.preview(); });
        }).addDropdown((d) => {
          DAY_LABEL.forEach((l, i) => d.addOption(String(i), l));
          d.setValue(String(r.weekday)).onChange((v) => { r.weekday = Number(v); this.preview(); });
        });
      } else {
        new obsidian.Setting(contentEl).setName("On day").addDropdown((d) => {
          for (let i = 1; i <= 31; i++) d.addOption(String(i), String(i));
          d.addOption("last", "Last day");
          d.setValue(String(r.monthDay)).onChange((v) => { r.monthDay = v === "last" ? "last" : Number(v); this.preview(); });
        });
      }
    }
    if (r.freq === "year") {
      new obsidian.Setting(contentEl).setName("On").addDropdown((d) => {
        MONTH_ABBR.forEach((m, i) => d.addOption(String(i + 1), m));
        d.setValue(String(r.month)).onChange((v) => { r.month = Number(v); this.preview(); });
      }).addDropdown((d) => {
        for (let i = 1; i <= 31; i++) d.addOption(String(i), String(i));
        d.setValue(String(r.monthDay)).onChange((v) => { r.monthDay = Number(v); this.preview(); });
      });
    }
    if (r.freq) {
      new obsidian.Setting(contentEl).setName("Time").addText((t) => {
        t.inputEl.type = "time";
        t.setValue(r.time || "09:00").onChange((v) => { if (/^\d{2}:\d{2}$/.test(v)) { r.time = v; this.preview(); } });
      });
      if (r.freq !== "weekdays" && (Number(r.every) || 1) > 1) {
        new obsidian.Setting(contentEl).setName("Starting").setDesc("Counts the weeks/months from this date").addText((t) => {
          t.inputEl.type = "date";
          t.setValue(r.from || obsidian.moment().format("YYYY-MM-DD")).onChange((v) => { r.from = v || null; this.preview(); });
          if (!r.from) r.from = obsidian.moment().format("YYYY-MM-DD");
        });
      }
      new obsidian.Setting(contentEl).setName("If Obsidian was closed").setDesc("When runs were missed because no device had Obsidian open").addDropdown((d) => {
        d.addOption("all", "Make a note for every missed run").addOption("latest", "Only make the latest one");
        d.setValue(this.catchUp).onChange((v) => { this.catchUp = v; });
      });
    }
    this.previewEl = contentEl.createDiv({ cls: "nk-repeat-preview" });
    this.preview();
    new obsidian.Setting(contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) => b.setButtonText("Save").setCta().onClick(async () => {
        await this.lib.guard(() => this.lib.setRepeat(this.tpl, r.freq ? r : null, this.catchUp));
        this.close();
        if (this.onDone) window.setTimeout(this.onDone, 150);
      }));
  }
  preview() {
    if (!this.previewEl) return;
    this.previewEl.empty();
    const r = this.r;
    if (!r.freq) { this.previewEl.setText("This template doesn't repeat."); return; }
    const rule = parseRepeat(repeatToString(r));
    this.previewEl.createDiv({ text: describeRepeat(rule) });
    const ul = this.previewEl.createEl("ul");
    let at = obsidian.moment();
    for (let i = 0; i < 3; i++) {
      at = nextRepeat(rule, at);
      if (!at) break;
      ul.createEl("li", { text: at.format("dddd, MMM D, YYYY [at] h:mm A") });
    }
  }
}

// ---------- Notion-style comments under the properties ----------
//
// Comments live in the note body, right after the frontmatter, as callouts:
//   > [!comment|page] Comment                 (page comments, one thread)
//   > [!comment] On “highlighted text”         (an imported inline comment thread)
//   > **Name** · Dec 12, 2025, 1:43 PM
//   > comment text
//   >
//   > **Name** · ...
// The panel shows them Notion-style and hides the raw callouts; without the
// plugin they still read fine as ordinary callouts.

const COMMENT_TIME_FORMAT = "MMM D, YYYY, h:mm A";
const COMMENT_HEAD_RE = /^\*\*(.+?)\*\* · (.+)$/;
const CALLOUT_START_RE = /^>\s*\[!comment(?:\|([^\]]*))?\][+-]?\s*(.*)$/i;

function splitFrontmatter(text) {
  const m = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text);
  return m ? m[0].length : 0;
}

// Find the run of comment callouts at the top of the body.
// Returns { bodyStart, start, end, threads:[{ kind, title, lineStart, lineEnd, comments:[{author, time, text, lineStart, lineEnd}] }] }
// where line numbers index into `lines` (the whole file split on \n).
function parseComments(text) {
  const lines = text.split("\n");
  const fmLen = splitFrontmatter(text);
  let i = fmLen ? text.slice(0, fmLen).split("\n").length - 1 : 0;
  if (fmLen && !text.slice(0, fmLen).endsWith("\n")) i += 1;
  const bodyStart = i;
  const threads = [];
  let j = i;
  while (j < lines.length && lines[j].trim() === "") j++;
  const start = j;
  let end = start;
  while (j < lines.length) {
    const m = CALLOUT_START_RE.exec(lines[j].replace(/\r$/, ""));
    if (!m) break;
    const meta = (m[1] || "").trim().toLowerCase();
    const t = { kind: meta === "page" ? "page" : "inline", title: m[2].trim(), lineStart: j, comments: [] };
    j++;
    let cur = null;
    while (j < lines.length && /^>/.test(lines[j])) {
      const raw = lines[j].replace(/\r$/, "").replace(/^>\s?/, "");
      const h = COMMENT_HEAD_RE.exec(raw.trim());
      if (h) {
        cur = { author: h[1], time: h[2], body: [], lineStart: j, lineEnd: j + 1 };
        t.comments.push(cur);
      } else if (cur) {
        cur.body.push(raw);
        cur.lineEnd = j + 1;
      }
      j++;
    }
    t.lineEnd = j;
    for (const c of t.comments) {
      c.text = c.body.join("\n").trim();
      delete c.body;
    }
    threads.push(t);
    end = j;
    while (j < lines.length && lines[j].trim() === "") j++;
  }
  return { lines, bodyStart, start, end, threads };
}

function quoteLines(text) {
  return text.split(/\r?\n/).map((l) => (l ? "> " + l : ">"));
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  return ((parts[0] || "?")[0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// "[[" link suggestions for plain textareas (comment boxes), modeled on
// Obsidian's editor link suggester: type [[, pick a note, get [[link]].
class TextareaLinkSuggest {
  constructor(app, textarea, sourcePath) {
    this.app = app;
    this.el = textarea;
    this.sourcePath = sourcePath || "";
    this.popup = null;
    this.items = [];
    this.selected = 0;
    this.start = -1;
    const refresh = () => this.update();
    textarea.addEventListener("input", refresh);
    textarea.addEventListener("click", refresh);
    textarea.addEventListener("blur", () => window.setTimeout(() => this.close(), 150));
  }

  isOpen() { return !!this.popup; }

  // Call first from the textarea's keydown handler; returns true when the
  // key was used by the suggester (so the caller must not act on it).
  handleKey(e) {
    if (!this.popup) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") window.setTimeout(() => this.update(), 0);
      return false;
    }
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) { this.move(1); e.preventDefault(); return true; }
    if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) { this.move(-1); e.preventDefault(); return true; }
    if ((e.key === "Enter" && !e.isComposing) || e.key === "Tab") {
      e.preventDefault();
      if (this.items.length) this.choose(this.items[this.selected]); else this.close();
      return true;
    }
    if (e.key === "Escape") { e.preventDefault(); this.close(); return true; }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") window.setTimeout(() => this.update(), 0);
    return false;
  }

  update() {
    const ta = this.el;
    if (ta.selectionStart !== ta.selectionEnd) return this.close();
    const caret = ta.selectionStart;
    const before = ta.value.slice(0, caret);
    const m = before.match(/\[\[([^\[\]\|#\n]*)$/);
    if (!m) return this.close();
    this.start = caret - m[0].length;
    this.query = m[1];
    this.items = this.search(m[1]);
    this.selected = 0;
    this.render();
  }

  search(query) {
    const files = this.app.vault.getFiles().filter((f) => f.path !== this.sourcePath);
    const q = query.trim();
    const out = [];
    if (!q) {
      // Like Obsidian: most recently opened first, then most recently edited.
      const recent = (this.app.workspace.getLastOpenFiles ? this.app.workspace.getLastOpenFiles() : []);
      const byPath = new Map(files.map((f) => [f.path, f]));
      const seen = new Set();
      for (const p of recent) { const f = byPath.get(p); if (f && !seen.has(p)) { seen.add(p); out.push(f); } }
      const rest = files.filter((f) => !seen.has(f.path)).sort((a, b) => b.stat.mtime - a.stat.mtime);
      return out.concat(rest).slice(0, 20).map((f) => ({ file: f }));
    }
    const fuzzy = obsidian.prepareFuzzySearch(q);
    const scored = [];
    for (const f of files) {
      const title = f.extension === "md" ? displayTitle(f, this.app) : f.name;
      const name = f.extension === "md" ? f.basename : f.name;
      let best = null;
      for (const s of [title, name, f.path]) {
        const r = fuzzy(s);
        if (r && (!best || r.score > best.score)) best = r;
      }
      if (best) scored.push({ file: f, score: best.score + (f.extension === "md" ? 0 : -1) });
    }
    scored.sort((a, b) => b.score - a.score || a.file.path.length - b.file.path.length);
    return scored.slice(0, 30);
  }

  render() {
    if (!this.el.isConnected) return this.close();
    if (!this.popup) {
      // The panel can be rebuilt under us; drop the popup if the box goes away.
      this.watch = window.setInterval(() => { if (!this.el.isConnected || document.activeElement !== this.el) this.close(); }, 300);
      this.popup = document.body.createDiv({ cls: "suggestion-container nk-link-suggest" });
      this.listEl = this.popup.createDiv({ cls: "suggestion" });
    }
    this.listEl.empty();
    if (!this.items.length) {
      this.listEl.createDiv({ cls: "suggestion-empty", text: "No match found" });
    }
    this.items.forEach((it, i) => {
      const f = it.file;
      const row = this.listEl.createDiv({ cls: "suggestion-item mod-complex" + (i === this.selected ? " is-selected" : "") });
      const content = row.createDiv({ cls: "suggestion-content" });
      const title = f.extension === "md" ? displayTitle(f, this.app) : f.name;
      content.createDiv({ cls: "suggestion-title", text: title });
      const folder = f.parent && f.parent.path !== "/" ? f.parent.path : "";
      const note = title !== f.basename && f.extension === "md" ? (folder ? folder + "/" : "") + f.basename : folder;
      if (note) content.createDiv({ cls: "suggestion-note", text: note });
      row.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); this.choose(it); });
      row.addEventListener("mousemove", () => { if (this.selected !== i) { this.selected = i; this.highlight(); } });
    });
    this.position();
  }

  highlight() {
    const rows = this.listEl.querySelectorAll(".suggestion-item");
    rows.forEach((r, i) => r.toggleClass("is-selected", i === this.selected));
    const cur = rows[this.selected];
    if (cur) cur.scrollIntoView({ block: "nearest" });
  }

  move(d) {
    if (!this.items.length) return;
    this.selected = (this.selected + d + this.items.length) % this.items.length;
    this.highlight();
  }

  position() {
    const r = this.el.getBoundingClientRect();
    const p = this.popup;
    p.style.position = "fixed";
    p.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 360)) + "px";
    p.style.width = Math.max(280, Math.min(r.width, 420)) + "px";
    const below = window.innerHeight - r.bottom;
    if (below < 240 && r.top > below) {
      p.style.top = "";
      p.style.bottom = (window.innerHeight - r.top + 4) + "px";
    } else {
      p.style.bottom = "";
      p.style.top = (r.bottom + 4) + "px";
    }
  }

  choose(it) {
    const ta = this.el;
    const f = it.file;
    const link = this.app.metadataCache.fileToLinktext(f, this.sourcePath, f.extension === "md");
    const caret = ta.selectionStart;
    let end = caret;
    if (ta.value.slice(caret, caret + 2) === "]]") end += 2;
    const text = "[[" + link + "]]";
    ta.value = ta.value.slice(0, this.start) + text + ta.value.slice(end);
    const pos = this.start + text.length;
    ta.setSelectionRange(pos, pos);
    this.close();
    ta.focus();
    ta.dispatchEvent(new Event("input"));
  }

  close() {
    if (this.popup) { this.popup.remove(); this.popup = null; }
    if (this.watch) { window.clearInterval(this.watch); this.watch = null; }
    this.items = [];
  }
}

class CommentsPanel {
  constructor(plugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.refreshSoon = obsidian.debounce(() => this.refreshAll(), 80, true);
  }

  get author() {
    return (this.plugin.settings.commentAuthor || "").trim() || "Me";
  }

  load() {
    const p = this.plugin;
    p.registerEvent(this.app.workspace.on("layout-change", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("file-open", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshSoon()));
    p.registerEvent(this.app.vault.on("modify", (f) => { if (f.extension === "md") this.refreshSoon(); }));
    this.observer = new MutationObserver(() => this.refreshSoon());
    this.app.workspace.onLayoutReady(() => this.refreshAll());
    document.body.classList.add("nk-comments-on");
  }

  unload() {
    if (this.observer) this.observer.disconnect();
    document.body.classList.remove("nk-comments-on");
    document.querySelectorAll(".nk-comments").forEach((e) => {
      if (e._nkComponent) e._nkComponent.unload();
      e.remove();
    });
  }

  refreshAll() {
    if (this.observer) this.observer.disconnect();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!view || !view.file || !view.containerEl) continue;
      this.renderInView(view);
      if (this.observer) {
        view.containerEl.querySelectorAll(".markdown-preview-sizer, .cm-sizer, .mod-header").forEach((h) => this.observer.observe(h, { childList: true }));
      }
    }
  }

  async renderInView(view) {
    const file = view.file;
    let text;
    try {
      text = await this.app.vault.cachedRead(file);
    } catch (e) {
      return;
    }
    const parsed = parseComments(text);
    const key = file.path + "\u0000" + this.author + "\u0000" + JSON.stringify(parsed.threads.map((t) => [t.kind, t.title, t.comments]));
    const hosts = view.containerEl.querySelectorAll(".markdown-source-view .cm-sizer, .markdown-preview-view .markdown-preview-sizer");
    hosts.forEach((host) => {
      const header = host.querySelector(":scope > .mod-header") || host;
      const meta = header.querySelector(":scope > .metadata-container");
      const before = meta ? meta.nextSibling : header.querySelector(":scope > .cm-contentContainer");
      let panel = header.querySelector(":scope > .nk-comments");
      if (!panel || (meta && panel.previousSibling !== meta)) {
        if (panel) panel.remove();
        panel = createDiv({ cls: "nk-comments" });
        // keep the editor from taking over clicks and drags, so comment text can be selected and copied
        for (const evt of ["mousedown", "pointerdown", "selectstart", "dragstart"]) {
          panel.addEventListener(evt, (e) => e.stopPropagation());
        }
        header.insertBefore(panel, before || null);
        panel.dataset.key = "";
      }
      if (panel.dataset.key === key) return;
      if (panel.querySelector(".nk-comment.is-editing")) return;
      // keep an unsent draft if the panel re-renders
      const draftEl = panel.querySelector(".nk-comment-add .nk-comment-input");
      const draft = draftEl && panel.dataset.path === file.path ? draftEl.value : "";
      panel.dataset.key = key;
      panel.dataset.path = file.path;
      this.renderPanel(panel, file, parsed, draft);
    });
  }

  renderPanel(panel, file, parsed, draft) {
    if (panel._nkComponent) panel._nkComponent.unload();
    const comp = new obsidian.Component();
    comp.load();
    panel._nkComponent = comp;
    panel.empty();
    const pageThreads = parsed.threads.filter((t) => t.kind === "page");
    const inline = parsed.threads.filter((t) => t.kind !== "page");

    const list = panel.createDiv({ cls: "nk-comments-list" });
    const renderComment = (parent, c, thread, idx) => {
      const row = parent.createDiv({ cls: "nk-comment" });
      row.createDiv({ cls: "nk-comment-avatar", text: initials(c.author) });
      const main = row.createDiv({ cls: "nk-comment-main" });
      const head = main.createDiv({ cls: "nk-comment-head" });
      head.createSpan({ cls: "nk-comment-author", text: c.author });
      head.createSpan({ cls: "nk-comment-time", text: c.time });
      const tools = head.createSpan({ cls: "nk-comment-tools" });
      const edit = tools.createSpan({ cls: "nk-comment-tool nk-comment-edit-btn", attr: { "aria-label": "Edit comment" } });
      setIconSafe(edit, ["pencil", "edit", "edit-3"]);
      const del = tools.createSpan({ cls: "nk-comment-tool nk-comment-delete", attr: { "aria-label": "Delete comment" } });
      setIconSafe(del, ["trash-2", "trash"]);
      del.onclick = (ev) => {
        ev.preventDefault();
        new ConfirmModal(this.app, "Delete comment", "Delete this comment from the note?", "Delete", () => this.deleteComment(file, thread, idx)).open();
      };
      const body = main.createDiv({ cls: "nk-comment-body markdown-rendered" });
      const showBody = () => {
        body.empty();
        obsidian.MarkdownRenderer.render(this.app, c.text, body, file.path, comp).then(() => this.linkNotionMentions(body, file));
      };
      showBody();
      edit.onclick = (ev) => {
        ev.preventDefault();
        if (row.hasClass("is-editing")) return;
        row.addClass("is-editing");
        body.empty();
        const box = body.createEl("textarea", { cls: "nk-comment-input nk-comment-edit" });
        box.value = c.text;
        const bar = body.createDiv({ cls: "nk-comment-edit-bar" });
        const cancel = bar.createEl("button", { text: "Cancel" });
        const save = bar.createEl("button", { cls: "mod-cta", text: "Save" });
        const grow = () => { box.style.height = "auto"; box.style.height = box.scrollHeight + "px"; };
        const close = () => { row.removeClass("is-editing"); showBody(); };
        const commit = async () => {
          const value = box.value.trim();
          if (!value) return;
          if (value === c.text) return close();
          row.removeClass("is-editing");
          await this.editComment(file, thread, idx, c, value);
        };
        const boxSuggest = new TextareaLinkSuggest(this.app, box, file.path);
        box.addEventListener("input", grow);
        box.addEventListener("keydown", (e) => {
          e.stopPropagation();
          if (boxSuggest.handleKey(e)) return;
          if (e.key === "Escape") { e.preventDefault(); close(); }
          else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); commit(); }
        });
        cancel.onclick = (e) => { e.preventDefault(); close(); };
        save.onclick = (e) => { e.preventDefault(); commit(); };
        window.setTimeout(() => { grow(); box.focus(); box.setSelectionRange(box.value.length, box.value.length); }, 0);
      };
    };
    for (const t of pageThreads) t.comments.forEach((c, i) => renderComment(list, c, t, i));
    for (const t of inline) {
      const box = list.createDiv({ cls: "nk-comment-thread" });
      const q = t.title.replace(/^On\s+/, "").replace(/^[“"]|[”"]$/g, "");
      if (q) box.createDiv({ cls: "nk-comment-quote", text: q });
      t.comments.forEach((c, i) => renderComment(box, c, t, i));
    }

    const add = panel.createDiv({ cls: "nk-comment nk-comment-add" });
    add.createDiv({ cls: "nk-comment-avatar", text: initials(this.author) });
    const input = add.createEl("textarea", { cls: "nk-comment-input", attr: { rows: "1", placeholder: "Add a comment..." } });
    input.value = draft || "";
    const send = add.createDiv({ cls: "nk-comment-send", attr: { "aria-label": "Send" } });
    setIconSafe(send, ["arrow-up-circle", "circle-arrow-up", "send"]);
    const grow = () => {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      add.toggleClass("has-text", !!input.value.trim());
    };
    const submit = async () => {
      const value = input.value.trim();
      if (!value) return;
      input.value = "";
      grow();
      await this.addComment(file, value);
    };
    const inputSuggest = new TextareaLinkSuggest(this.app, input, file.path);
    input.addEventListener("input", grow);
    input.addEventListener("keydown", (ev) => {
      ev.stopPropagation();
      if (inputSuggest.handleKey(ev)) return;
      if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        submit();
      }
    });
    send.onclick = (ev) => { ev.preventDefault(); submit(); };
    window.setTimeout(grow, 0);
  }

  async addComment(file, value) {
    const head = `> **${this.author}** · ${window.moment().format(COMMENT_TIME_FORMAT)}`;
    const newLines = [head, ...quoteLines(value)];
    await this.app.vault.process(file, (text) => {
      const p = parseComments(text);
      const lines = p.lines;
      const page = p.threads.filter((t) => t.kind === "page").pop();
      if (page) {
        lines.splice(page.lineEnd, 0, ">", ...newLines);
      } else {
        const block = ["> [!comment|page] Comment", ...newLines, ""];
        const at = p.threads.length ? p.start : p.bodyStart;
        // one blank line between the comments and the page content
        if (at < lines.length && lines[at].trim() === "") block.pop();
        lines.splice(at, 0, ...block);
      }
      return lines.join("\n");
    });
  }

  async editComment(file, thread, idx, before, value) {
    await this.app.vault.process(file, (text) => {
      const p = parseComments(text);
      const t = p.threads.find((x) => x.lineStart === thread.lineStart && x.title === thread.title) || p.threads.find((x) => x.title === thread.title);
      let c = t && t.comments[idx];
      if (!c || c.author !== before.author || c.time !== before.time) {
        c = t && t.comments.find((x) => x.author === before.author && x.time === before.time && x.text === before.text);
      }
      if (!c) {
        new obsidian.Notice("That comment changed in the note, so it wasn't saved. Try again.");
        return text;
      }
      p.lines.splice(c.lineStart + 1, c.lineEnd - c.lineStart - 1, ...quoteLines(value));
      return p.lines.join("\n");
    });
  }

  // notion page id (no dashes, lower case) -> vault note
  notionIndex() {
    if (this._notionIndex) return this._notionIndex;
    const map = new Map();
    for (const f of this.app.vault.getMarkdownFiles()) {
      const fm = (this.app.metadataCache.getFileCache(f) || {}).frontmatter;
      const id = fm && fm["notion-id"];
      if (id) map.set(String(id).replace(/-/g, "").toLowerCase(), f);
    }
    this._notionIndex = map;
    if (!this._notionIndexHooked) {
      this._notionIndexHooked = true;
      const reset = () => { this._notionIndex = null; };
      this.plugin.registerEvent(this.app.metadataCache.on("changed", reset));
      this.plugin.registerEvent(this.app.vault.on("rename", reset));
      this.plugin.registerEvent(this.app.vault.on("delete", reset));
    }
    return map;
  }

  // Imported mentions of Notion pages are links to notion.so. When that page is
  // a note in this vault, open the note instead.
  linkNotionMentions(el, file) {
    // Wiki links rendered inside the comment: open the note on click, like
    // links in reading view (MarkdownRenderer output isn't wired up itself).
    el.querySelectorAll("a.internal-link").forEach((a) => {
      const dest = a.getAttribute("data-href") || a.getAttribute("href") || "";
      if (!dest) return;
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.app.workspace.openLinkText(dest, file.path, obsidian.Keymap.isModEvent(ev));
      }, true);
      a.addEventListener("mouseover", (ev) => {
        this.app.workspace.trigger("hover-link", { event: ev, source: "preview", hoverParent: el, targetEl: a, linktext: dest, sourcePath: file.path });
      });
    });
    el.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const m = /notion\.(?:so|com)\/(?:[^?#]*?)([0-9a-f]{32})(?:[?#]|$)/i.exec(href.replace(/-/g, ""));
      if (!m) return;
      const target = this.notionIndex().get(m[1].toLowerCase());
      if (!target) return;
      a.removeClass("external-link");
      a.addClass("internal-link");
      a.setAttr("data-href", target.path);
      a.setAttr("href", target.path);
      a.removeAttribute("target");
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.app.workspace.openLinkText(target.path, file.path, obsidian.Keymap.isModEvent(ev));
      }, true);
    });
  }

  async deleteComment(file, thread, idx) {
    await this.app.vault.process(file, (text) => {
      const p = parseComments(text);
      const t = p.threads.find((x) => x.lineStart === thread.lineStart && x.title === thread.title);
      if (!t || !t.comments[idx]) return text;
      const lines = p.lines;
      if (t.comments.length === 1) {
        let endLine = t.lineEnd;
        while (endLine < lines.length && lines[endLine].trim() === "") endLine++;
        lines.splice(t.lineStart, endLine - t.lineStart);
      } else {
        const c = t.comments[idx];
        let s = c.lineStart;
        // drop the blank ">" separator before this comment (or after, for the first one)
        if (idx > 0 && /^>\s*$/.test(lines[s - 1])) s--;
        let e = c.lineEnd;
        if (idx === 0 && /^>\s*$/.test(lines[e] || "")) e++;
        lines.splice(s, e - s);
      }
      return lines.join("\n");
    });
  }
}

// Live Preview: hide the raw comment callouts entirely (even when the cursor is
// on them), so opening a note never flashes the unformatted text.
function commentHiderExtension() {
  let cmState, cmView;
  try {
    cmState = require("@codemirror/state");
    cmView = require("@codemirror/view");
  } catch (e) {
    return [];
  }
  const { StateField } = cmState;
  const { Decoration, EditorView } = cmView;
  const isLive = (state) => {
    try {
      return obsidian.editorLivePreviewField ? !!state.field(obsidian.editorLivePreviewField, false) : true;
    } catch (e) {
      return true;
    }
  };
  const build = (state) => {
    if (!isLive(state)) return Decoration.none;
    const doc = state.doc;
    // only the top of the note matters; cap the text we parse
    const head = doc.sliceString(0, Math.min(doc.length, 200000));
    const p = parseComments(head);
    if (!p.threads.length) return Decoration.none;
    let last = p.end; // exclusive line index (0-based)
    while (last < p.lines.length - 1 && p.lines[last].trim() === "") last++;
    // last is now the first content line (or a trailing line); hide through the line before it
    const fromLine = doc.line(p.start + 1);
    const toLine = doc.line(Math.min(Math.max(last, p.start + 1), doc.lines));
    if (toLine.to <= fromLine.from) return Decoration.none;
    return Decoration.set([Decoration.replace({ block: true }).range(fromLine.from, toLine.to)]);
  };
  const field = StateField.define({
    create: (state) => ({ live: isLive(state), deco: build(state) }),
    update(value, tr) {
      const live = isLive(tr.state);
      if (!tr.docChanged && live === value.live) return value;
      return { live, deco: build(tr.state) };
    },
    provide: (f) => [
      EditorView.decorations.from(f, (v) => v.deco),
      EditorView.atomicRanges.of((view) => view.state.field(f).deco),
    ],
  });
  return [field];
}

class CommentSettingTab extends obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    new obsidian.Setting(containerEl)
      .setName("Comment author name")
      .setDesc("Shown above comments you add with “Add a comment...”.")
      .addText((t) =>
        t.setPlaceholder("Your name").setValue(this.plugin.settings.commentAuthor || "").onChange(async (v) => {
          this.plugin.settings.commentAuthor = v;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.comments.refreshSoon();
        })
      );

    new obsidian.Setting(containerEl).setName("Templates").setHeading();
    new obsidian.Setting(containerEl)
      .setName("Templates folder")
      .setDesc("Each base's templates are the notes in <this folder>/<base name>/, e.g. Templates/RM Tasks/.")
      .addText((t) =>
        t.setPlaceholder(TEMPLATES_ROOT).setValue(this.plugin.settings.templatesFolder || "").onChange(async (v) => {
          this.plugin.settings.templatesFolder = v.trim();
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.viewTabs.refreshAll();
        })
      );
    new obsidian.Setting(containerEl)
      .setName("Wait for sync before repeating (seconds)")
      .setDesc("After Obsidian starts or comes back to the foreground, wait this long before making repeating-template notes, so sync can bring in ones another device already made.")
      .addText((t) => {
        t.inputEl.type = "number";
        t.setPlaceholder("15").setValue(this.plugin.settings.repeatDelaySeconds === undefined ? "" : String(this.plugin.settings.repeatDelaySeconds)).onChange(async (v) => {
          if (v.trim() === "") delete this.plugin.settings.repeatDelaySeconds;
          else this.plugin.settings.repeatDelaySeconds = Math.max(0, Number(v) || 0);
          await this.plugin.saveData(this.plugin.settings);
        });
      });
    new obsidian.Setting(containerEl)
      .setName("Manage templates")
      .addButton((b) => b.setButtonText("Open").onClick(() => this.plugin.templates.openManager()));
  }
}

class NotionStyleKanbanPlugin extends obsidian.Plugin {
  // ----- display titles -----

  async setDisplayTitle(file, raw) {
    const title = String(raw === undefined || raw === null ? "" : raw).replace(/\s+/g, " ").trim();
    const fm = (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {};
    const had = Object.prototype.hasOwnProperty.call(fm, TITLE_KEY);
    const oldLabels = [file.basename, titleOf(fm)].filter(Boolean);
    if (!(had && titleOf(fm) === title)) {
      await this.app.fileManager.processFrontMatter(file, (f) => { f[TITLE_KEY] = title; });
    }
    // relabel links first, while they still point at the current file name
    await this.retitleLinks([{ file, title: title || file.basename, oldLabels }]);
    // keep the file name close to the title, numbered only when another note already has it
    if (title && !fileFitsTitle(file.basename, title)) {
      const folder = file.parent ? file.parent.path : "";
      try {
        await this.app.fileManager.renameFile(file, uniqueNotePath(this.app, folder, safeFileName(title)));
      } catch (e) {
        console.warn("Notion-style Kanban: rename failed", e);
      }
    }
  }

  // Links whose label is the file name (or another old label) get the new title as their label.
  // targets: [{ file, title, oldLabels? }]. Returns { links, sources } when dryRun.
  async retitleLinks(targets, dryRun) {
    const byPath = new Map(targets.map((t) => [t.file.path, t]));
    const edits = new Map(); // source path -> [[original, replacement]]
    let links = 0;
    const resolved = this.app.metadataCache.resolvedLinks || {};
    for (const src of Object.keys(resolved)) {
      const dests = resolved[src];
      if (!Object.keys(dests).some((d) => byPath.has(d))) continue;
      const cache = this.app.metadataCache.getCache(src);
      if (!cache) continue;
      for (const l of [...(cache.frontmatterLinks || []), ...(cache.links || [])]) {
        const dest = this.app.metadataCache.getFirstLinkpathDest(obsidian.getLinkpath(l.link), src);
        const t = dest && byPath.get(dest.path);
        if (!t) continue;
        const label = l.displayText !== undefined ? l.displayText : "";
        const linkName = obsidian.getLinkpath(l.link).split("/").pop();
        const old = new Set([t.file.basename, linkName, ...(t.oldLabels || [])]);
        const alias = linkAlias(t.title);
        if (!old.has(label) || label === alias || !l.original.startsWith("[[")) continue;
        const rep = `[[${l.link}|${alias}]]`;
        if (!edits.has(src)) edits.set(src, []);
        edits.get(src).push([l.original, rep]);
        links++;
      }
    }
    if (dryRun) return { links, sources: edits.size };
    for (const [src, pairs] of edits) {
      const f = this.app.vault.getFileByPath(src);
      if (!f) continue;
      await this.app.vault.process(f, (data) => {
        // only touch the link text itself, in the frontmatter and the body alike
        let out = data;
        for (const [a, b] of pairs) out = out.split(a).join(b);
        return out;
      });
    }
    return { links, sources: edits.size };
  }

  async loadNotionTitles() {
    const path = obsidian.normalizePath(`${this.manifest.dir}/notion-titles.json`);
    if (!(await this.app.vault.adapter.exists(path))) return null;
    try {
      return JSON.parse(await this.app.vault.adapter.read(path));
    } catch (e) {
      new obsidian.Notice("notion-titles.json couldn't be read: " + e.message);
      return null;
    }
  }

  async planNotionTitles() {
    const map = await this.loadNotionTitles();
    if (!map) {
      new obsidian.Notice("No Notion titles found. Put notion-titles.json in the plugin folder first.");
      return null;
    }
    const norm = (id) => String(id || "").replace(/-/g, "").toLowerCase();
    const titles = new Map(Object.entries(map).map(([k, v]) => [norm(k), String(v).replace(/\s+/g, " ").trim()]));
    const notes = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
      if (!fm || !fm["notion-id"] || Object.prototype.hasOwnProperty.call(fm, TITLE_KEY)) continue;
      const title = titles.get(norm(fm["notion-id"]));
      if (!title || title === file.basename) continue;
      notes.push({ file, title });
    }
    notes.sort((a, b) => a.file.path.localeCompare(b.file.path));
    const counts = await this.retitleLinks(notes, true);
    return { notes, links: counts.links, sources: counts.sources };
  }

  async applyNotionTitles(plan, fixLinks) {
    const notice = new obsidian.Notice(`Setting titles on ${plan.notes.length} notes…`, 0);
    let done = 0;
    for (const n of plan.notes) {
      await this.app.fileManager.processFrontMatter(n.file, (fm) => { fm[TITLE_KEY] = n.title; });
      if (++done % 50 === 0) notice.setMessage(`Setting titles… ${done} of ${plan.notes.length}`);
    }
    let links = { links: 0, sources: 0 };
    if (fixLinks) {
      notice.setMessage("Updating link labels…");
      links = await this.retitleLinks(plan.notes);
    }
    notice.hide();
    new obsidian.Notice(`Titles set on ${done} notes` + (fixLinks ? `, ${links.links} links relabeled in ${links.sources} notes.` : "."));
  }

  openOptions(file, prop, anchorEl) {
    if (this.activeOptions) this.activeOptions.close();
    this.activeOptions = new OptionsPopover(this, file, prop, anchorEl);
    this.activeOptions.open();
  }

  schemaChanged() {
    this.app.workspace.trigger("nk:schema-changed");
  }

  openIconPicker(file, iconKey, anchorEl, pos) {
    if (this.activePicker) this.activePicker.close();
    this.activePicker = new IconPicker(this, file, iconKey || "icon", anchorEl, pos);
    this.activePicker.open();
  }

  async onExternalSettingsChange() {
    const fresh = (await this.loadData()) || {};
    Object.assign(this.settings, fresh);
    if (this.viewTabs) this.viewTabs.refreshAll();
    this.schemaChanged();
  }

  async onload() {
    APP = this.app;
    this.settings = Object.assign({ recentIcons: [], savedIcons: [], pickerTab: null }, (await this.loadData()) || {});
    this.settings.recentIcons = this.settings.recentIcons.slice(0, RECENT_LIMIT);
    this.registerHoverLinkSource(HOVER_SOURCE, { display: "Notion-style Kanban", defaultMod: true });

    this.schemas = new PropertySchemas(this);
    this.propertyPanel = new PropertyPanel(this);
    this.propertyPanel.load();
    this.register(() => this.propertyPanel.unload());

    this.noteIcons = new NoteIconHeader(this);
    this.noteIcons.load();
    this.register(() => this.noteIcons.unload());

    this.comments = new CommentsPanel(this);
    this.comments.load();
    this.register(() => this.comments.unload());
    this.addSettingTab(new CommentSettingTab(this.app, this));
    this.registerEditorExtension(commentHiderExtension());

    this.viewTabs = new ViewTabsBar(this);
    this.viewTabs.load();
    this.register(() => this.viewTabs.unload());

    this.noteButtons = new NoteButtons(this);
    this.noteButtons.load();

    this.templates = new TemplateLibrary(this);
    this.templates.load();
    this.register(() => this.templates.unload());
    // the run id on notes made by repeating templates is bookkeeping: hide it like Notion would
    if (!this.settings.propertyVisibility) this.settings.propertyVisibility = {};
    if (!this.settings.propertyVisibility[RUN_KEY]) this.settings.propertyVisibility[RUN_KEY] = "hide";

    this.addCommand({
      id: "apply-notion-titles",
      name: "Use Notion page titles for imported notes",
      callback: async () => {
        const plan = await this.planNotionTitles();
        if (!plan) return;
        if (!plan.notes.length) return new obsidian.Notice("Every imported note already shows its Notion title.");
        new NotionTitlesModal(this, plan).open();
      },
    });
    this.addCommand({
      id: "set-display-title",
      name: "Edit title of current note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) {
          const fm = (this.app.metadataCache.getFileCache(file) || {}).frontmatter || {};
          const go = async () => {
            if (!Object.prototype.hasOwnProperty.call(fm, TITLE_KEY)) await this.setDisplayTitle(file, displayTitle(file));
            this.focusTitlePath = file.path;
            this.noteIcons.refreshSoon();
          };
          go();
        }
        return true;
      },
    });

    // "Change icon" on any note's right-click menu (cards, sub-tasks, file explorer, tabs)
    let lastMouse = null;
    this.registerDomEvent(document, "contextmenu", (ev) => { lastMouse = { x: ev.clientX, y: ev.clientY }; }, true);
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof obsidian.TFile) || file.extension !== "md") return;
        menu.addItem((item) =>
          item.setTitle("Change icon").setIcon("smile-plus").onClick(() => this.openIconPicker(file, "icon", null, lastMouse))
        );
      })
    );
    this.addCommand({
      id: "change-note-icon",
      name: "Change icon of current note",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) this.openIconPicker(file, "icon");
        return true;
      },
    });
    if (typeof this.registerBasesView !== "function") {
      new obsidian.Notice("Notion-style Kanban needs Obsidian 1.10 or later (Bases view API).");
      return;
    }
    this.registerBasesView(VIEW_TYPE, {
      name: "Notion Kanban",
      icon: "square-kanban",
      factory: (controller, containerEl) => new NotionKanbanView(controller, containerEl, this),
      options: viewOptions,
    });
  }
}

module.exports = NotionStyleKanbanPlugin;
