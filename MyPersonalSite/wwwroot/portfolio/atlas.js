/* Atlas UI: one allowlisted URL state, pure selectors, native SVG and native dialogs. */
(() => {
  "use strict";
  const one = (s) => document.querySelector(s),
    all = (s) => [...document.querySelectorAll(s)];
  try {
    const E = window.AtlasEngine;
    if (!E) throw new Error("Analytics engine unavailable");
    let state = E.parse(location.search),
      search =
        new URLSearchParams(location.search).get("q")?.slice(0, 80) || "";
    let inspectedIndex = state.days - 1,
      detailId = "",
      dialogOpener = null,
      dailySeries = [],
      previousSeries = [];
    const fmt = (n) => Math.round(n).toLocaleString("en-US");
    const compact = (n) =>
      n >= 1000000
        ? (n / 1000000).toFixed(2) + "M"
        : n >= 1000
          ? (n / 1000).toFixed(1) + "k"
          : fmt(n);
    const dateLabel = (date) =>
      new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    const valueLabel = (v, metric = state.metric) =>
      metric === "latency"
        ? fmt(v) + " ms"
        : fmt(v) + (metric === "errors" ? " failed" : " requests");
    const selectedService = () =>
      E.services.find((s) => s.name === state.service);
    const portfolioRows = () => E.select(state, { allServices: true });
    const analyticsRows = () => E.select(state);
    const svgLine = (values, w, h, padding = 2) => {
      const min = Math.min(...values),
        max = Math.max(...values),
        span = max - min || 1;
      return values
        .map(
          (v, i) =>
            `${(padding + (i / Math.max(1, values.length - 1)) * (w - padding * 2)).toFixed(1)},${(h - padding - ((v - min) / span) * (h - padding * 2)).toFixed(1)}`,
        )
        .join(" ");
    };
    function serialize() {
      const p = new URLSearchParams({
        service: state.service,
        days: state.days,
        metric: state.metric,
        sort: state.sort,
        focus: state.focus,
      });
      if (state.date) p.set("date", state.date);
      if (state.delta) p.set("delta", state.delta);
      if (search) p.set("q", search);
      if (window.JourneyEngine) {
        const view = window.JourneyEngine.parse(location.search);
        p.set("journey", view.key);
        p.set("stage", view.stage);
        p.set("event", view.selected);
        if (new URLSearchParams(location.search).get('order') === 'selected') p.set('order', 'selected');
      }
      history.replaceState(
        null,
        "",
        location.pathname + "?" + p + location.hash,
      );
    }
    function update(patch, options = {}) {
      state = { ...state, ...patch };
      if (
        patch.days &&
        state.date &&
        !E.select(state, { ignoreDate: true }).some(
          (r) => r.date === state.date,
        )
      )
        state.date = "";
      if (patch.service && patch.service !== "all")
        state.focus = selectedService().id;
      serialize();
      render();
      if (options.announce) toast(options.announce);
    }
    function compare(id, current, previous, unit, improvement = "") {
      const el = one("#" + id + "-change"),
        delta = current - previous;
      const change =
        unit === "pp"
          ? Math.abs(delta).toFixed(3) + " pp"
          : unit === "ms"
            ? fmt(Math.abs(delta)) + " ms"
            : previous
              ? ((Math.abs(delta) / previous) * 100).toFixed(1) + "%"
              : "—";
      const direction = delta > 0 ? "↑" : delta < 0 ? "↓" : "↔";
      el.textContent = `${direction} ${change} vs previous ${state.date ? "matched day" : state.days + " days"}`;
      el.dataset.direction =
        !delta || !improvement
          ? "neutral"
          : delta > 0 === (improvement === "up")
            ? "good"
            : "bad";
    }
    function renderKpis() {
      const rows = analyticsRows(),
        total = E.summarize(rows),
        previous = E.summarize(E.select(state, { previous: true }));
      one("#requests").textContent = compact(total.requests);
      one("#requests").title = fmt(total.requests) + " service requests";
      one("#success").textContent = total.success.toFixed(3) + "%";
      one("#latency").innerHTML =
        `${fmt(total.latency)}<span class="metric-unit"> ms</span>`;
      one("#deployments").textContent = fmt(total.deployments);
      compare("requests", total.requests, previous.requests, "%");
      compare("success", total.success, previous.success, "pp", "up");
      compare("latency", total.latency, previous.latency, "ms", "down");
      compare("deployments", total.deployments, previous.deployments, "%");
      one("#budget-note").textContent =
        total.budget.toFixed(0) +
        "% of error budget used" +
        (total.budget > 100 ? " · SLO breached" : "");
      one("#budget-fill").style.width = Math.min(100, total.budget) + "%";
      one("#budget-fill").dataset.over = String(total.budget > 100);
      for (const [id, key] of [
        ["request-spark", "requests"],
        ["latency-spark", "latency"],
      ])
        one("#" + id).innerHTML = `<polyline points="${svgLine(
          dailySeries.map((r) => r[key]),
          180,
          27,
        )}" fill="none" stroke="currentColor" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;
      one("#release-ticks").innerHTML = dailySeries
        .slice(-21)
        .map(
          (r) =>
            `<i style="height:${Math.max(8, (r.deployments / 7) * 100)}%"></i>`,
        )
        .join("");
      const scope = state.service === "all" ? "All 5 services" : state.service;
      const period = state.date
        ? dateLabel(state.date) + ", 2026"
        : dateLabel(dailySeries[0].date) +
          " – " +
          dateLabel(E.endDate) +
          ", 2026";
      one("#selection-summary").textContent =
        `${scope} · ${period} · ${rows.length} synthetic daily record${rows.length === 1 ? "" : "s"}`;
      one("#clear-date").hidden = !state.date;
    }
    function renderTrend() {
      const host = one("#volume-chart"),
        w = Math.max(
          240,
          Math.round(host.getBoundingClientRect().width) || 650,
        ),
        h = 240;
      const left = 43,
        right = 10,
        top = 13,
        bottom = 34,
        metric = state.metric;
      const peak = Math.max(
        ...dailySeries.map((d) => d[metric]),
        ...previousSeries.map((d) => d[metric]),
      );
      const step =
        metric === "requests" ? 50000 : metric === "latency" ? 50 : 250;
      const max = Math.max(step, Math.ceil(peak / step) * step),
        y = (v) => h - bottom - (v / max) * (h - top - bottom);
      const x = (i) =>
        left + (i / Math.max(1, dailySeries.length - 1)) * (w - left - right);
      const points = (values) =>
        values
          .map((r, i) => `${x(i).toFixed(2)},${y(r[metric]).toFixed(2)}`)
          .join(" ");
      const tick = (v) =>
        metric === "latency"
          ? fmt(v)
          : v >= 1000
            ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k"
            : fmt(v);
      const title = {
        requests: "Request volume",
        latency: "Response time",
        errors: "Failed requests",
      }[metric];
      one("#metric-title").textContent = title;
      one("#chart-unit").textContent = {
        requests: "REQUESTS / DAY",
        latency: "WEIGHTED AVERAGE / MS",
        errors: "FAILED REQUESTS / DAY",
      }[metric];
      const grid = [0, 0.25, 0.5, 0.75, 1]
        .map(
          (t) =>
            `<line class="chart-grid" x1="${left}" x2="${w - right}" y1="${y(t * max)}" y2="${y(t * max)}"/><text class="chart-text" x="${left - 9}" y="${y(t * max) + 4}" text-anchor="end">${tick(t * max)}</text>`,
        )
        .join("");
      const ticks = [
        ...new Set([
          0,
          Math.floor((dailySeries.length - 1) / 2),
          dailySeries.length - 1,
        ]),
      ]
        .map(
          (i) =>
            `<text class="chart-text" x="${x(i)}" y="${h - 8}" text-anchor="${i === 0 ? "start" : i === dailySeries.length - 1 ? "end" : "middle"}">${dateLabel(dailySeries[i].date)}</text>`,
        )
        .join("");
      host.innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="trend-title trend-desc"><title id="trend-title">${metric === "latency" ? "Average latency" : title}</title><desc id="trend-desc">${state.days} days ending October 14, 2026, compared with the previous ${state.days} days. Use the day slider to select a date and immediately filter linked views. CSV exports contain the selected records.</desc>${grid}<polygon class="chart-area" points="${left},${h - bottom} ${points(dailySeries)} ${w - right},${h - bottom}"/><polyline class="previous-line" points="${points(previousSeries)}"/><polyline class="current-line" points="${points(dailySeries)}"/>${ticks}<line id="chart-cursor" class="chart-cursor" x1="0" x2="0" y1="${top}" y2="${h - bottom}"/><circle id="chart-point" class="chart-point" r="4" cx="0" cy="0"/><rect class="chart-hit" x="${left}" y="${top}" width="${w - left - right}" height="${h - top - bottom}"/></svg>`;
      const slider = one("#inspect-day");
      slider.max = dailySeries.length - 1;
      inspectedIndex = state.date
        ? Math.max(
            0,
            dailySeries.findIndex((d) => d.date === state.date),
          )
        : Math.min(inspectedIndex, dailySeries.length - 1);
      slider.value = inspectedIndex;
      function point(event) {
        const rect = host.querySelector("svg").getBoundingClientRect();
        const svgX = ((event.clientX - rect.left) / (rect.width || w)) * w;
        return Math.max(
          0,
          Math.min(
            dailySeries.length - 1,
            Math.round(
              ((svgX - left) / (w - left - right)) * (dailySeries.length - 1),
            ),
          ),
        );
      }
      const hit = host.querySelector(".chart-hit");
      hit.addEventListener("pointermove", (e) => {
        inspectedIndex = point(e);
        inspectDay(true);
      });
      hit.addEventListener("pointerleave", () => {
        one("#chart-tooltip").hidden = true;
      });
      hit.addEventListener("click", (e) => {
        inspectedIndex = point(e);
        update({ date: dailySeries[inspectedIndex].date });
      });
      host._geometry = { x, y };
      inspectDay();
    }
    function inspectDay(showTooltip = false) {
      const row = dailySeries[inspectedIndex],
        previous = previousSeries[inspectedIndex],
        geometry = one("#volume-chart")._geometry;
      if (!row || !geometry) return;
      one("#inspect-day").value = inspectedIndex;
      one("#inspect-day").setAttribute(
        "aria-valuetext",
        `${dateLabel(row.date)}, ${valueLabel(row[state.metric])}, previous ${valueLabel(previous[state.metric])}`,
      );
      one("#inspect-date").textContent = dateLabel(row.date);
      one("#chart-summary").textContent =
        `${dateLabel(row.date)} · ${valueLabel(row[state.metric])} · Previous matched day: ${valueLabel(previous[state.metric])}`;
      const x = geometry.x(inspectedIndex),
        y = geometry.y(row[state.metric]);
      one("#chart-cursor").setAttribute("x1", x);
      one("#chart-cursor").setAttribute("x2", x);
      one("#chart-point").setAttribute("cx", x);
      one("#chart-point").setAttribute("cy", y);
      const tooltip = one("#chart-tooltip");
      tooltip.innerHTML = `${dateLabel(row.date)}, 2026<strong>${valueLabel(row[state.metric])}</strong>Previous: ${valueLabel(previous[state.metric])}`;
      tooltip.hidden = !showTooltip;
    }
    function renderFailures() {
      const rows = portfolioRows(),
        total = E.summarize(rows),
        groups = E.groups(rows).sort((a, b) => b.errors - a.errors);
      one("#service-bars").innerHTML = groups
        .map(
          (g) =>
            `<button type="button" class="failure-row" data-service="${g.id}" aria-pressed="${state.service === g.name}" aria-label="Focus ${g.name}, ${fmt(g.errors)} failed requests"><span class="failure-label"><span><i class="service-dot" aria-hidden="true"></i>${g.name}</span><strong>${total.errors ? ((g.errors / total.errors) * 100).toFixed(1) : "0"}%</strong></span><span class="failure-track" aria-hidden="true"><i style="width:${total.errors ? (g.errors / total.errors) * 100 : 0}%"></i></span></button>`,
        )
        .join("");
    }
    function renderDependencies() {
      const root = E.serviceById(state.focus),
        rows = portfolioRows(),
        groups = E.groups(rows),
        model = E.model(root.id, state.delta, rows);
      const node = (id) => E.serviceById(id);
      const paths = E.edges
        .map((e) => {
          const a = node(e.from),
            b = node(e.to),
            mid = (a.x + b.x) / 2;
          const active =
            !e.async && model.weights[e.from] > 0 && model.weights[e.to] > 0;
          return `<path class="map-edge" data-async="${!!e.async}" data-active="${active && e.to !== root.id}" data-root="${active && e.to === root.id}" d="M${a.x * 10} ${a.y * 3.1} C${mid * 10} ${a.y * 3.1} ${mid * 10} ${b.y * 3.1} ${b.x * 10} ${b.y * 3.1}"/>`;
        })
        .join("");
      one("#dependency-map").innerHTML =
        `<svg class="map-connections" viewBox="0 0 1000 310" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>` +
        E.services
          .map((s) => {
            const g = groups.find((g) => g.id === s.id),
              added = model.weights[s.id] * state.delta;
            const dependencies =
              E.edges
                .filter((e) => e.from === s.id)
                .map((e) => node(e.to).name + (e.async ? " (async)" : ""))
                .join(", ") || "No downstream dependencies";
            return `<button type="button" class="map-node" style="left:${s.x}%;top:${s.y}%" data-service="${s.id}" data-map-node="${s.id}" data-exposed="${s.id !== root.id && model.weights[s.id] > 0}" aria-pressed="${s.id === root.id}" aria-label="Trace ${s.name}${model.weights[s.id] > 0 && s.id !== root.id ? ", exposed caller" : ""}"><span class="node-top"><span class="node-code">${s.short}</span><span class="node-status">${state.delta && model.weights[s.id] ? "+" + fmt(added) + " ms" : fmt(g.latency) + " ms"}</span></span><strong>${s.name}</strong><span class="node-relation">Depends on: ${dependencies}</span></button>`;
          })
          .join("");
      const g = groups.find((g) => g.id === root.id);
      one("#inspector-kind").textContent =
        root.kind.toUpperCase() + " / " + root.short;
      one("#inspector-title").textContent = root.name;
      one("#inspector-description").textContent = root.description;
      one("#inspector-metrics").innerHTML =
        `<div><span>Requests</span><strong>${compact(g.requests)}</strong></div><div><span>Success</span><strong>${g.success.toFixed(2)}%</strong></div><div><span>Average latency</span><strong>${fmt(g.latency)} ms</strong></div><div><span>Releases</span><strong>${g.deployments}</strong></div>`;
      one("#inspector-relations").className = "inspector-relations";
      one("#inspector-relations").innerHTML =
        `<strong>${model.affected.length} exposed callers</strong><br>${model.affected.map((id) => node(id).name).join(" · ") || "This service has no upstream synchronous callers."}`;
      one("#scenario-description").textContent =
        `Add latency to ${root.name} to reveal the effect on its callers.`;
      one("#latency-delta").value = state.delta;
      one("#latency-delta").setAttribute(
        "aria-valuetext",
        state.delta + " milliseconds added to " + root.name,
      );
      one("#delta-output").textContent = "+" + state.delta + " ms";
      one("#affected-count").textContent = model.affected.length;
      one("#modeled-impact").innerHTML =
        "+" + model.added.toFixed(1) + " <small>ms</small>";
      const gateway = model.weights.gateway * state.delta;
      one("#scenario-insight").textContent = !state.delta
        ? `Move the slider to model a slowdown in ${root.name}. ${model.affected.length} other services have a synchronous dependency path to it.`
        : root.id === "observe"
          ? "Telemetry is asynchronous. This model predicts no added latency in upstream application requests."
          : `A ${state.delta} ms slowdown in ${root.name} adds ${gateway.toFixed(1)} ms to the modeled API Gateway average. ${model.affected.length} caller${model.affected.length === 1 ? "" : "s"} ${model.affected.length === 1 ? "is" : "are"} exposed through synchronous dependencies.`;
    }
    function renderExplorer() {
      let groups = E.groups(portfolioRows());
      const q = search.trim().toLocaleLowerCase();
      if (q)
        groups = groups.filter((g) =>
          (g.name + " " + g.owner).toLocaleLowerCase().includes(q),
        );
      groups.sort((a, b) =>
        state.sort === "name"
          ? a.name.localeCompare(b.name)
          : state.sort === "success"
            ? a.success - b.success
            : state.sort === "latency"
              ? b.latency - a.latency
              : b.requests - a.requests,
      );
      one("#explorer-count").textContent = groups.length + " of 5 services";
      one("#service-table").innerHTML = groups
        .map(
          (g) =>
            `<tr role="row" data-selected="${state.service === g.name}"><th scope="row" role="rowheader"><span class="service-identity"><span class="service-monogram" aria-hidden="true">${g.short}</span><span><strong>${g.name}</strong><small>${g.owner}</small></span></span></th><td role="cell" data-label="Requests" title="${fmt(g.requests)}">${compact(g.requests)}</td><td role="cell" data-label="Success"><span class="metric-success" data-breach="${g.success < E.slo}"><i aria-hidden="true"></i>${g.success.toFixed(3)}%</span></td><td role="cell" data-label="Avg. latency">${fmt(g.latency)} ms</td><td role="cell" data-label="Releases">${g.deployments}</td><td role="cell"><button class="atlas-button table-detail" data-details="${g.id}" aria-label="Inspect ${g.name}">Inspect <span aria-hidden="true">↗</span></button></td></tr>`,
        )
        .join("");
      one("#explorer-empty").hidden = groups.length > 0;
    }
    function render() {
      const focused = document.activeElement?.dataset.mapNode;
      const failureFocus = document.activeElement?.classList.contains(
        "failure-row",
      )
        ? document.activeElement.dataset.service
        : null;
      one("#service").value = state.service;
      one("#sort").value = state.sort;
      one("#chart-metric").value = state.metric;
      all("[data-days]").forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(Number(b.dataset.days) === state.days),
        ),
      );
      dailySeries = E.daily(E.select(state, { ignoreDate: true }));
      previousSeries = E.daily(
        E.select(state, { previous: true, ignoreDate: true }),
      );
      all('[data-atlas-scenario]').forEach(button => {
        const presetState = E.parse(guidedScenarios[button.dataset.atlasScenario].query);
        button.setAttribute('aria-pressed', String(!search && Object.keys(presetState).every(key => presetState[key] === state[key])));
      });
      renderKpis();
      renderTrend();
      renderFailures();
      renderDependencies();
      renderExplorer();
      window.dispatchEvent(new CustomEvent("atlas:render"));
      if (focused)
        one(`[data-map-node="${focused}"]`)?.focus({ preventScroll: true });
      if (failureFocus)
        one(`.failure-row[data-service="${failureFocus}"]`)?.focus({
          preventScroll: true,
        });
    }
    function showDetail(id, opener) {
      const s = E.serviceById(id);
      if (!s) return;
      detailId = id;
      const g = E.summarize(portfolioRows().filter((r) => r.id === id));
      const recent = E.daily(
        E.select({ ...state, service: s.name, date: "" }),
      ).slice(-7);
      const dependencies = E.edges.filter((e) => e.from === id);
      const callers = E.edges.filter((e) => e.to === id);
      const relation = (items, direction) =>
        items.length
          ? items
              .map((e) => {
                const other = E.serviceById(e[direction]);
                return `<button class="atlas-button relation-button" data-related="${other.id}">${other.name}${e.async ? " · async" : ""} ↗</button>`;
              })
              .join("")
          : "<p>None in this demonstration graph.</p>";
      one("#detail-content").innerHTML =
        `<h2 id="detail-title" tabindex="-1">${s.name}</h2><p class="detail-description">${s.description}</p><p class="detail-meta">${s.owner} · ${s.kind} · ${state.date ? dateLabel(state.date) : state.days + "-day window"}</p><div class="detail-stats"><div><span>Service requests</span><strong>${fmt(g.requests)}</strong></div><div><span>Success / ${E.slo}% target</span><strong>${g.success.toFixed(3)}%</strong></div><div><span>Weighted average response</span><strong>${fmt(g.latency)} ms</strong></div><div><span>Failed requests</span><strong>${fmt(g.errors)}</strong></div></div><section class="detail-section"><h3>Daily response · last 7 snapshot days</h3><div class="detail-daily">${recent.map((r) => `<button class="detail-day" data-detail-date="${r.date}" aria-label="Focus ${s.name} on ${dateLabel(r.date)}, ${fmt(r.latency)} milliseconds">${dateLabel(r.date)}<span>${fmt(r.latency)} ms</span></button>`).join("")}</div></section><section class="detail-section"><h3>Depends on</h3>${relation(dependencies, "to")}</section><section class="detail-section"><h3>Direct callers</h3>${relation(callers, "from")}</section>`;
      const dialog = one("#service-dialog");
      if (!dialog.open) {
        dialogOpener = opener || document.activeElement;
        dialog.showModal();
      } else one("#detail-title").focus({ preventScroll: true });
    }
    function closeDetail() {
      const dialog = one("#service-dialog");
      if (dialog.open) dialog.close();
      dialogOpener?.focus?.({ preventScroll: true });
    }
    one("#service").addEventListener("change", (e) =>
      update({ service: e.target.value }),
    );
    one("#sort").addEventListener("change", (e) =>
      update({ sort: e.target.value }),
    );
    one("#chart-metric").addEventListener("change", (e) =>
      update({ metric: e.target.value }),
    );
    all("[data-days]").forEach((b) =>
      b.addEventListener("click", () => {
        inspectedIndex = Number(b.dataset.days) - 1;
        update({ days: Number(b.dataset.days) });
      }),
    );
    one("#inspect-day").addEventListener("input", (e) => {
      inspectedIndex = Number(e.target.value);
      inspectDay();
      update({ date: dailySeries[inspectedIndex].date });
    });
    one("#focus-day").addEventListener("click", () =>
      update(
        { date: dailySeries[inspectedIndex].date },
        {
          announce:
            "Workspace focused on " +
            dateLabel(dailySeries[inspectedIndex].date) +
            ".",
        },
      ),
    );
    one("#clear-date").addEventListener("click", () => {
      update({ date: "" });
      one("#inspect-day").focus();
    });
    one("#show-portfolio").addEventListener("click", () =>
      update({ service: "all" }),
    );
    const guidedScenarios = {
      slowdown: {query:'service=Storage&days=7&metric=latency&sort=latency&focus=storage&date=2026-10-08', target:'#dependencies', message:'Viewing the Oct 08 snapshot. Storage is selected; three callers are exposed through synchronous dependencies.'},
      latency: {query:'service=all&days=30&metric=latency&sort=latency&focus=storage&delta=150', target:'#dependencies', message:'Added 150 ms to Storage. Caller impact follows the dependency weights; request volumes and failure rates remain unchanged.'},
      slo: {query:'service=all&days=30&metric=errors&sort=success&focus=storage', target:'#reliability', message:'Viewing failures and error-budget consumption across the 30-day reporting window. Success target: 99.9%.'}
    };
    function applyGuidedScenario(key) {
      const preset = guidedScenarios[key];
      state = E.parse(preset?.query || ''); search = ''; inspectedIndex = state.days - 1;
      one('#service-search').value = '';
      // A preset replaces the complete workspace state, including stale order selections.
      history.replaceState(null, '', location.pathname);
      serialize(); render(); window.dispatchEvent(new CustomEvent('atlas:reset'));
      one('#atlas-scenario-status').textContent = preset?.message || 'Workspace reset. All services, 30-day scope, no selected day or added latency.';
      if (preset) one(preset.target)?.scrollIntoView?.({behavior:'auto', block:'start'});
    }
    all('[data-atlas-scenario]').forEach(button => button.addEventListener('click', () => applyGuidedScenario(button.dataset.atlasScenario)));
    one('#scenario-reset').addEventListener('click', () => applyGuidedScenario(''));
    one('#reset-filters').addEventListener('click', () => {applyGuidedScenario('');toast('Workspace reset.');});
    one("#service-search").value = search;
    one("#service-search").addEventListener("input", (e) => {
      search = e.target.value.slice(0, 80);
      serialize();
      renderExplorer();
    });
    one("#clear-search").addEventListener("click", () => {
      search = "";
      one("#service-search").value = "";
      serialize();
      renderExplorer();
      one("#service-search").focus();
    });
    one("#latency-delta").addEventListener("input", (e) => {
      state.delta = Number(e.target.value);
      serialize();
      render();
    });
    // Delegate interactions so re-rendered visual elements keep one stable event listener.
    one(".atlas-main").addEventListener("click", (e) => {
      const service = e.target.closest("[data-service]"),
        details = e.target.closest("[data-details]");
      if (service) {
        const s = E.serviceById(service.dataset.service);
        update({ service: s.name, focus: s.id });
      }
      if (details) showDetail(details.dataset.details, details);
    });
    one("#open-details").addEventListener("click", (e) =>
      showDetail(state.focus, e.currentTarget),
    );
    one("#close-details").addEventListener("click", closeDetail);
    one("#service-dialog").addEventListener("click", (e) => {
      const related = e.target.closest("[data-related]"),
        day = e.target.closest("[data-detail-date]");
      if (related) showDetail(related.dataset.related);
      if (day) {
        const s = E.serviceById(detailId);
        closeDetail();
        update({ service: s.name, focus: s.id, date: day.dataset.detailDate });
        one("#overview").scrollIntoView?.({ behavior: "auto" });
      }
      if (e.target === one("#service-dialog")) {
        const rect = e.target.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          closeDetail();
      }
    });
    one("#service-dialog").addEventListener("close", () => {
      dialogOpener?.focus?.({ preventScroll: true });
    });
    one("#focus-service").addEventListener("click", () => {
      const s = E.serviceById(detailId);
      closeDetail();
      update({ service: s.name, focus: s.id });
      one("#service").focus({ preventScroll: true });
      one("#overview").scrollIntoView?.({ behavior: "auto" });
    });
    one('#investigate').addEventListener('click', () => applyGuidedScenario('slowdown'));
    one("#share-view").addEventListener("click", async () => {
      serialize();
      try {
        await navigator.clipboard.writeText(location.href);
        toast("View link copied, including filters and model settings.");
      } catch {
        toast("Copy the page address to share this exact view.");
      }
    });
    one("#export-data").addEventListener("click", () => {
      const csv = [
        "dataset,date,service,requests,failed_requests,average_latency_ms,deployments",
        ...analyticsRows().map((r) =>
          [
            "synthetic",
            r.date,
            r.name,
            r.requests,
            r.errors,
            r.latency,
            r.deployments,
          ].join(","),
        ),
      ].join("\r\n");
      const url = URL.createObjectURL(
          new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = `atlas-synthetic-${state.date || state.days + "days"}.csv`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(
        "Selected synthetic records exported. Model estimates are excluded.",
      );
    });
    window.addEventListener("popstate", () => {
      state = E.parse(location.search);
      search =
        new URLSearchParams(location.search).get("q")?.slice(0, 80) || "";
      one("#service-search").value = search;
      render();
    });
    all(".workspace-nav a").forEach((a) =>
      a.addEventListener("click", () => {
        all(".workspace-nav a").forEach((link) =>
          link.removeAttribute("aria-current"),
        );
        a.setAttribute("aria-current", "location");
      }),
    );
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              all(".workspace-nav a").forEach((a) => {
                if (a.getAttribute("href") === "#" + entry.target.id)
                  a.setAttribute("aria-current", "location");
                else a.removeAttribute("aria-current");
              });
            }
        },
        { rootMargin: "-10% 0px -65% 0px", threshold: 0 },
      );
      ["overview", "dependencies", "explorer", "journey"].forEach((id) =>
        observer.observe(one("#" + id)),
      );
    }
    window.addEventListener("atlas:select", (event) => {
      const service = E.serviceById(event.detail?.id);
      if (!service) return;
      const date = event.detail.date || "";
      if (
        date &&
        !E.select(state, { allServices: true, ignoreDate: true }).some(
          (r) => r.date === date,
        )
      )
        return;
      update({ service: service.name, focus: service.id, date });
    });
    render();
    let chartWidth = Math.round(
      one("#volume-chart").getBoundingClientRect().width,
    );
    const resize = () => {
      const width = Math.round(
        one("#volume-chart").getBoundingClientRect().width,
      );
      if (width && width !== chartWidth) {
        chartWidth = width;
        renderTrend();
      }
    };
    if ("ResizeObserver" in window)
      new ResizeObserver(resize).observe(one("#volume-chart"));
    else window.addEventListener("resize", resize);
  } catch (error) {
    const fallback = one('#atlas-error');
    const title = document.createElement('strong');title.textContent = 'Atlas couldn’t start.';
    const description = document.createElement('p');description.textContent = 'Reload the workspace to try again.';
    const retry = document.createElement('a');retry.href = 'visuals.html';retry.textContent = 'Reload workspace ↻';
    fallback.replaceChildren(title, description, retry);fallback.hidden = false;
    one("#selection-summary").textContent =
      "Workspace unavailable. Reload to retry.";
    console.error("Atlas initialization failed.", error);
  }
})();
