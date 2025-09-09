// wwwroot/js/visuals-extra.js
(function () {
    const interop = (window.d3Interop = window.d3Interop || {});

    function clear(sel) {
        const n = typeof sel === "string" ? document.querySelector(sel) : sel;
        if (!n) return null;
        n.innerHTML = "";
        return n;
    }

    // Sparkline: data = [numbers], opts: {width,height}
    interop.renderSparkline = function (selector, data, opts) {
        if (!window.d3) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(80, opts?.width ?? el.clientWidth ?? 120);
        const height = Math.max(24, opts?.height ?? 28);
        const m = { t: 2, r: 2, b: 2, l: 2 }, iw = width - m.l - m.r, ih = height - m.t - m.b;

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const x = d3.scaleLinear().domain([0, data.length - 1]).range([m.l, iw + m.l]);
        const y = d3.scaleLinear().domain([d3.min(data) || 0, d3.max(data) || 1]).nice().range([ih + m.t, m.t]);

        const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);

        svg.append("path")
            .datum(data)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "#5b8def")
            .attr("stroke-width", 1.8)
            .attr("opacity", 0.95);
    };

    // Monthly bars: data = [{month:'YYYY-MM', count}]
    interop.renderMonthlyBars = function (selector, data, opts) {
        if (!window.d3) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(360, el.clientWidth || 680);
        const height = Math.max(200, (opts?.height ?? 240));
        const m = { t: 10, r: 16, b: 30, l: 36 }, iw = width - m.l - m.r, ih = height - m.t - m.b;

        const parse = d3.timeParse("%Y-%m");
        const series = data.map(d => ({ date: parse(d.month), value: +d.count })).filter(d => d.date);

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);

        const x = d3.scaleBand().domain(series.map(d => d.date)).range([0, iw]).padding(0.08);
        const y = d3.scaleLinear().domain([0, d3.max(series, d => d.value) || 1]).nice().range([ih, 0]);

        g.append("g")
            .attr("transform", `translate(0,${ih})`)
            .call(d3.axisBottom(x)
                .tickValues(series.filter((_, i) => i % 6 === 0).map(d => d.date))
                .tickFormat(d3.timeFormat("%b %y"))
                .tickSizeOuter(0));

        g.append("g").call(d3.axisLeft(y).ticks(5));

        g.selectAll("rect")
            .data(series).enter().append("rect")
            .attr("x", d => x(d.date)).attr("y", d => y(d.value))
            .attr("width", x.bandwidth()).attr("height", d => ih - y(d.value))
            .attr("class", "d3-bar");
    };

    // Bullet: model = {value, target?, max?}
    interop.renderBulletChart = function (selector, model, opts) {
        if (!window.d3) return;
        const d3 = window.d3;
        const el = clear(selector); if (!el) return;

        const width = Math.max(260, el.clientWidth || 420);
        const height = Math.max(42, (opts?.height ?? 54));
        const m = { t: 8, r: 16, b: 20, l: 36 }, iw = width - m.l - m.r, ih = height - m.t - m.b;

        const max = Math.max(model.max ?? 0, model.value ?? 0, model.target ?? 0, 1);

        const svg = d3.select(el).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);

        const x = d3.scaleLinear().domain([0, max]).range([0, iw]);

        if (model.target != null) {
            g.append("rect").attr("x", 0).attr("y", ih / 3)
                .attr("width", x(model.target)).attr("height", ih / 3)
                .attr("fill", "#eef3ff");
        }

        g.append("rect").attr("x", 0).attr("y", ih / 2 - 6)
            .attr("width", x(model.value)).attr("height", 12)
            .attr("fill", "#5b8def");

        g.append("g").attr("transform", `translate(0,${ih})`)
            .call(d3.axisBottom(x).ticks(4).tickSizeOuter(0));

        const txt = (model.target != null) ? `${model.value} / ${model.target}` : `${model.value}`;
        g.append("text").attr("x", x(model.value) + 6).attr("y", ih / 2 + 4)
            .attr("dominant-baseline", "middle").attr("fill", "#334").attr("font-size", 12)
            .text(txt);
    };
})();
