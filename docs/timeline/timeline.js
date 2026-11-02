// Interactive schedule. Reads timeline.yml and builds the grid.
(function () {
  const root = document.getElementById("thesis-timeline");
  if (!root) return;
  const src = root.dataset.src || "timeline/timeline.yml";
  // info can be one text or a list of lines
  const md = (s) => {
    const text = Array.isArray(s) ? s.join("\n") : String(s || "");
    return window.marked ? marked.parse(text, { breaks: true }) : text;
  };
  const WPM = 4; // squares per month

  // ---- date helpers ----
  // js-yaml turns 2026-11-02 into a Date (UTC); strings also accepted
  function toDate(v) {
    if (v instanceof Date) return new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
    const [y, m, d] = String(v).split("-").map(Number);
    return new Date(y, m - 1, d || 1);
  }
  function toYM(v) {
    if (v instanceof Date) return [v.getUTCFullYear(), v.getUTCMonth()];
    const [y, m] = String(v).split("-").map(Number);
    return [y, m - 1];
  }
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  function fmtRange(a, b) {
    if (!b || a.getTime() === b.getTime()) return fmt(a);
    return `${fmt(a)} – ${fmt(b)}`;
  }

  function el(tag, cls, attrs = {}) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    Object.assign(e, attrs);
    return e;
  }

  function build(data) {
    const [sy, sm] = toYM(data.start);
    const [ey, em] = toYM(data.end);
    const nMonths = (ey - sy) * 12 + (em - sm) + 1;
    const nCells = nMonths * WPM;
    const monthStart = (i) => new Date(sy, sm + i, 1);
    const now = new Date();
    const monthPast = (i) => now >= monthStart(i + 1);

    // date → square index (0-based); null if outside the schedule
    function cellOf(d) {
      const mi = (d.getFullYear() - sy) * 12 + (d.getMonth() - sm);
      if (mi < 0 || mi >= nMonths) return null;
      return mi * WPM + Math.min(WPM - 1, Math.floor((d.getDate() - 1) / 7));
    }

    root.innerHTML = "";
    root.classList.add("tl");
    root.style.setProperty("--tl-weeks", nCells);

    const scroll = el("div", "tl-scroll");
    const grid = el("div", "tl-grid");
    const hint = el("p", "tl-hint", { textContent: "Click a coloured block to see details." });
    const panel = el("div", "tl-panel");
    panel.hidden = true;
    scroll.appendChild(grid);
    root.append(scroll, hint, panel);

    // header row
    grid.appendChild(el("div", "tl-corner"));
    for (let i = 0; i < nMonths; i++) {
      const name = monthStart(i).toLocaleDateString("en-GB", { month: "long" });
      const h = el("div", "tl-month" + (monthPast(i) ? " is-past" : ""), { textContent: name });
      h.style.gridColumn = `span ${WPM}`;
      grid.appendChild(h);
    }

    const highlights = [];
    function clearHighlights() {
      highlights.splice(0).forEach((h) => h.remove());
      grid.querySelectorAll(".is-selected").forEach((c) => c.classList.remove("is-selected"));
    }
    // one thin outline around a run of neighbouring squares (gaps stay visible)
    function drawRect(cells) {
      const g = grid.getBoundingClientRect();
      const a = cells[0].getBoundingClientRect();
      const b = cells[cells.length - 1].getBoundingClientRect();
      const r = el("div", "tl-hl");
      r.style.left = a.left - g.left + "px";
      r.style.top = a.top - g.top + "px";
      r.style.width = b.right - a.left + "px";
      r.style.height = a.height + "px";
      grid.appendChild(r);
      highlights.push(r);
    }

    let current = null;
    function select(item) {
      current = item;
      clearHighlights();
      if (!item) {
        grid.classList.remove("has-selection");
        panel.hidden = true;
        hint.hidden = false;
        return;
      }
      grid.classList.add("has-selection");
      item.runs.forEach((run) => {
        run.forEach((c) => c.classList.add("is-selected"));
      });
      hint.hidden = true;
      panel.hidden = false;
      panel.className = "tl-panel is-" + item.type;
      panel.innerHTML =
        '<div class="tl-panel-header">' +
        `<span class="tl-panel-title">${item.title}</span>` +
        '<button class="tl-close" type="button" aria-label="Close">' +
        '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>' +
        "</button>" +
        "</div>" +
        '<div class="tl-panel-body">' +
        (item.when ? `<div class="tl-when">${item.when}</div>` : "") +
        md(item.info) +
        "</div>";
      panel.querySelector(".tl-close").onclick = () => select(null);
    }

    data.rows.forEach((row) => {
      if (row.gap) { grid.appendChild(el("div", "tl-gap")); return; }
      const type = row.type || "phase";

      const label = el("div", "tl-label", { textContent: row.label });
      grid.appendChild(label);

      const cells = [];
      for (let i = 0; i < nCells; i++) {
        const past = monthPast(Math.floor(i / WPM));
        const c = el("button", "tl-cell" + (past ? " is-past" : ""), { type: "button", tabIndex: -1 });
        c.setAttribute("aria-label", row.label);
        cells.push(c);
        grid.appendChild(c);
      }

      const addItems = (list, isBreak) =>
        (list || []).forEach((b) => {
          const from = toDate(b.from || b.date);
          const until = b.until ? toDate(b.until) : from;
          let i0 = cellOf(from), i1 = cellOf(until);
          if (i0 === null && i1 === null) return;
          i0 = i0 === null ? 0 : i0;
          i1 = i1 === null ? nCells - 1 : i1;
          const run = [];
          for (let i = i0; i <= i1; i++) {
            const c = cells[i];
            c.classList.add(isBreak ? "is-break" : "is-" + type, "is-clickable");
            c.tabIndex = 0;
            run.push(c);
          }
          const item = {
            title: b.title || row.label,
            info: b.info,
            type: isBreak ? "break" : type,
            when: fmtRange(from, until),
            runs: [run],
          };
          run.forEach((c) => (c.onclick = () => select(item)));
        });

      addItems(row.blocks, false);
      addItems(row.breaks, true);
    });

    // keep rectangles in place if the layout changes (e.g. window resize)
    window.addEventListener("resize", () => { if (current) select(current); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") select(null); });
  }

  fetch(src)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((t) => build(jsyaml.load(t)))
    .catch((err) => {
      root.innerHTML = `<p style="color:#c00">Could not load schedule data (${src}): ${err}</p>`;
    });
})();
