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
    const name = alias || (file ? file.basename : linkpath.split("/").pop());
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
    titleRow.createSpan({ cls: "nk-title", text: c.file.basename });

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
    const entries = ((this.data && this.data.data) || []).filter((e) => e && e.file instanceof obsidian.TFile);
    const sample = entries[0] ? entries[0].file : null;
    const folder = sample && sample.parent ? sample.parent.path : "";
    const sampleFm = sample ? this.fm(sample) : {};
    let name = "Untitled";
    let n = 1;
    const pathFor = (nm) => obsidian.normalizePath(`${folder ? folder + "/" : ""}${nm}.md`);
    while (this.app.vault.getAbstractFileByPath(pathFor(name))) name = `Untitled ${n++}`;
    const file = await this.app.vault.create(pathFor(name), "");
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      // keep the note inside this base's filter (the importer links notes to their base)
      if (sampleFm.base) fm.base = sampleFm.base;
      if (column !== NO_VALUE) fm[s.columnKey] = column;
      if (s.laneKey && lane && lane !== NO_VALUE) fm[s.laneKey] = lane;
      if (s.orderKey) fm[s.orderKey] = 0;
    });
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file, { state: { mode: "source" }, eState: { rename: "all" } });
  }
}

// ---------- plugin ----------

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
    document.querySelectorAll(".nk-note-icon-wrap").forEach((e) => e.remove());
  }

  refreshAll() {
    if (this.observer) this.observer.disconnect();
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!view || !view.file || !view.containerEl) continue;
      this.renderInView(view);
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
  }

  load() {
    const p = this.plugin;
    p.registerEvent(this.app.workspace.on("layout-change", () => this.refreshSoon()));
    p.registerEvent(this.app.workspace.on("file-open", () => this.refreshSoon()));
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
    document.querySelectorAll(".nk-select-value, .nk-prop-icon").forEach((e) => e.remove());
    document.querySelectorAll(".nk-managed, .nk-has-icon").forEach((e) => e.removeClass("nk-managed", "nk-has-icon"));
  }

  propertyMenu(prop, iconEl, ev) {
    const menu = new obsidian.Menu();
    menu.addItem((i) => i.setTitle("Change icon").setIcon("smile-plus").onClick(() => this.pickIcon(prop, iconEl)));
    if (this.schemas.iconOf(prop)) menu.addItem((i) => i.setTitle("Remove icon").setIcon("x").onClick(() => this.schemas.setIcon(prop, null)));
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
      view.containerEl.querySelectorAll(".metadata-property[data-property-key]").forEach((el) => this.decorate(el, view.file));
      if (this.observer) view.containerEl.querySelectorAll(".metadata-properties").forEach((h) => this.observer.observe(h, { childList: true, subtree: true }));
    }
  }

  decorate(propEl, file) {
    const prop = propEl.dataset.propertyKey;
    if (!prop) return;

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
    const sig = JSON.stringify([file.path, current, views, [...hidden], views.map((v) => conf[this.key(file.path, v.name)] || "")]);

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
    if (views.length < 2) { bar.hide(); return; }
    bar.show();

    const shown = views.filter((v) => !hidden.has(v.name) || v.name === current);
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
    const hiddenViews = views.filter((v) => hidden.has(v.name) && v.name !== current);
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

class NotionStyleKanbanPlugin extends obsidian.Plugin {
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

    this.viewTabs = new ViewTabsBar(this);
    this.viewTabs.load();
    this.register(() => this.viewTabs.unload());

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
