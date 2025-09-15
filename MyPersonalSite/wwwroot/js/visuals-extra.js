// wwwroot/js/visuals-extra.js
(function () {
    // ----------- Theme -----------
    const COLORS = {
        brand: "#5b8def",
        brandDark: "#3558e6",
        accent1: "#22c55e",
        accent2: "#f59e0b",
        accent3: "#a78bfa",
        text: "#0f172a",
        axis: "#cfd8ea",
        grid: "#e9eef8",
        muted: "#67758f",
        chip: "#eef3ff"
    };
    const PALETTE = [COLORS.brand, COLORS.accent1, COLORS.accent2, COLORS.accent3, "#60a5fa", "#f97316"];

    const fmt = (v) => {
        const n = +v;
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
        if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
        return String(n);
    };

    // ----------- Tooltip -----------
    const tip = (() => {
        const el = document.createElement("div");
        el.className = "viz-tip";
        el.style.position = "fixed";
        el.style.zIndex = "2000";
        el.style.pointerEvents = "none";
        el.style.display = "none";
        document.body.appendChild(el);
        function show(html, x, y) {
            el.innerHTML = html;
            el.style.display = "block";
            move(x, y);
        }
        function move(x, y) {
            const pad = 12, w = el.offsetWidth, h = el.offsetHeight;
            el.style.left = Math.min(window.innerWidth - w - pad, x + pad) + "px";
            el.style.top = Math.min(window.innerHeight - h - pad, y + pad) + "px";
        }
        function hide() { el.style.display = "none"; }
        return { show, move, hide };
    })();

    // ----------- Helpers -----------
    function clear(el) {
        const node = typeof el === "string" ? document.querySelector(el) : el;
        if (!node) return null;
        node.innerHTML = "";
        return node;
    }
    function makeSvg(el, opts) {
        const node = clear(el); if (!node) return {};
        const width = Math.max(340, node.clientWidth || 700);
        const height = Math.max(160, opts?.height ?? 280);
        const margin = { top: 10, right: 16, bottom: 34, left: 44 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(node).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        return { svg, g, width, height, innerW, innerH };
    }
    function styleAxis(ax) {
        ax.selectAll("path, line").attr("stroke", COLORS.axis);
        ax.selectAll("text").attr("fill", COLORS.muted).style("font-size", "12px");
    }
    function gridY(g, y, w) {
        g.append("g").attr("class", "viz-grid")
            .call(d3.axisLeft(y).tickSize(-w).tickFormat(""))
            .selectAll("line").attr("stroke", COLORS.grid);
        g.selectAll(".viz-grid path").remove();
    }
    function gridX(g, x, h) {
        g.append("g").attr("class", "viz-grid").attr("transform", `translate(0,${h})`)
            .call(d3.axisBottom(x).tickSize(-h).tickFormat(""))
            .selectAll("line").attr("stroke", COLORS.grid);
        g.selectAll(".viz-grid path").remove();
    }
    // --- replace the whole gradient() function in wwwroot/js/visuals-extra.js ---
    function gradient(svg, color) {
        // cache gradients per SVG to avoid cross-SVG id collisions
        const node = svg.node();
        node.__gradMap = node.__gradMap || new Map();

        let id = node.__gradMap.get(color);
        if (id) return `url(#${id})`;

        // create a new gradient inside *this* svg
        let defs = svg.select("defs");
        if (defs.empty()) defs = svg.append("defs");

        // unique id within this svg
        id = `g_${color.replace(/[^a-z0-9]/gi, "")}_${Math.random().toString(36).slice(2, 7)}`;
        const lg = defs.append("linearGradient")
            .attr("id", id)
            .attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");

        lg.append("stop").attr("offset", "0%").attr("stop-color", d3.color(color).brighter(0.45));
        lg.append("stop").attr("offset", "100%").attr("stop-color", d3.color(color).darker(0.2));

        node.__gradMap.set(color, id);
        return `url(#${id})`;
    }


    // ----------- Cross-highlight bus -----------
    const BUS = (() => {
        const listeners = {};
        function on(ev, cb) { (listeners[ev] ??= []).push(cb); }
        function emit(ev, payload) { (listeners[ev] || []).forEach(cb => cb(payload)); }
        return { on, emit, sel: null };
    })();

    // hover highlight
    BUS.on("viz:hover", ({ type, value }) => {
        d3.selectAll("[data-viz-type]").classed("muted", true).classed("em", false);
        d3.selectAll(`[data-viz-type="${type}"][data-viz-key="${value}"]`).classed("muted", false).classed("em", true);
    });
    BUS.on("viz:leave", () => {
        d3.selectAll("[data-viz-type]").classed("muted", false).classed("em", false);
    });
    // persistent selection
    BUS.on("viz:select", sel => {
        BUS.sel = sel;
        d3.selectAll("[data-viz-type]").classed("selected", false).classed("muted", true);
        d3.selectAll(`[data-viz-type="${sel.type}"][data-viz-key="${sel.value}"]`)
            .classed("selected", true).classed("muted", false);
    });
    BUS.on("viz:clear", () => {
        BUS.sel = null;
        d3.selectAll("[data-viz-type]").classed("selected", false).classed("muted", false);
    });

    // ----------- Public API -----------
    const api = {};

    // KPI sparkline
    api.renderSparkline = function (selector, data, opts) {
        if (!window.d3) return;
        const w = Math.max(120, opts?.width ?? 140);
        const h = Math.max(24, opts?.height ?? 28);
        const el = clear(selector); if (!el) return;

        const svg = d3.select(el).append("svg").attr("width", w).attr("height", h);
        const x = d3.scaleLinear().domain([0, data.length - 1]).range([4, w - 4]);
        const y = d3.scaleLinear().domain([d3.min(data) || 0, d3.max(data) || 1]).nice().range([h - 4, 4]);

        const area = d3.area().x((d, i) => x(i)).y0(h - 4).y1(d => y(d)).curve(d3.curveMonotoneX);
        const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);

        svg.append("path").datum(data).attr("d", area).attr("fill", COLORS.chip);
        svg.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", COLORS.brand).attr("stroke-width", 2);
    };

    // Monthly bars (velocity) with brush
    api.renderMonthlyBars = function (selector, data, opts) {
        if (!window.d3) return;
        const el = clear(selector); if (!el) return;
        const parse = d3.timeParse("%Y-%m");
        const series = data.map(d => ({ date: parse(d.month), value: +d.count })).filter(d => d.date);
        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 240 });

        const x = d3.scaleBand().domain(series.map(d => d.date)).range([0, innerW]).padding(0.08);
        const y = d3.scaleLinear().domain([0, d3.max(series, d => d.value) || 1]).nice().range([innerH, 0]);

        gridY(g, y, innerW);
        const axX = g.append("g").attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x).tickValues(series.filter((_, i) => i % 6 === 0).map(d => d.date)).tickFormat(d3.timeFormat("%b %y")).tickSizeOuter(0));
        const axY = g.append("g").call(d3.axisLeft(y).ticks(5));
        styleAxis(axX); styleAxis(axY);

        const bars = g.selectAll("rect").data(series).enter().append("rect")
            .attr("x", d => x(d.date)).attr("y", innerH).attr("width", x.bandwidth()).attr("height", 0)
            .attr("rx", 4).attr("ry", 4).style("cursor", "crosshair")
            .attr("fill", gradient(svg, COLORS.brand))
            .attr("data-viz-type", "month").attr("data-viz-key", d3.timeFormat("%Y-%m"))
            .on("mouseenter", (ev, d) => {
                tip.show(`<div style="font-weight:700">${d3.timeFormat("%b %Y")(d.date)}</div>
                  <div style="color:${COLORS.muted}">Items</div>
                  <div style="font-weight:700">${fmt(d.value)}</div>`, ev.clientX, ev.clientY);
                BUS.emit("viz:hover", { type: "month", value: d3.timeFormat("%Y-%m")(d.date) });
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => { tip.hide(); BUS.emit("viz:leave"); });

        bars.transition().duration(700).ease(d3.easeCubicOut)
            .attr("y", d => y(d.value)).attr("height", d => innerH - y(d.value));

        const brush = d3.brushX().extent([[0, 0], [innerW, innerH]]).on("brush end", ({ selection }) => {
            if (!selection) { bars.classed("muted", false); return; }
            const [x0, x1] = selection;
            bars.classed("muted", d => {
                const cx = x(d.date) + x.bandwidth() / 2;
                return !(cx >= x0 && cx <= x1);
            });
        });
        g.append("g").attr("class", "brush").call(brush);
    };

    // Vertical bars (Entries per Year)
    api.renderBarChart = function (selector, data, opts) {
        if (!window.d3) return;
        const el = clear(selector); if (!el) return;

        const has = (k) => Object.prototype.hasOwnProperty.call(data[0], k);
        const xKey = has("year") ? "year" : (has("x") ? "x" : Object.keys(data[0])[0]);
        const yKey = has("count") ? "count" : (has("y") ? "y" : Object.keys(data[0]).find(k => typeof data[0][k] === "number" && k !== xKey) || Object.keys(data[0])[1]);
        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 360 });

        const cats = data.map(d => String(d[xKey]));
        const color = d3.scaleOrdinal(PALETTE).domain(cats);

        const x = d3.scaleBand().domain(cats).range([0, innerW]).padding(0.18);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[yKey]) || 1]).nice().range([innerH, 0]);

        gridY(g, y, innerW);
        const axX = g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickSizeOuter(0));
        const axY = g.append("g").call(d3.axisLeft(y).ticks(5));
        styleAxis(axX); styleAxis(axY);

        const bars = g.selectAll("rect").data(data).enter().append("rect")
            .attr("x", d => x(String(d[xKey]))).attr("y", innerH)
            .attr("width", x.bandwidth()).attr("height", 0)
            .attr("rx", 6).attr("ry", 6).style("cursor", "pointer")
            .attr("fill", d => gradient(svg, color(String(d[xKey]))))
            .attr("data-viz-type", has("year") ? "year" : "x")
            .attr("data-viz-key", d => String(d[xKey]))
            .on("mouseenter", (ev, d) => {
                tip.show(`<div style="font-weight:700">${d[xKey]}</div>
                  <div style="color:${COLORS.muted}">Count</div>
                  <div style="font-weight:700">${fmt(d[yKey])}</div>`, ev.clientX, ev.clientY);
                BUS.emit("viz:hover", { type: has("year") ? "year" : "x", value: String(d[xKey]) });
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => { tip.hide(); BUS.emit("viz:leave"); })
            .on("click", (_ev, d) => {
                const t = has("year") ? "year" : "x", v = String(d[xKey]);
                if (BUS.sel && BUS.sel.type === t && BUS.sel.value === v) BUS.emit("viz:clear");
                else BUS.emit("viz:select", { type: t, value: v });
            });

        bars.transition().duration(700).ease(d3.easeCubicOut)
            .attr("y", d => y(d[yKey])).attr("height", d => innerH - y(d[yKey]));

        g.selectAll("text.vlab").data(data).enter().append("text")
            .attr("class", "vlab").attr("text-anchor", "middle")
            .attr("x", d => x(String(d[xKey])) + x.bandwidth() / 2)
            .attr("y", d => y(d[yKey]) - 6).attr("fill", COLORS.muted)
            .style("font-size", "11px").style("opacity", 0).text(d => fmt(d[yKey]))
            .transition().delay(450).style("opacity", 1);
    };

    // Horizontal bars (Entries by Org) with click selection
    api.renderHorizontalBarChart = function (selector, data, opts) {
        if (!window.d3) return;
        const el = clear(selector); if (!el) return;

        const labelKey = data[0]?.label ? "label" : (data[0]?.org ? "org" : "label");
        const valKey = "count";
        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? Math.max(160, 28 * data.length + 50) });

        const y = d3.scaleBand().domain(data.map(d => d[labelKey])).range([0, innerH]).padding(0.22);
        const x = d3.scaleLinear().domain([0, d3.max(data, d => +d[valKey]) || 1]).nice().range([0, innerW]);

        gridX(g, x, innerH);
        const axY = g.append("g").call(d3.axisLeft(y).tickSizeOuter(0));
        const axX = g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(5));
        styleAxis(axX); styleAxis(axY);

        const bars = g.selectAll("rect").data(data).enter().append("rect")
            .attr("y", d => y(d[labelKey])).attr("x", 0)
            .attr("width", 0).attr("height", y.bandwidth())
            .attr("rx", 6).attr("ry", 6).style("cursor", "pointer")
            .attr("fill", gradient(svg, COLORS.brand))
            .attr("data-viz-type", "org").attr("data-viz-key", d => d[labelKey])
            .on("mouseenter", (ev, d) => {
                tip.show(`<div style="font-weight:700">${d[labelKey]}</div>
                  <div style="color:${COLORS.muted}">Entries</div>
                  <div style="font-weight:700">${fmt(d[valKey])}</div>`, ev.clientX, ev.clientY);
                BUS.emit("viz:hover", { type: "org", value: d[labelKey] });
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => { tip.hide(); BUS.emit("viz:leave"); })
            .on("click", (_ev, d) => {
                const t = "org", v = d[labelKey];
                if (BUS.sel && BUS.sel.type === t && BUS.sel.value === v) BUS.emit("viz:clear");
                else BUS.emit("viz:select", { type: t, value: v });
            });

        bars.transition().duration(700).ease(d3.easeCubicOut).attr("width", d => x(d[valKey]));

        g.selectAll("text.hlab").data(data).enter().append("text")
            .attr("class", "hlab").attr("x", d => x(d[valKey]) + 6)
            .attr("y", d => y(d[labelKey]) + y.bandwidth() / 2 + 4)
            .attr("fill", COLORS.muted).style("font-size", "11px").text(d => fmt(d[valKey]));
    };

    // Bullet (goal vs actual)
    api.renderBulletChart = function (selector, model, opts) {
        if (!window.d3) return;
        const el = clear(selector); if (!el) return;
        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 56 });

        const max = Math.max(model.max ?? 0, model.value ?? 0, model.target ?? 0, 1);
        const x = d3.scaleLinear().domain([0, max]).range([0, innerW]);

        if (model.target != null) {
            g.append("rect").attr("x", 0).attr("y", innerH / 3)
                .attr("width", x(model.target)).attr("height", innerH / 3).attr("fill", COLORS.chip);
        }
        g.append("rect").attr("x", 0).attr("y", innerH / 2 - 6)
            .attr("width", x(model.value)).attr("height", 12).attr("rx", 6).attr("ry", 6)
            .attr("fill", gradient(svg, COLORS.brandDark));

        const ax = g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));
        styleAxis(ax);

        const label = (model.target != null) ? `${fmt(model.value)} / ${fmt(model.target)}` : fmt(model.value);
        g.append("text").attr("x", x(model.value) + 8).attr("y", innerH / 2 + 4)
            .attr("fill", COLORS.muted).style("font-size", "12px").text(label);
    };

    // expose onto existing d3Interop (keeping waitForD3 from your loader)
    window.d3Interop = window.d3Interop || {};
    Object.assign(window.d3Interop, api);
})();
