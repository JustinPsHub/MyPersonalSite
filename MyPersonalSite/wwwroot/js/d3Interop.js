// wwwroot/js/d3Interop.js
(function () {
    const api = {};

    // ---------------- D3 loader (CSP-safe, local only) ----------------
    api.waitForD3 = async function () {
        if (window.d3) return true;
        if (!document.getElementById("d3js-local")) {
            const s = document.createElement("script");
            s.id = "d3js-local";
            s.src = "/lib/d3/dist/d3.min.js"; // installed via libman
            s.defer = true;
            document.head.appendChild(s);
        }
        const t0 = Date.now();
        while (!window.d3) {
            await new Promise(r => setTimeout(r, 25));
            if (Date.now() - t0 > 5000) return false;
        }
        ensureTip();
        return true;
    };

    // ---------------- helpers ----------------
    const $ = (sel) => document.querySelector(sel);

    function clear(el) {
        const n = typeof el === "string" ? $(el) : el;
        if (!n) return null;
        n.innerHTML = "";
        return n;
    }

    // Tooltip (one per app)
    let tipEl;
    function ensureTip() {
        if (!tipEl) {
            tipEl = document.createElement("div");
            tipEl.id = "d3-tooltip";
            document.body.appendChild(tipEl);
        }
    }
    function showTip(event, html) {
        if (!tipEl) return;
        tipEl.innerHTML = html;
        tipEl.style.left = (event.clientX) + "px";
        tipEl.style.top = (event.clientY - 12) + "px";
        tipEl.classList.add("show");
    }
    function hideTip() {
        if (tipEl) tipEl.classList.remove("show");
    }

    // Palettes
    function categorical(name) {
        const d3 = window.d3;
        switch ((name || "").toLowerCase()) {
            case "tableau": return d3.schemeTableau10;
            case "pastel": return ["#a8dadc", "#f4a261", "#e9c46a", "#84a59d", "#cdb4db", "#90caf9", "#c2e59c", "#f7a6a6", "#ffd166", "#7dd3fc"];
            case "set2": return d3.schemeSet2;
            case "set3": return d3.schemeSet3;
            case "brand":
            default: return ["#5b8def", "#3fbf9b", "#f59e0b", "#a78bfa", "#ef4444", "#22c55e", "#0ea5e9", "#fb7185", "#94a3b8", "#eab308"];
        }
    }
    function sequential(name) {
        const d3 = window.d3;
        switch ((name || "").toLowerCase()) {
            case "greens": return d3.interpolateGreens;
            case "oranges": return d3.interpolateOranges;
            case "purples": return d3.interpolatePurples;
            case "magma": return d3.interpolateMagma;
            case "plasma": return d3.interpolatePlasma;
            case "cool": return d3.interpolateCool;
            case "warm": return d3.interpolateWarm;
            case "blues":
            default: return d3.interpolateBlues;
        }
    }
    function colorerFrom(opts, domain) {
        const d3 = window.d3;
        if (opts?.color) {
            const c = opts.color;
            return () => c; // solid color override
        }
        const pal = opts?.palette;
        if (!pal) return null;

        // sequential palettes act over index (or value if numeric)
        const seq = sequential(pal);
        const cat = categorical(pal);

        if (["blues", "greens", "oranges", "purples", "magma", "plasma", "cool", "warm"].includes(pal.toLowerCase())) {
            const scale = d3.scaleLinear().domain([0, (domain?.length ?? 1) - 1]).range([0, 1]);
            return (_, i) => seq(scale(i));
        } else {
            const scale = d3.scaleOrdinal(cat).domain(domain || []);
            return (d, _) => scale(d);
        }
    }

    function axisGridY(g, scale, width) {
        const d3 = window.d3;
        g.attr("class", "d3-grid").call(
            d3.axisLeft(scale).ticks(5).tickSize(-width).tickFormat("")
        );
        g.select(".domain").remove();
    }

    // ---------------- simple vertical bar chart ----------------
    // data: [{x,y}] or [{year,count}]
    api.renderBarChart = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const xKey = data[0]?.x !== undefined ? "x" : (data[0]?.year !== undefined ? "year" : "x");
        const yKey = data[0]?.y !== undefined ? "y" : (data[0]?.count !== undefined ? "count" : "y");

        const width = Math.max(320, el.clientWidth || 640);
        const height = Math.max(220, (opts?.height ?? 360));
        const m = { top: 10, right: 16, bottom: 36, left: 40 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleBand().domain(data.map(d => d[xKey])).range([0, iw]).padding(0.14);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[yKey]) || 1]).nice().range([ih, 0]);

        // grid + axes
        axisGridY(g.append("g"), y, iw);
        g.append("g").attr("class", "d3-axis-x").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickSizeOuter(0));
        g.append("g").attr("class", "d3-axis-y").call(d3.axisLeft(y).ticks(5));

        // colors
        const colorByKey = opts?.colorBy || xKey;
        const domain = data.map(d => d[colorByKey]);
        const colorer = colorerFrom(opts, domain);

        const bars = g.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "d3-bar")
            .attr("x", d => x(d[xKey]))
            .attr("y", ih)              // animate from bottom
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("rx", 6).attr("ry", 6)
            .style("fill", d => colorer ? colorer(d[colorByKey], domain.indexOf(d[colorByKey])) : null)
            .on("mousemove", function (event, d) {
                // hover dim
                bars.attr("opacity", p => p === d ? 1 : 0.35);
                const label = `${xKey}: <strong>${d[xKey]}</strong><br/>${yKey}: <strong>${d[yKey]}</strong>`;
                showTip(event, label);
            })
            .on("mouseleave", function () {
                bars.attr("opacity", 0.95);
                hideTip();
            })
            .on("click", function (event, d) {
                // toggle selection highlight
                const isSel = this.classList.toggle("viz-selected");
                if (!event.ctrlKey) {
                    bars.filter(function () { return this !== event.currentTarget; }).classed("viz-selected", false);
                }
            });

        // animate in
        bars.transition().duration(450)
            .attr("y", d => y(d[yKey]))
            .attr("height", d => ih - y(d[yKey]));
    };

    // ---------------- horizontal bar chart ----------------
    // data: [{label,count}] or [{org,count}]
    api.renderHorizontalBarChart = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const labelKey = data[0]?.label ? "label" : (data[0]?.org ? "org" : "label");
        const valKey = "count";

        const width = Math.max(360, el.clientWidth || 640);
        const height = Math.max(140, (opts?.height ?? (28 * data.length + 32)));
        const m = { top: 8, right: 16, bottom: 28, left: 160 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

        const y = d3.scaleBand().domain(data.map(d => d[labelKey])).range([0, ih]).padding(0.18);
        const x = d3.scaleLinear().domain([0, d3.max(data, d => +d[valKey]) || 1]).nice().range([0, iw]);

        axisGridY(g.append("g"), d3.scaleLinear().domain([0, 5]).range([0, ih]), iw); // faint horizontal grid
        g.append("g").attr("class", "d3-axis-y").call(d3.axisLeft(y).tickSizeOuter(0));
        g.append("g").attr("class", "d3-axis-x").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5));

        const colorer = colorerFrom(opts, data.map(d => d[labelKey]));

        const bars = g.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "d3-hbar")
            .attr("y", d => y(d[labelKey]))
            .attr("x", 0)
            .attr("height", y.bandwidth())
            .attr("width", 0)
            .attr("rx", 6).attr("ry", 6)
            .style("fill", d => colorer ? colorer(d[labelKey]) : null)
            .on("mousemove", (event, d) => {
                bars.attr("opacity", p => p === d ? 1 : 0.35);
                showTip(event, `${d[labelKey]}<br/>Count: <strong>${d[valKey]}</strong>`);
            })
            .on("mouseleave", () => { bars.attr("opacity", 0.95); hideTip(); })
            .on("click", function (event, d) {
                const isSel = this.classList.toggle("viz-selected");
                if (!event.ctrlKey) {
                    bars.filter(function () { return this !== event.currentTarget; }).classed("viz-selected", false);
                }
            });

        bars.transition().duration(450).attr("width", d => x(d[valKey]));
    };

    // ---------------- sparkline (tiny trend) ----------------
    api.renderSparkline = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(80, opts?.width ?? el.clientWidth ?? 120);
        const height = Math.max(24, opts?.height ?? 28);
        const m = { top: 2, right: 2, bottom: 2, left: 2 };

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const x = d3.scaleLinear().domain([0, data.length - 1]).range([m.left, iw + m.left]);
        const y = d3.scaleLinear().domain([d3.min(data) || 0, d3.max(data) || 1]).nice().range([ih + m.top, m.top]);

        const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);

        svg.append("path")
            .datum(data)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "#5b8def")
            .attr("stroke-width", 1.8)
            .attr("opacity", 0.95);
    };

    // ---------------- monthly bars (last 48 months) ----------------
    // data: [{month:'YYYY-MM', count}]
    api.renderMonthlyBars = function (selector, data, opts) {
        if (!window.d3 || !data?.length) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(360, el.clientWidth || 680);
        const height = Math.max(200, (opts?.height ?? 240));
        const m = { top: 10, right: 16, bottom: 30, left: 40 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const parse = d3.timeParse("%Y-%m");
        const series = data.map(d => ({ date: parse(d.month), value: +d.count }))
            .filter(d => d.date);

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleBand().domain(series.map(d => d.date)).range([0, iw]).padding(0.08);
        const y = d3.scaleLinear().domain([0, d3.max(series, d => d.value) || 1]).nice().range([ih, 0]);

        const tickVals = series.filter((_, i) => (i % 6) === 0).map(d => d.date);
        const xAxis = d3.axisBottom(x).tickValues(tickVals).tickFormat(d3.timeFormat("%b %y")).tickSizeOuter(0);

        axisGridY(g.append("g"), y, iw);
        g.append("g").attr("class", "d3-axis-x").attr("transform", `translate(0,${ih})`).call(xAxis);
        g.append("g").attr("class", "d3-axis-y").call(d3.axisLeft(y).ticks(5));

        // sequential color across time
        const seq = sequential((opts?.palette || "blues"));
        const c = d3.scaleLinear().domain([0, series.length - 1]).range([0, 1]);

        const rects = g.selectAll("rect")
            .data(series)
            .enter()
            .append("rect")
            .attr("class", "d3-bar")
            .attr("x", d => x(d.date))
            .attr("y", ih)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("rx", 5).attr("ry", 5)
            .style("fill", (_, i) => seq(c(i)))
            .on("mousemove", (event, d) => {
                const label = `${d3.timeFormat("%b %Y")(d.date)}<br/>Count: <strong>${d.value}</strong>`;
                rects.attr("opacity", p => p === d ? 1 : 0.35);
                showTip(event, label);
            })
            .on("mouseleave", () => { rects.attr("opacity", 0.95); hideTip(); });

        rects.transition().duration(450)
            .attr("y", d => y(d.value))
            .attr("height", d => ih - y(d.value));
    };

    // ---------------- bullet chart (goal vs actual) ----------------
    // model: {value, target?, max?}
    api.renderBulletChart = function (selector, model, opts) {
        if (!window.d3) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(260, el.clientWidth || 420);
        const height = Math.max(42, (opts?.height ?? 54));
        const m = { top: 8, right: 16, bottom: 20, left: 36 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        const max = Math.max(model.max ?? 0, model.value ?? 0, model.target ?? 0, 1);

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
        const x = d3.scaleLinear().domain([0, max]).range([0, iw]);

        if (model.target != null) {
            g.append("rect")
                .attr("x", 0).attr("y", ih / 3)
                .attr("width", x(model.target)).attr("height", ih / 3)
                .attr("fill", "#eef3ff");
        }

        g.append("rect")
            .attr("x", 0).attr("y", ih / 2 - 6)
            .attr("width", x(model.value)).attr("height", 12)
            .attr("fill", "#5b8def").attr("rx", 6).attr("ry", 6);

        g.append("g").attr("transform", `translate(0,${ih})`).attr("class", "d3-axis-x")
            .call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));

        const label = (model.target != null) ? `${model.value} / ${model.target}` : `${model.value}`;
        g.append("text")
            .attr("x", x(model.value) + 6)
            .attr("y", ih / 2 + 4)
            .attr("dominant-baseline", "middle")
            .attr("fill", "#334").attr("font-size", 12)
            .text(label);
    };

    window.d3Interop = api;
})();
