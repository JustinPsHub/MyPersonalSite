// wwwroot/js/d3Interop.js
window.d3Interop = (function () {
    // Resolve once D3 exists (helps with prerender timing)
    function waitForD3(timeoutMs, intervalMs) {
        timeoutMs = typeof timeoutMs === "number" ? timeoutMs : 3000;
        intervalMs = typeof intervalMs === "number" ? intervalMs : 25;
        return new Promise(function (resolve) {
            if (window.d3) return resolve(true);
            var waited = 0;
            var id = setInterval(function () {
                if (window.d3) { clearInterval(id); resolve(true); }
                else if ((waited += intervalMs) >= timeoutMs) { clearInterval(id); resolve(false); }
            }, intervalMs);
        });
    }

    // ----- Tooltip (lazy) -----
    function getTip() {
        var tip = document.getElementById("d3-tip");
        if (!tip) {
            var body = document.body || document.getElementsByTagName("body")[0];
            if (!body) return null;
            tip = document.createElement("div");
            tip.id = "d3-tip";
            tip.style.position = "fixed";
            tip.style.pointerEvents = "none";
            tip.style.padding = "6px 8px";
            tip.style.borderRadius = "6px";
            tip.style.background = "rgba(0,0,0,.85)";
            tip.style.color = "#fff";
            tip.style.fontSize = "12px";
            tip.style.zIndex = 9999;
            tip.style.opacity = 0;
            tip.style.transition = "opacity .15s ease";
            body.appendChild(tip);
        }
        return tip;
    }
    function showTip(html, x, y) {
        var tip = getTip(); if (!tip) return;
        tip.innerHTML = html;
        tip.style.left = (x + 12) + "px";
        tip.style.top = (y + 12) + "px";
        tip.style.opacity = "1";
    }
    function hideTip() {
        var tip = document.getElementById("d3-tip");
        if (tip) tip.style.opacity = "0";
    }

    // ===== Vertical bar chart (year -> count) =====
    function renderBarChart(selector, data, options) {
        if (!window.d3) return { dispose: function () { } };

        var cfg = Object.assign({
            height: 420,
            margin: { top: 20, right: 20, bottom: 40, left: 50 },
            animate: true,
            color: "#5b8def"
        }, options || {});

        var root = d3.select(selector);
        var container = root.node();
        if (!container) return { dispose: function () { } };
        root.selectAll("*").remove();

        var width = container.getBoundingClientRect().width || 800;
        var height = cfg.height;
        var margin = cfg.margin;
        var color = cfg.color;

        var innerW = Math.max(0, width - margin.left - margin.right);
        var innerH = Math.max(0, height - margin.top - margin.bottom);

        var svg = root.append("svg").attr("width", width).attr("height", height);
        var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var xBand = d3.scaleBand()
            .domain(data.map(function (d) { return String(d.year); }))
            .range([0, innerW])
            .padding(0.15);

        var maxY = d3.max(data, function (d) { return d.count; }) || 0;
        var yLin = d3.scaleLinear()
            .domain([0, Math.max(1, maxY)])
            .nice()
            .range([innerH, 0]);

        // grid
        g.append("g").attr("class", "grid")
            .call(d3.axisLeft(yLin).ticks(5).tickSize(-innerW).tickFormat(""))
            .selectAll("line").attr("stroke", "#eee");

        g.append("g").attr("transform", "translate(0," + innerH + ")").call(d3.axisBottom(xBand));
        g.append("g").call(d3.axisLeft(yLin).ticks(5));

        var bars = g.selectAll(".d3-bar").data(data, function (d) { return d.year; });
        var enter = bars.enter().append("rect")
            .attr("class", "d3-bar")
            .attr("x", function (d) { return xBand(String(d.year)); })
            .attr("y", innerH)
            .attr("width", xBand.bandwidth())
            .attr("height", 0)
            .style("fill", color)       // force visible fill even if global CSS sets rect{fill:none}
            .attr("stroke", "none")
            .on("mousemove", function (ev, d) { showTip(d.year + ": <b>" + d.count + "</b>", ev.clientX, ev.clientY); })
            .on("mouseleave", hideTip);

        var upd = enter.merge(bars);
        if (cfg.animate) {
            upd.transition().duration(600)
                .attr("y", function (d) { return yLin(d.count); })
                .attr("height", function (d) { return innerH - yLin(d.count); });
        } else {
            upd.attr("y", function (d) { return yLin(d.count); })
                .attr("height", function (d) { return innerH - yLin(d.count); });
        }

        var ro = new ResizeObserver(function () { renderBarChart(selector, data, options); });
        ro.observe(container);
        return { dispose: function () { ro.disconnect(); root.selectAll("*").remove(); } };
    }

    // ===== Horizontal bar chart (org -> count) =====
    function renderHorizontalBarChart(selector, data, options) {
        if (!window.d3) return { dispose: function () { } };

        var cfg = Object.assign({
            barHeight: 28,
            margin: { top: 10, right: 20, bottom: 30, left: 120 },
            animate: true,
            sort: "countDesc" // "countAsc" | "labelAsc" | "labelDesc"
        }, options || {});

        var root = d3.select(selector);
        var container = root.node();
        if (!container) return { dispose: function () { } };

        var d = data.slice();
        if (cfg.sort === "countAsc") d.sort(function (a, b) { return d3.ascending(a.count, b.count); });
        else if (cfg.sort === "labelAsc") d.sort(function (a, b) { return d3.ascending(a.org, b.org); });
        else if (cfg.sort === "labelDesc") d.sort(function (a, b) { return d3.descending(a.org, b.org); });
        else d.sort(function (a, b) { return d3.descending(a.count, b.count); });

        root.selectAll("*").remove();

        var width = container.getBoundingClientRect().width || 800;
        var height = cfg.margin.top + cfg.margin.bottom + cfg.barHeight * d.length;

        var svg = root.append("svg").attr("width", width).attr("height", height);
        var innerW = Math.max(0, width - cfg.margin.left - cfg.margin.right);
        var innerH = Math.max(0, height - cfg.margin.top - cfg.margin.bottom);
        var g = svg.append("g").attr("transform", "translate(" + cfg.margin.left + "," + cfg.margin.top + ")");

        var yBand = d3.scaleBand()
            .domain(d.map(function (x) { return x.org; }))
            .range([0, innerH])
            .padding(0.15);

        var maxX = d3.max(d, function (x) { return x.count; }) || 0;
        var xLin = d3.scaleLinear()
            .domain([0, Math.max(1, maxX)])
            .nice()
            .range([0, innerW]);

        // grid
        g.append("g").attr("class", "grid")
            .call(d3.axisTop(xLin).ticks(5).tickSize(-innerH).tickFormat(""))
            .selectAll("line").attr("stroke", "#eee");

        g.append("g").call(d3.axisLeft(yBand));
        g.append("g").call(d3.axisTop(xLin).ticks(5));

        var color = d3.scaleLinear().domain([0, maxX]).range(["#a6b6ff", "#425fe6"]);

        var bars = g.selectAll(".d3-hbar").data(d, function (x) { return x.org; });
        var enter = bars.enter().append("rect")
            .attr("class", "d3-hbar")
            .attr("x", 0)
            .attr("y", function (x) { return yBand(x.org); })
            .attr("height", yBand.bandwidth())
            .attr("width", 0)
            .style("fill", function (x) { return color(x.count); })
            .attr("stroke", "none")
            .on("mousemove", function (ev, x) { showTip(x.org + ": <b>" + x.count + "</b>", ev.clientX, ev.clientY); })
            .on("mouseleave", hideTip);

        var upd = enter.merge(bars);
        if (cfg.animate) {
            upd.transition().duration(600)
                .attr("width", function (d) { return xLin(d.count); });
        } else {
            upd.attr("width", function (d) { return xLin(d.count); });
        }

        var ro = new ResizeObserver(function () { renderHorizontalBarChart(selector, data, options); });
        ro.observe(container);
        return { dispose: function () { ro.disconnect(); root.selectAll("*").remove(); } };
    }

    return {
        waitForD3: waitForD3,
        renderBarChart: renderBarChart,
        renderHorizontalBarChart: renderHorizontalBarChart
    };
})();
