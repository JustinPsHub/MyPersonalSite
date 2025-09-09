// wwwroot/js/d3Interop.js
(function () {
    const api = {};

    // ---- D3 loader (CSP-safe, local only) ----
    api.waitForD3 = async function () {
        if (window.d3) return true;

        // Avoid double-injecting
        if (!document.getElementById("d3js-local")) {
            const s = document.createElement("script");
            s.id = "d3js-local";
            s.src = "/lib/d3/dist/d3.min.js"; // libman path
            s.defer = true;
            document.head.appendChild(s);
        }

        // Poll for d3 presence
        const start = Date.now();
        while (!window.d3) {
            await new Promise(r => setTimeout(r, 25));
            if (Date.now() - start > 5000) return false; // give up after 5s
        }
        return true;
    };

    // ---- utilities ----
    function clear(el) {
        const n = typeof el === "string" ? document.querySelector(el) : el;
        if (!n) return null;
        n.innerHTML = "";
        return n;
    }

    // theme tokens (fallbacks if CSS vars are missing)
    const cssVar = (name, fb) =>
        (getComputedStyle(document.documentElement).getPropertyValue(name) || fb).trim();
    const brand = cssVar("--brand", "#5b8def");
    const text = cssVar("--text", "#0f172a");
    const grid = cssVar("--border", "#e9eef8");

    // singleton tooltip
    function getTip() {
        let t = document.getElementById("viz-tip");
        if (!t) {
            t = document.createElement("div");
            t.id = "viz-tip";
            t.className = "viz-tip";
            document.body.appendChild(t);
        }
        return t;
    }
    function showTip(html, ev) {
        const t = getTip();
        t.innerHTML = html;
        t.style.left = `${ev.clientX}px`;
        t.style.top = `${ev.clientY}px`;
        t.classList.add("show");
    }
    function hideTip() {
        const t = getTip();
        t.classList.remove("show");
    }

    // ---- simple vertical bar chart: data = [{x, y}] or [{year, count}] ----
    api.renderBarChart = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const xKey = data[0]?.x !== undefined ? "x" : (data[0]?.year !== undefined ? "year" : "x");
        const yKey = data[0]?.y !== undefined ? "y" : (data[0]?.count !== undefined ? "count" : "y");

        const width = Math.max(300, el.clientWidth || 600);
        const height = Math.max(220, (opts?.height ?? 360));

        const m = { top: 10, right: 16, bottom: 36, left: 44 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleBand().domain(data.map(d => d[xKey])).range([0, iw]).padding(0.13);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[yKey]) || 1]).nice().range([ih, 0]);

        // grid
        g.append("g")
            .attr("class", "d3-grid")
            .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
            .selectAll("line").attr("stroke", grid);

        // axes
        g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickSizeOuter(0));
        g.append("g").call(d3.axisLeft(y).ticks(5));

        // bars
        const bars = g.selectAll("rect.d3-bar").data(data).enter()
            .append("rect")
            .attr("class", "d3-bar")
            .attr("x", d => x(d[xKey]))
            .attr("y", ih)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("rx", 4).attr("ry", 4)
            .attr("tabindex", 0);

        // animate in
        bars.transition().duration(650)
            .attr("y", d => y(d[yKey]))
            .attr("height", d => ih - y(d[yKey]));

        // tooltip + highlight
        const fmt = d3.format(",");
        bars.on("pointerenter focus", function (ev, d) {
            d3.select(this).attr("opacity", 1);
            showTip(`<div><strong>${d[xKey]}</strong></div><div>${fmt(+d[yKey])}</div>`, ev);
        })
            .on("pointermove", ev => showTip(getTip().innerHTML, ev))
            .on("pointerleave blur", function () { d3.select(this).attr("opacity", .9); hideTip(); });
    };

    // ---- simple horizontal bar chart: data = [{label,count}] or [{org,count}] ----
    api.renderHorizontalBarChart = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const labelKey = data[0]?.label ? "label" : (data[0]?.org ? "org" : "label");
        const valKey = "count";

        const width = Math.max(320, el.clientWidth || 600);
        const height = Math.max(120, (opts?.height ?? (28 * data.length + 28)));

        const m = { top: 8, right: 16, bottom: 32, left: 160 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

        const y = d3.scaleBand().domain(data.map(d => d[labelKey])).range([0, ih]).padding(0.2);
        const x = d3.scaleLinear().domain([0, d3.max(data, d => +d[valKey]) || 1]).nice().range([0, iw]);

        // grid (vertical)
        g.append("g")
            .attr("class", "d3-grid")
            .call(d3.axisBottom(x).ticks(5).tickSize(-ih).tickFormat(""))
            .attr("transform", `translate(0,${ih})`)
            .selectAll("line").attr("stroke", grid);

        // axes
        g.append("g").call(d3.axisLeft(y).tickSizeOuter(0));
        g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5));

        const bars = g.selectAll("rect.d3-hbar").data(data).enter()
            .append("rect")
            .attr("class", "d3-hbar")
            .attr("y", d => y(d[labelKey]))
            .attr("x", 0)
            .attr("width", 0)
            .attr("height", y.bandwidth())
            .attr("rx", 4).attr("ry", 4)
            .attr("tabindex", 0);

        bars.transition().duration(650)
            .attr("width", d => x(d[valKey]));

        const fmt = d3.format(",");
        bars.on("pointerenter focus", function (ev, d) {
            d3.select(this).attr("opacity", 1);
            showTip(`<div><strong>${d[labelKey]}</strong></div><div>${fmt(+d[valKey])}</div>`, ev);
        })
            .on("pointermove", ev => showTip(getTip().innerHTML, ev))
            .on("pointerleave blur", function () { d3.select(this).attr("opacity", .9); hideTip(); });
    };

    // ---- sparkline: tiny trend under KPI ----
    // data = [numbers]; opts: {width,height}
    api.renderSparkline = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(80, opts?.width ?? el.clientWidth ?? 120);
        const height = Math.max(24, opts?.height ?? 28);
        const m = { top: 2, right: 2, bottom: 2, left: 2 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);

        const x = d3.scaleLinear().domain([0, data.length - 1]).range([m.left, iw + m.left]);
        const y = d3.scaleLinear().domain([d3.min(data) || 0, d3.max(data) || 1]).nice().range([ih + m.top, m.top]);

        // subtle area + line
        const area = d3.area().x((d, i) => x(i)).y0(y(d3.min(data) || 0)).y1(d => y(d)).curve(d3.curveMonotoneX);
        svg.append("path").datum(data).attr("d", area).attr("fill", brand).attr("opacity", .18);

        const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);
        svg.append("path").datum(data).attr("d", line).attr("fill", "none").attr("stroke", brand).attr("stroke-width", 1.8).attr("opacity", 0.95);

        // hover value
        const bisect = d3.bisector((d, i) => i).left;
        svg.on("pointermove", (ev) => {
            const [px] = d3.pointer(ev);
            const i = Math.max(0, Math.min(data.length - 1, bisect(data, Math.round(x.invert(px)))));
            showTip(`<strong>${data[i]}</strong>`, ev);
        }).on("pointerleave", hideTip);
    };

    // ---- monthly bars (last 48 months): data = [{month:'YYYY-MM', count}] ----
    api.renderMonthlyBars = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(360, el.clientWidth || 680);
        const height = Math.max(200, (opts?.height ?? 240));
        const m = { top: 12, right: 16, bottom: 32, left: 44 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const parse = d3.timeParse("%Y-%m");
        const series = data.map(d => ({ date: parse(d.month), value: +d.count }))
            .filter(d => d.date);

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleBand().domain(series.map(d => d.date)).range([0, iw]).padding(0.1);
        const y = d3.scaleLinear().domain([0, d3.max(series, d => d.value) || 1]).nice().range([ih, 0]);

        // grid
        g.append("g")
            .attr("class", "d3-grid")
            .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
            .selectAll("line").attr("stroke", grid);

        const xAxis = d3.axisBottom(x)
            .tickValues(series.filter((_, i) => (i % 6) === 0).map(d => d.date))
            .tickFormat(d3.timeFormat("%b %y"))
            .tickSizeOuter(0);

        g.append("g").attr("transform", `translate(0,${ih})`).call(xAxis);
        g.append("g").call(d3.axisLeft(y).ticks(5));

        const bars = g.selectAll("rect.d3-bar").data(series).enter().append("rect")
            .attr("class", "d3-bar")
            .attr("x", d => x(d.date))
            .attr("y", ih)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("rx", 4).attr("ry", 4)
            .attr("tabindex", 0);

        bars.transition().duration(650)
            .attr("y", d => y(d.value))
            .attr("height", d => ih - y(d.value));

        bars.on("pointerenter focus", function (ev, d) {
            d3.select(this).attr("opacity", 1);
            showTip(`<div><strong>${d3.timeFormat("%b %Y")(d.date)}</strong></div><div>${d.value} shipped</div>`, ev);
        })
            .on("pointermove", ev => showTip(getTip().innerHTML, ev))
            .on("pointerleave blur", function () { d3.select(this).attr("opacity", .9); hideTip(); });
    };

    // ---- bullet chart (goal vs actual): {value, target?, max?} ----
    api.renderBulletChart = function (selector, model, opts) {
        if (!window.d3 || !model) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(260, el.clientWidth || 420);
        const height = Math.max(42, (opts?.height ?? 54));
        const m = { top: 8, right: 16, bottom: 22, left: 44 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const max = Math.max(model.max ?? 0, model.value ?? 0, model.target ?? 0, 1);

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleLinear().domain([0, max]).range([0, iw]);

        // qualitative ranges (50/90/100%)
        const r1 = x(max * 0.5), r2 = x(max * 0.9), r3 = x(max);
        g.append("rect").attr("x", 0).attr("y", ih / 3).attr("width", r1).attr("height", ih / 3).attr("fill", "#f4f7ff");
        g.append("rect").attr("x", r1).attr("y", ih / 3).attr("width", r2 - r1).attr("height", ih / 3).attr("fill", "#e9eefc");
        g.append("rect").attr("x", r2).attr("y", ih / 3).attr("width", r3 - r2).attr("height", ih / 3).attr("fill", "#dfe7fb");

        const bar = g.append("rect")
            .attr("x", 0).attr("y", ih / 2 - 6).attr("width", 0).attr("height", 12)
            .attr("rx", 6).attr("ry", 6).attr("fill", brand).attr("opacity", .95);

        bar.transition().duration(700).attr("width", x(model.value));

        if (model.target != null) {
            const tx = x(model.target);
            g.append("line").attr("x1", tx).attr("x2", tx).attr("y1", ih / 2 - 10).attr("y2", ih / 2 + 10)
                .attr("stroke", text).attr("stroke-width", 2).attr("stroke-opacity", .7);
        }

        g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));

        const label = (model.target != null) ? `${model.value} / ${model.target}` : `${model.value}`;
        g.append("text").attr("x", x(model.value) + 6).attr("y", ih / 2 + 4)
            .attr("dominant-baseline", "middle").attr("fill", text).attr("opacity", .7).attr("font-size", 12).text(label);

        svg.on("pointerenter pointermove", (ev) => {
            const pct = Math.round((model.value / max) * 100);
            const t = (model.target != null) ? ` / <strong>${model.target}</strong> target` : "";
            showTip(`<div><strong>${model.value}</strong>${t}</div><div>${pct}% of max</div>`, ev);
        }).on("pointerleave", hideTip);
    };

    window.d3Interop = api;
})();
