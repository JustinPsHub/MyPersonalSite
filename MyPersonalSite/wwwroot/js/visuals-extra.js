// wwwroot/js/visuals-extra.js
(function () {
    // ----------- Theme -----------
    const COLORS = {
        brand: "#0ea5e9",
        brandDark: "#0284c7",
        accent1: "#22c55e",
        accent2: "#f97316",
        accent3: "#14b8a6",
        text: "#0f172a",
        axis: "#d7e2f0",
        grid: "#eef2f7",
        muted: "#64748b",
        chip: "#e0f2fe"
    };
    const PALETTE = [COLORS.brand, COLORS.accent1, COLORS.accent2, COLORS.accent3, "#38bdf8", "#f59e0b"];

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
                  <div style="color:${COLORS.muted}">Deployments</div>
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
                  <div style="color:${COLORS.muted}">Changes</div>
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

        if (BUS.sel) {
            BUS.emit("viz:select", BUS.sel);
        }
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
                  <div style="color:${COLORS.muted}">Changes</div>
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

        if (BUS.sel) {
            BUS.emit("viz:select", BUS.sel);
        }
    };

    // Year momentum line (shares selection with bar chart)
    api.renderYearTrend = function (selector, data, opts) {
        if (!window.d3) return;
        const el = clear(selector); if (!el) return;

        const series = data.map(d => ({
            year: String(d.year ?? d.x ?? d.label ?? ""),
            count: +((d.count ?? d.y ?? d.value) || 0)
        })).filter(d => d.year);

        let running = 0;
        const enriched = series.map(d => ({
            year: d.year,
            count: d.count,
            running: (running += d.count)
        }));

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 320 });

        const x = d3.scalePoint().domain(enriched.map(d => d.year)).range([0, innerW]).padding(0.5);
        const y = d3.scaleLinear().domain([0, d3.max(enriched, d => d.running) || 1]).nice().range([innerH, 0]);

        gridY(g, y, innerW);
        const axX = g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickSizeOuter(0));
        const axY = g.append("g").call(d3.axisLeft(y).ticks(5));
        styleAxis(axX); styleAxis(axY);

        const area = d3.area()
            .x(d => x(d.year))
            .y0(innerH)
            .y1(d => y(d.running))
            .curve(d3.curveMonotoneX);
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.running))
            .curve(d3.curveMonotoneX);

        g.append("path")
            .datum(enriched)
            .attr("d", area)
            .attr("fill", gradient(svg, COLORS.brand))
            .attr("opacity", 0.85);

        g.append("path")
            .datum(enriched)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", COLORS.brandDark)
            .attr("stroke-width", 2.5)
            .attr("opacity", 0.95);

        const dots = g.selectAll("circle.dot").data(enriched).enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.running))
            .attr("r", 0)
            .attr("fill", COLORS.brandDark)
            .attr("stroke", "white")
            .attr("stroke-width", 1.4)
            .attr("data-viz-type", "year")
            .attr("data-viz-key", d => d.year)
            .style("cursor", "pointer")
            .on("mouseenter", (ev, d) => {
                tip.show(`<div style="font-weight:700">${d.year}</div>
                  <div style="color:${COLORS.muted}">Changes</div>
                  <div style="font-weight:700">${fmt(d.count)}</div>
                  <div style="color:${COLORS.muted}">Cumulative</div>
                  <div style="font-weight:700">${fmt(d.running)}</div>`, ev.clientX, ev.clientY);
                BUS.emit("viz:hover", { type: "year", value: d.year });
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => { tip.hide(); BUS.emit("viz:leave"); })
            .on("click", (_ev, d) => {
                const t = "year", v = d.year;
                if (BUS.sel && BUS.sel.type === t && BUS.sel.value === v) BUS.emit("viz:clear");
                else BUS.emit("viz:select", { type: t, value: v });
            });

        dots.transition().duration(600).attr("r", 5.2);

        if (BUS.sel) {
            BUS.emit("viz:select", BUS.sel);
        }
    };

    // Organization bubbles (paired with horizontal bars)
    api.renderOrgBubbles = function (selector, data, opts) {
        if (!window.d3) return;
        const el = clear(selector); if (!el) return;

        const labelKey = data[0]?.label ? "label" : (data[0]?.org ? "org" : "label");
        const valKey = data[0]?.count !== undefined ? "count" : "value";

        const rows = data.map(d => ({
            label: d[labelKey],
            value: +((d[valKey]) || 0)
        })).filter(d => d.value > 0);

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 320 });

        const pack = d3.pack().size([innerW, innerH]).padding(10);
        const root = d3.hierarchy({ children: rows }).sum(d => d.value);
        const nodes = pack(root).leaves();

        const color = d3.scaleOrdinal(PALETTE.concat(["#38bdf8", "#fb7185", "#22c55e"]))
            .domain(nodes.map(n => n.data.label));

        const groups = g.selectAll("g.node").data(nodes).enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .style("cursor", "pointer")
            .on("mouseenter", (ev, d) => {
                const html = `<div style="font-weight:700">${d.data.label}</div>
                  <div style="color:${COLORS.muted}">Changes</div>
                  <div style="font-weight:700">${fmt(d.data.value)}</div>`;
                tip.show(html, ev.clientX, ev.clientY);
                BUS.emit("viz:hover", { type: "org", value: d.data.label });
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => { tip.hide(); BUS.emit("viz:leave"); })
            .on("click", (_ev, d) => {
                const t = "org", v = d.data.label;
                if (BUS.sel && BUS.sel.type === t && BUS.sel.value === v) BUS.emit("viz:clear");
                else BUS.emit("viz:select", { type: t, value: v });
            });

        groups.append("circle")
            .attr("r", 0)
            .attr("fill", d => gradient(svg, color(d.data.label)))
            .attr("data-viz-type", "org")
            .attr("data-viz-key", d => d.data.label)
            .attr("stroke", "rgba(255,255,255,.65)")
            .attr("stroke-width", 1.2)
            .transition().duration(550).ease(d3.easeCubicOut)
            .attr("r", d => d.r);

        groups.each(function (d) {
            const base = d3.color(color(d.data.label));
            const textFill = base && d3.hsl(base).l < 0.6 ? "#f8fafc" : COLORS.text;
            const text = d3.select(this).append("text")
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .style("pointer-events", "none")
                .attr("fill", textFill)
                .style("font-size", Math.min(16, d.r / 2.6) + "px");

            const words = d.data.label.split(/\s+/);
            if (words.length === 1 || d.r < 32) {
                text.text(words.join(" "));
            } else {
                const mid = Math.ceil(words.length / 2);
                text.append("tspan").attr("x", 0).attr("y", -6).text(words.slice(0, mid).join(" "));
                text.append("tspan").attr("x", 0).attr("y", 12).text(words.slice(mid).join(" "));
            }
        });

        if (BUS.sel) {
            BUS.emit("viz:select", BUS.sel);
        }
    };

    // Capability mix stacked columns
    // Capability mix stacked columns
    api.renderVelocityStacked = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const el = clear(selector); if (!el) return;

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 360 });

        // Use explicit keys (and keep only those that exist in the data)
        const SERIES = [
            { key: "apps", label: "Containers" },
            { key: "funcs", label: "Serverless" },
            { key: "adf", label: "Data" },
            { key: "pbi", label: "Observability" }
        ];
        const keys = SERIES.map(s => s.key).filter(k => k in data[0]);
        const labelOf = k => (SERIES.find(s => s.key === k)?.label ?? k);

        const stack = d3.stack().keys(keys);
        const stacked = stack(data.map(d => ({ ...d })));

        const totals = data.map(d => keys.reduce((sum, k) => sum + (+d[k] || 0), 0));
        const x = d3.scaleBand().domain(data.map(d => d.period)).range([0, innerW]).padding(0.24);
        const y = d3.scaleLinear().domain([0, d3.max(totals) || 1]).nice().range([innerH, 0]);

        gridY(g, y, innerW);
        const axX = g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickSizeOuter(0));
        const axY = g.append("g").call(d3.axisLeft(y).ticks(5));
        styleAxis(axX); styleAxis(axY);

        const palette = [COLORS.brand, COLORS.accent1, COLORS.accent2, "#38bdf8"];
        const color = d3.scaleOrdinal(palette).domain(keys);

        const layers = g.selectAll("g.layer").data(stacked).enter().append("g").attr("class", "layer");
        layers.selectAll("rect")
            .data(d => d.map(v => Object.assign({}, v, { key: d.key }))).enter().append("rect")
            .attr("class", "stack-segment")
            .attr("x", d => x(d.data.period))
            .attr("y", innerH)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("rx", 6).attr("ry", 6)
            .attr("fill", d => gradient(svg, color(d.key)))
            .on("mouseenter", (ev, d) => {
                const value = d.data[d.key];
                tip.show(
                    `<div style="font-weight:700">${labelOf(d.key)}</div>
           <div style="color:${COLORS.muted}">${d.data.period}</div>
           <div style="font-weight:700">${fmt(value)}</div>`,
                    ev.clientX, ev.clientY);
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => tip.hide())
            .transition().duration(700)
            .attr("y", d => y(d[1]))
            .attr("height", d => Math.max(0, y(d[0]) - y(d[1])));

        // ---- Legend ----
        if (opts?.legend) {
            const host = typeof opts.legend === "string" ? document.querySelector(opts.legend) : opts.legend;
            if (host) {
                host.innerHTML = "";
                host.classList.add("viz-legend");
                keys.forEach(k => {
                    const item = document.createElement("span");
                    item.className = "legend-item";

                    const sw = document.createElement("span");
                    sw.className = "legend-swatch";
                    sw.style.background = color(k);

                    const txt = document.createElement("span");
                    txt.className = "legend-text";
                    txt.textContent = labelOf(k);

                    item.appendChild(sw);
                    item.appendChild(txt);
                    host.appendChild(item);

                    // Optional: toggle layer visibility
                    item.addEventListener("click", () => {
                        const off = item.classList.toggle("off");
                        d3.select(el).selectAll(`.layer`).filter(d => d.key === k).style("opacity", off ? 0.15 : 1);
                    });
                });
            }
        }
    };

    // Monthly heatmap (year x month)
    api.renderMonthlyHeatmap = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const el = clear(selector); if (!el) return;

        const parseMonth = (v) => d3.timeParse("%Y-%m")(v) || d3.timeParse("%Y-%m-%d")(v);
        const rows = data.map(d => {
            const date = parseMonth(d.month);
            return date ? { date, value: +d.count || 0 } : null;
        }).filter(Boolean);

        const years = Array.from(new Set(rows.map(r => r.date.getFullYear()))).sort((a, b) => a - b);
        const months = d3.range(0, 12);
        const lookup = new Map(rows.map(r => [`${r.date.getFullYear()}-${r.date.getMonth()}`, r.value]));

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 260 });
        const cellW = Math.max(18, Math.floor(innerW / 12));
        const cellH = Math.max(18, Math.floor(innerH / Math.max(1, years.length)));

        const maxVal = d3.max(rows, r => r.value) || 1;
        const color = d3.scaleSequential(d3.interpolateBlues).domain([0, maxVal]);

        const x = d3.scaleBand().domain(months).range([0, cellW * 12]).padding(0.08);
        const y = d3.scaleBand().domain(years).range([0, cellH * years.length]).padding(0.12);

        const monthFmt = d3.timeFormat("%b");
        g.selectAll("text.month").data(months).enter().append("text")
            .attr("class", "month")
            .attr("x", m => x(m) + x.bandwidth() / 2)
            .attr("y", -6)
            .attr("text-anchor", "middle")
            .attr("fill", COLORS.muted)
            .style("font-size", "11px")
            .text(m => monthFmt(new Date(2024, m, 1)));

        g.selectAll("text.year").data(years).enter().append("text")
            .attr("class", "year")
            .attr("x", -8)
            .attr("y", y)
            .attr("dy", "0.95em")
            .attr("text-anchor", "end")
            .attr("fill", COLORS.muted)
            .style("font-size", "11px")
            .text(d => d);

        g.selectAll("rect.cell").data(years.flatMap(year => months.map(month => ({
            year,
            month,
            value: lookup.get(`${year}-${month}`) || 0
        })))).enter().append("rect")
            .attr("class", "cell")
            .attr("x", d => x(d.month))
            .attr("y", d => y(d.year))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("rx", 6).attr("ry", 6)
            .attr("fill", d => color(d.value))
            .attr("stroke", "rgba(15,23,42,0.05)")
            .on("mouseenter", (ev, d) => {
                const label = `${d3.timeFormat("%b")(new Date(d.year, d.month, 1))} ${d.year}`;
                tip.show(`<div style="font-weight:700">${label}</div>
                  <div style="color:${COLORS.muted}">Deployments</div>
                  <div style="font-weight:700">${fmt(d.value)}</div>`, ev.clientX, ev.clientY);
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => tip.hide());
    };

    // ADO radial gauge
    api.renderAdoGauge = function (selector, model, opts) {
        if (!window.d3 || !model) return;
        const el = clear(selector); if (!el) return;

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 220 });
        const size = Math.min(innerW, innerH);
        const cx = innerW / 2;
        const cy = innerH / 2 + 10;
        const radius = size / 2 - 20;

        const max = Math.max(model.max ?? 0, model.value ?? 0, model.target ?? 0, 1);
        const val = model.value ?? 0;
        const target = model.target ?? max;

        const scale = d3.scaleLinear().domain([0, max]).range([-Math.PI * 0.75, Math.PI * 0.75]);
        const arc = d3.arc().innerRadius(radius * 0.65).outerRadius(radius);

        const bg = arc({ startAngle: scale(0), endAngle: scale(max) });
        g.append("path")
            .attr("d", bg)
            .attr("transform", `translate(${cx},${cy})`)
            .attr("fill", "#e2e8f0");

        const progress = arc({ startAngle: scale(0), endAngle: scale(val) });
        g.append("path")
            .attr("d", progress)
            .attr("transform", `translate(${cx},${cy})`)
            .attr("fill", gradient(svg, COLORS.brandDark));

        const targetAngle = scale(target);
        g.append("line")
            .attr("x1", cx + Math.cos(targetAngle) * radius * 0.6)
            .attr("y1", cy + Math.sin(targetAngle) * radius * 0.6)
            .attr("x2", cx + Math.cos(targetAngle) * radius)
            .attr("y2", cy + Math.sin(targetAngle) * radius)
            .attr("stroke", COLORS.accent2)
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round");

        g.append("text")
            .attr("x", cx)
            .attr("y", cy - 6)
            .attr("text-anchor", "middle")
            .attr("fill", COLORS.text)
            .style("font-size", "22px")
            .style("font-weight", 700)
            .text(fmt(val));

        g.append("text")
            .attr("x", cx)
            .attr("y", cy + 16)
            .attr("text-anchor", "middle")
            .attr("fill", COLORS.muted)
            .style("font-size", "12px")
            .text(`Target ${fmt(target)}`);

        g.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", radius)
            .attr("fill", "transparent")
            .on("mouseenter", (ev) => {
                tip.show(`<div style="font-weight:700">IaC adoption</div>
                  <div style="color:${COLORS.muted}">Current</div>
                  <div style="font-weight:700">${fmt(val)}</div>
                  <div style="color:${COLORS.muted}">Target</div>
                  <div style="font-weight:700">${fmt(target)}</div>`, ev.clientX, ev.clientY);
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => tip.hide());
    };

    // Capability radar (averaged across periods)
    api.renderCapabilityRadar = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const el = clear(selector); if (!el) return;

        const keys = ["apps", "funcs", "adf", "pbi"].filter(k => k in data[0]);
        const labels = {
            apps: "Containers",
            funcs: "Serverless",
            adf: "Data",
            pbi: "Observability"
        };
        const weights = { apps: 1.25, funcs: 1.15, adf: 1.1, pbi: 1.05 };
        const avg = keys.map(k => ({
            key: k,
            label: labels[k] || k,
            value: (d3.mean(data, d => +d[k] || 0) || 0) * (weights[k] ?? 1)
        }));

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 360 });
        const radius = Math.min(innerW, innerH) / 2 - 20;
        const centerX = innerW / 2;
        const centerY = innerH / 2;

        const maxVal = d3.max(avg, d => d.value) || 1;
        const r = d3.scaleLinear().domain([0, maxVal]).range([0, radius]);
        const angle = d3.scaleLinear().domain([0, avg.length]).range([0, Math.PI * 2]);

        const gridLevels = 4;
        for (let i = 1; i <= gridLevels; i++) {
            g.append("circle")
                .attr("cx", centerX).attr("cy", centerY)
                .attr("r", (radius / gridLevels) * i)
                .attr("fill", "none")
                .attr("stroke", "rgba(15,23,42,0.12)");
        }

        avg.forEach((d, i) => {
            const a = angle(i) - Math.PI / 2;
            const x = centerX + Math.cos(a) * radius;
            const y = centerY + Math.sin(a) * radius;
            g.append("line")
                .attr("x1", centerX).attr("y1", centerY)
                .attr("x2", x).attr("y2", y)
                .attr("stroke", "rgba(15,23,42,0.18)");

            g.append("text")
                .attr("x", centerX + Math.cos(a) * (radius + 16))
                .attr("y", centerY + Math.sin(a) * (radius + 16))
                .attr("text-anchor", Math.cos(a) > 0.2 ? "start" : Math.cos(a) < -0.2 ? "end" : "middle")
                .attr("fill", COLORS.muted)
                .style("font-size", "11px")
                .text(d.label);
        });

        const line = d3.lineRadial()
            .radius(d => r(d.value))
            .angle((d, i) => angle(i))
            .curve(d3.curveCatmullRomClosed);

        g.append("path")
            .datum(avg)
            .attr("transform", `translate(${centerX},${centerY})`)
            .attr("d", line)
            .attr("fill", gradient(svg, COLORS.brand))
            .attr("stroke", COLORS.brandDark)
            .attr("stroke-width", 2)
            .attr("opacity", 0.9);

        g.selectAll("circle.point").data(avg).enter().append("circle")
            .attr("class", "point")
            .attr("cx", (d, i) => centerX + Math.cos(angle(i) - Math.PI / 2) * r(d.value))
            .attr("cy", (d, i) => centerY + Math.sin(angle(i) - Math.PI / 2) * r(d.value))
            .attr("r", 4.5)
            .attr("fill", COLORS.brandDark)
            .attr("stroke", "white")
            .attr("stroke-width", 1.2)
            .on("mouseenter", (ev, d) => {
                tip.show(`<div style="font-weight:700">${d.label}</div>
                  <div style="color:${COLORS.muted}">Average</div>
                  <div style="font-weight:700">${fmt(d.value)}</div>`, ev.clientX, ev.clientY);
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => tip.hide());
    };

    // Year distribution donut
    api.renderYearDonut = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const el = clear(selector); if (!el) return;

        const rows = data.map(d => ({ label: String(d.year ?? d.x ?? d.label ?? ""), value: +d.count || 0 }))
            .filter(d => d.label && d.value > 0);

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 320 });
        const radius = Math.min(innerW, innerH) / 2 - 10;

        const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
        const pie = d3.pie().value(d => d.value).sort(null);
        const color = d3.scaleOrdinal(PALETTE.concat(["#38bdf8", "#fb7185", "#22c55e"]))
            .domain(rows.map(r => r.label));

        const group = g.append("g").attr("transform", `translate(${innerW / 2},${innerH / 2})`);
        group.selectAll("path").data(pie(rows)).enter().append("path")
            .attr("d", arc)
            .attr("fill", d => color(d.data.label))
            .attr("data-viz-type", "year")
            .attr("data-viz-key", d => d.data.label)
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .on("mouseenter", (ev, d) => {
                tip.show(`<div style="font-weight:700">${d.data.label}</div>
                  <div style="color:${COLORS.muted}">Changes</div>
                  <div style="font-weight:700">${fmt(d.data.value)}</div>`, ev.clientX, ev.clientY);
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => tip.hide());

        group.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", COLORS.muted)
            .style("font-size", "12px")
            .text("Changes");
    };

    // Organization impact treemap
    api.renderOrgTreemap = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const el = clear(selector); if (!el) return;

        const rows = data.map(d => ({ label: d.org ?? d.label ?? "", value: +d.count || 0 }))
            .filter(d => d.label && d.value > 0);

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 320 });
        const root = d3.hierarchy({ children: rows }).sum(d => d.value);
        d3.treemap().size([innerW, innerH]).padding(6).round(true)(root);

        const color = d3.scaleOrdinal(PALETTE.concat(["#38bdf8", "#fb7185", "#22c55e"]))
            .domain(rows.map(r => r.label));

        const nodes = g.selectAll("g.node").data(root.leaves()).enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`)
            .on("mouseenter", (ev, d) => {
                tip.show(`<div style="font-weight:700">${d.data.label}</div>
                  <div style="color:${COLORS.muted}">Changes</div>
                  <div style="font-weight:700">${fmt(d.data.value)}</div>`, ev.clientX, ev.clientY);
            })
            .on("mousemove", ev => tip.move(ev.clientX, ev.clientY))
            .on("mouseleave", () => tip.hide());

        nodes.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("rx", 10).attr("ry", 10)
            .attr("fill", d => gradient(svg, color(d.data.label)))
            .attr("data-viz-type", "org")
            .attr("data-viz-key", d => d.data.label)
            .attr("stroke", "rgba(255,255,255,.65)");

        nodes.append("text")
            .attr("x", 8)
            .attr("y", 18)
            .attr("fill", "#f8fafc")
            .style("font-size", "12px")
            .style("font-weight", 600)
            .text(d => d.data.label)
            .each(function (d) {
                const w = d.x1 - d.x0;
                if (this.getComputedTextLength() > w - 16) {
                    const text = d.data.label;
                    const truncated = text.length > 18 ? text.slice(0, 16) + "..." : text;
                    d3.select(this).text(truncated);
                }
            });
    };


    // Reliability rolling success
    api.renderReliabilityArea = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const el = clear(selector); if (!el) return;

        const points = data.map(d => {
            const date = new Date(d.date);
            const ok = +d.ok || 0;
            const fail = +d.fail || 0;
            const total = ok + fail;
            const pct = total === 0 ? 100 : (ok / total) * 100;
            return { date, ok, fail, total, pct };
        }).sort((a, b) => a.date - b.date);

        const { svg, g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 320 });

        const x = d3.scaleTime().domain(d3.extent(points, d => d.date)).range([0, innerW]);
        const minPct = d3.min(points, d => d.pct) ?? 100;
        const lower = Math.max(80, Math.floor(minPct) - 5);
        const y = d3.scaleLinear().domain([lower, 100]).nice().range([innerH, 0]);

        gridY(g, y, innerW);
        const axX = g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6));
        const axY = g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));
        styleAxis(axX); styleAxis(axY);

        const area = d3.area()
            .x(d => x(d.date))
            .y0(innerH)
            .y1(d => y(d.pct))
            .curve(d3.curveMonotoneX);
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.pct))
            .curve(d3.curveMonotoneX);

        g.append("path").datum(points)
            .attr("d", area)
            .attr("fill", gradient(svg, COLORS.brand))
            .attr("opacity", 0.6);

        g.append("path").datum(points)
            .attr("d", line)
            .attr("class", "d3-line")
            .attr("stroke", COLORS.brandDark)
            .attr("stroke-width", 2.4);

        const failScale = d3.scaleSqrt().domain([0, d3.max(points, d => d.fail) || 1]).range([0, 12]);
        g.selectAll("circle.fail-bubble").data(points.filter(d => d.fail > 0)).enter().append("circle")
            .attr("class", "fail-bubble")
            .attr("cx", d => x(d.date))
            .attr("cy", innerH - 8)
            .attr("r", 0)
            .attr("fill", "rgba(239,68,68,.75)")
            .attr("stroke", "rgba(239,68,68,.9)")
            .attr("stroke-width", 1.2)
            .transition().duration(500).attr("r", d => failScale(d.fail));

        const focusLine = g.append("line")
            .attr("class", "viz-focus-line")
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", COLORS.muted)
            .attr("stroke-dasharray", "3,3")
            .attr("opacity", 0);

        const focusDot = g.append("circle")
            .attr("class", "viz-focus-dot")
            .attr("r", 5)
            .attr("fill", COLORS.brandDark)
            .attr("stroke", "white")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0);

        const bisect = d3.bisector(d => d.date).center;
        const fmtPct = d3.format(".1f");
        const timeFmt = d3.timeFormat("%b %d");

        g.append("rect")
            .attr("width", innerW)
            .attr("height", innerH)
            .attr("fill", "transparent")
            .on("mousemove", (ev) => {
                const [mx] = d3.pointer(ev);
                const idx = bisect(points, x.invert(mx));
                const d = points[Math.max(0, Math.min(points.length - 1, idx))];
                focusLine.attr("x1", x(d.date)).attr("x2", x(d.date)).attr("opacity", 0.45);
                focusDot.attr("cx", x(d.date)).attr("cy", y(d.pct)).attr("opacity", 1);
                tip.show(`<div style="font-weight:700">${timeFmt(d.date)}</div>
                  <div style="color:${COLORS.muted}">Success rate</div>
                  <div style="font-weight:700">${fmtPct(d.pct)}%</div>
                  <div style="color:${COLORS.muted}">Incidents</div>
                  <div style="font-weight:700">${d.fail}</div>`, ev.clientX, ev.clientY);
            })
            .on("mouseleave", () => {
                tip.hide();
                focusLine.attr("opacity", 0);
                focusDot.attr("opacity", 0);
            });
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

