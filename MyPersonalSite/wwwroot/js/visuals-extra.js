// visuals-extra.js  —  upgrades for d3Interop charts (theme, animation, tooltips, polish)
(function () {
    // If the base interop isn't ready yet, try again shortly
    function deferPatch() {
        if (window.d3Interop) { patch(); return; }
        setTimeout(deferPatch, 50);
    }

    function patch() {
        const base = window.d3Interop || {};
        const api = {};

        // --- CSS variables (fallbacks for non-CSS-var contexts) ---
        const css = (name, fallback) => getComputedStyle(document.documentElement)
            .getPropertyValue(name).trim() || fallback;

        const COLORS = {
            text: css("--text", "#0f172a"),
            muted: css("--muted", "#5c6a86"),
            grid: css("--border", "#e9eef8"),
            card: css("--card", "#ffffff"),
            brand: css("--brand", "#5b8def"),
            brand2: "#87a6ff",
            brand3: "#3558e6"
        };

        // --- Tooltip (singleton) ---
        const tip = (function () {
            let el;
            function ensure() {
                if (el) return el;
                el = document.createElement("div");
                el.id = "d3-tooltip";
                el.style.position = "fixed";
                el.style.pointerEvents = "none";
                el.style.zIndex = "2000";
                el.style.minWidth = "10px";
                el.style.maxWidth = "280px";
                el.style.padding = "6px 8px";
                el.style.borderRadius = "8px";
                el.style.boxShadow = "0 8px 24px rgba(2,12,27,.15)";
                el.style.fontSize = "12px";
                el.style.lineHeight = "1.25";
                el.style.border = `1px solid ${COLORS.grid}`;
                el.style.background = COLORS.card;
                el.style.color = COLORS.text;
                el.style.opacity = "0";
                el.style.transition = "opacity .12s ease, transform .12s ease";
                el.style.transform = "translateY(-2px)";
                document.body.appendChild(el);
                return el;
            }
            function show(html, x, y) {
                const n = ensure();
                n.innerHTML = html;
                move(x, y);
                requestAnimationFrame(() => { n.style.opacity = "1"; n.style.transform = "translateY(0)"; });
            }
            function move(x, y) {
                const n = ensure();
                const padding = 12;
                const vw = window.innerWidth, vh = window.innerHeight;
                const rect = n.getBoundingClientRect();
                let left = x + 12, top = y + 12;
                if (left + rect.width + padding > vw) left = x - rect.width - 12;
                if (top + rect.height + padding > vh) top = y - rect.height - 12;
                n.style.left = `${left}px`;
                n.style.top = `${top}px`;
            }
            function hide() {
                if (!el) return;
                el.style.opacity = "0";
                el.style.transform = "translateY(-2px)";
            }
            return { show, move, hide };
        })();

        // --- Helpers ---
        const fmtInt = (n) => (window.d3 ? window.d3.format(",")(n) : String(n));
        let uidSeq = 0;
        const uid = (p) => `${p}-${++uidSeq}`;

        function selectEl(sel) {
            return (typeof sel === "string") ? document.querySelector(sel) : sel;
        }

        function makeSvg(el, { width, height, margin }) {
            const d3 = window.d3;
            const w = Math.max(320, width || el.clientWidth || 600);
            const h = Math.max(140, height || 260);
            const m = Object.assign({ top: 8, right: 12, bottom: 32, left: 44 }, margin || {});
            const innerW = w - m.left - m.right;
            const innerH = h - m.top - m.bottom;

            const svg = d3.select(el).append("svg")
                .attr("width", "100%")
                .attr("height", h)
                .attr("viewBox", `0 0 ${w} ${h}`)
                .attr("preserveAspectRatio", "xMidYMid meet");

            const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

            return { svg, g, innerW, innerH, m, w, h };
        }

        function drawGridY(g, y, innerW) {
            const d3 = window.d3;
            g.append("g")
                .attr("class", "d3-grid-y")
                .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""))
                .selectAll("line")
                .attr("stroke", COLORS.grid);
        }

        function drawGridX(g, x, innerH) {
            const d3 = window.d3;
            g.append("g")
                .attr("class", "d3-grid-x")
                .attr("transform", `translate(0,${innerH})`)
                .call(d3.axisBottom(x).tickSize(-innerH).tickFormat(""))
                .selectAll("line")
                .attr("stroke", COLORS.grid);
        }

        function styleAxis(axisG) {
            axisG.selectAll("path, line").attr("stroke", COLORS.grid);
            axisG.selectAll("text").attr("fill", COLORS.muted);
        }

        // === Upgraded charts (override originals) ==========================

        // Vertical bars with hover, grid, gradient, labels, animation
        api.renderBarChart = function (selector, data, opts) {
            if (!window.d3 || !data?.length) return;
            const d3 = window.d3;
            const el = selectEl(selector); if (!el) return;

            const xKey = data[0]?.x !== undefined ? "x" : (data[0]?.year !== undefined ? "year" : Object.keys(data[0])[0]);
            const yKey = data[0]?.y !== undefined ? "y" : (data[0]?.count !== undefined ? "count" : Object.keys(data[0])[1]);

            const { g, svg, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 360 });

            // Gradient
            const gradId = uid("grad-vbar");
            const defs = svg.append("defs");
            const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
            grad.append("stop").attr("offset", "0%").attr("stop-color", COLORS.brand2);
            grad.append("stop").attr("offset", "100%").attr("stop-color", COLORS.brand);

            const x = d3.scaleBand().domain(data.map(d => d[xKey])).range([0, innerW]).padding(0.18);
            const y = d3.scaleLinear().domain([0, d3.max(data, d => +d[yKey]) || 1]).nice().range([innerH, 0]);

            drawGridY(g, y, innerW);
            const axX = g.append("g").attr("class", "d3-axis-x").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickSizeOuter(0));
            const axY = g.append("g").attr("class", "d3-axis-y").call(d3.axisLeft(y).ticks(5));
            styleAxis(axX); styleAxis(axY);

            const bars = g.selectAll("rect.d3-bar")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "d3-bar")
                .attr("x", d => x(d[xKey]))
                .attr("y", innerH)
                .attr("width", x.bandwidth())
                .attr("height", 0)
                .attr("rx", 6).attr("ry", 6)
                .attr("fill", `url(#${gradId})`)
                .on("mouseenter", (ev, d) => {
                    const html = `<div style="font-weight:700;color:${COLORS.text}">${d[xKey]}</div>
                        <div style="color:${COLORS.muted}">Value</div>
                        <div style="font-weight:700;color:${COLORS.text}">${fmtInt(d[yKey])}</div>`;
                    tip.show(html, ev.clientX, ev.clientY);
                    d3.select(ev.currentTarget).attr("filter", "drop-shadow(0 6px 14px rgba(2,12,27,.18))");
                })
                .on("mousemove", (ev) => tip.move(ev.clientX, ev.clientY))
                .on("mouseleave", (ev) => {
                    tip.hide();
                    d3.select(ev.currentTarget).attr("filter", null);
                });

            bars.transition().duration(700).ease(d3.easeCubicOut)
                .attr("y", d => y(d[yKey]))
                .attr("height", d => innerH - y(d[yKey]));

            // Value labels (only if bar is tall enough)
            g.selectAll("text.v-label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "v-label")
                .attr("x", d => (x(d[xKey]) + x.bandwidth() / 2))
                .attr("y", d => y(d[yKey]) - 6)
                .attr("text-anchor", "middle")
                .attr("fill", COLORS.muted)
                .style("font-size", "11px")
                .text(d => fmtInt(d[yKey]))
                .style("opacity", 0)
                .transition().delay(500).style("opacity", 1);
        };

        // Horizontal bars (ranked) with hover and grid
        api.renderHorizontalBarChart = function (selector, data, opts) {
            if (!window.d3 || !data?.length) return;
            const d3 = window.d3;
            const el = selectEl(selector); if (!el) return;

            const labelKey = data[0]?.label ? "label" : (data[0]?.org ? "org" : Object.keys(data[0])[0]);
            const valKey = data[0]?.count !== undefined ? "count" : (data[0]?.value !== undefined ? "value" : Object.keys(data[0])[1]);

            const height = Math.max(140, opts?.height ?? (28 * data.length + 40));
            const { g, svg, innerW, innerH } = makeSvg(el, { height });

            // Gradient horizontal
            const gradId = uid("grad-hbar");
            const defs = svg.append("defs");
            const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", "0").attr("y1", "0").attr("x2", "1").attr("y2", "0");
            grad.append("stop").attr("offset", "0%").attr("stop-color", COLORS.brand);
            grad.append("stop").attr("offset", "100%").attr("stop-color", COLORS.brand3);

            const y = window.d3.scaleBand().domain(data.map(d => d[labelKey])).range([0, innerH]).padding(0.18);
            const x = window.d3.scaleLinear().domain([0, window.d3.max(data, d => +d[valKey]) || 1]).nice().range([0, innerW]);

            drawGridX(g, x, innerH);
            const axY = g.append("g").attr("class", "d3-axis-y").call(d3.axisLeft(y).tickSizeOuter(0));
            const axX = g.append("g").attr("class", "d3-axis-x").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(5));
            styleAxis(axY); styleAxis(axX);

            const bars = g.selectAll("rect.d3-hbar")
                .data(data)
                .enter()
                .append("rect")
                .attr("class", "d3-hbar")
                .attr("x", 0)
                .attr("y", d => y(d[labelKey]))
                .attr("height", y.bandwidth())
                .attr("width", 0)
                .attr("rx", 6).attr("ry", 6)
                .attr("fill", `url(#${gradId})`)
                .on("mouseenter", (ev, d) => {
                    const html = `<div style="font-weight:700;color:${COLORS.text}">${d[labelKey]}</div>
                        <div style="color:${COLORS.muted}">Count</div>
                        <div style="font-weight:700;color:${COLORS.text}">${fmtInt(d[valKey])}</div>`;
                    tip.show(html, ev.clientX, ev.clientY);
                    d3.select(ev.currentTarget).attr("filter", "drop-shadow(0 6px 14px rgba(2,12,27,.18))");
                })
                .on("mousemove", (ev) => tip.move(ev.clientX, ev.clientY))
                .on("mouseleave", (ev) => { tip.hide(); d3.select(ev.currentTarget).attr("filter", null); });

            bars.transition().duration(750).ease(d3.easeCubicOut)
                .attr("width", d => x(d[valKey]));

            // Value labels
            g.selectAll("text.h-label")
                .data(data)
                .enter()
                .append("text")
                .attr("class", "h-label")
                .attr("x", d => Math.max(12, x(d[valKey]) + 6))
                .attr("y", d => y(d[labelKey]) + y.bandwidth() / 2 + 4)
                .attr("fill", COLORS.muted)
                .style("font-size", "11px")
                .text(d => fmtInt(d[valKey]));
        };

        // Monthly bars (last 48 months) with hover
        api.renderMonthlyBars = function (selector, data, opts) {
            if (!window.d3 || !data?.length) return;
            const d3 = window.d3;
            const el = selectEl(selector); if (!el) return;

            const { g, svg, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 240 });
            const parse = d3.timeParse("%Y-%m");
            const series = data.map(d => ({ date: parse(d.month), value: +d.count }))
                .filter(d => d.date);

            const x = d3.scaleBand().domain(series.map(d => d.date)).range([0, innerW]).padding(0.08);
            const y = d3.scaleLinear().domain([0, d3.max(series, d => d.value) || 1]).nice().range([innerH, 0]);

            drawGridY(g, y, innerW);
            const axX = g.append("g").attr("class", "d3-axis-x").attr("transform", `translate(0,${innerH})`)
                .call(d3.axisBottom(x)
                    .tickValues(series.filter((_, i) => (i % 6) === 0).map(d => d.date))
                    .tickFormat(d3.timeFormat("%b %y"))
                    .tickSizeOuter(0));
            const axY = g.append("g").attr("class", "d3-axis-y").call(d3.axisLeft(y).ticks(5));
            styleAxis(axX); styleAxis(axY);

            // gradient
            const gradId = uid("grad-month");
            const defs = svg.append("defs");
            const grad = defs.append("linearGradient").attr("id", gradId).attr("x1", "0").attr("y1", "0").attr("x2", "0").attr("y2", "1");
            grad.append("stop").attr("offset", "0%").attr("stop-color", COLORS.brand2);
            grad.append("stop").attr("offset", "100%").attr("stop-color", COLORS.brand);

            g.selectAll("rect.month")
                .data(series)
                .enter().append("rect")
                .attr("class", "d3-bar")
                .attr("x", d => x(d.date))
                .attr("y", innerH)
                .attr("width", x.bandwidth())
                .attr("height", 0)
                .attr("rx", 5).attr("ry", 5)
                .attr("fill", `url(#${gradId})`)
                .on("mouseenter", (ev, d) => {
                    tip.show(`<div style="font-weight:700">${d3.timeFormat("%b %Y")(d.date)}</div>
                    <div style="color:${COLORS.muted}">Count</div>
                    <div style="font-weight:700;color:${COLORS.text}">${fmtInt(d.value)}</div>`,
                        ev.clientX, ev.clientY);
                })
                .on("mousemove", (ev) => tip.move(ev.clientX, ev.clientY))
                .on("mouseleave", () => tip.hide())
                .transition().duration(700).ease(d3.easeCubicOut)
                .attr("y", d => y(d.value))
                .attr("height", d => innerH - y(d.value));
        };

        // Bullet chart (value vs target) with animation + tooltip
        api.renderBulletChart = function (selector, model, opts) {
            if (!window.d3 || !model) return;
            const d3 = window.d3;
            const el = selectEl(selector); if (!el) return;

            const { g, innerW, innerH } = makeSvg(el, { height: opts?.height ?? 56, margin: { top: 8, right: 16, bottom: 20, left: 36 } });

            const max = Math.max(model.max ?? 0, model.value ?? 0, model.target ?? 0, 1);
            const x = d3.scaleLinear().domain([0, max]).range([0, innerW]);

            // target band
            if (model.target != null) {
                g.append("rect")
                    .attr("x", 0).attr("y", innerH / 3)
                    .attr("width", x(model.target)).attr("height", innerH / 3)
                    .attr("fill", "#eef3ff");
            }

            // actual bar
            const bar = g.append("rect")
                .attr("x", 0).attr("y", innerH / 2 - 6)
                .attr("height", 12).attr("width", 0)
                .attr("rx", 6).attr("ry", 6)
                .attr("fill", COLORS.brand)
                .on("mouseenter", (ev) => {
                    const label = (model.target != null)
                        ? `${fmtInt(model.value)} / ${fmtInt(model.target)}`
                        : fmtInt(model.value);
                    tip.show(`<div style="font-weight:700">Progress</div><div>${label}</div>`, ev.clientX, ev.clientY);
                })
                .on("mousemove", (ev) => tip.move(ev.clientX, ev.clientY))
                .on("mouseleave", () => tip.hide());

            bar.transition().duration(800).ease(d3.easeCubicOut)
                .attr("width", x(model.value));

            // x ticks
            g.append("g").attr("transform", `translate(0,${innerH})`)
                .call(d3.axisBottom(x).ticks(4).tickSizeOuter(0))
                .selectAll("path,line").attr("stroke", COLORS.grid);

            // label (to the right of the bar)
            g.append("text")
                .attr("x", x(model.value) + 8)
                .attr("y", innerH / 2 + 4)
                .attr("dominant-baseline", "middle")
                .attr("fill", COLORS.muted)
                .style("font-size", "12px")
                .text(model.target != null ? `${fmtInt(model.value)} / ${fmtInt(model.target)}` : fmtInt(model.value));
        };

        // Sparkline: now adds last-point dot
        api.renderSparkline = function (selector, data, opts) {
            if (!window.d3 || !data?.length) return;
            const d3 = window.d3;
            const el = selectEl(selector); if (!el) return;

            const width = Math.max(80, opts?.width ?? el.clientWidth ?? 120);
            const height = Math.max(24, opts?.height ?? 28);
            const m = { top: 2, right: 2, bottom: 2, left: 2 };

            const svg = d3.select(el).append("svg")
                .attr("width", width).attr("height", height);

            const innerW = width - m.left - m.right;
            const innerH = height - m.top - m.bottom;

            const x = d3.scaleLinear().domain([0, data.length - 1]).range([m.left, innerW + m.left]);
            const y = d3.scaleLinear().domain([d3.min(data) || 0, d3.max(data) || 1]).nice()
                .range([innerH + m.top, m.top]);

            const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);

            svg.append("path")
                .datum(data)
                .attr("d", line)
                .attr("fill", "none")
                .attr("stroke", COLORS.brand)
                .attr("stroke-width", 1.8);

            // last-point dot
            const last = data[data.length - 1];
            svg.append("circle")
                .attr("cx", x(data.length - 1))
                .attr("cy", y(last))
                .attr("r", 2.8)
                .attr("fill", COLORS.brand3);
        };

        // Merge our upgrades into d3Interop
        window.d3Interop = Object.assign({}, base, api);
    }

    deferPatch();
})();
