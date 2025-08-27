/* wwwroot/js/d3Interop.js */
(function () {
    "use strict";

    if (!window.d3Interop) window.d3Interop = {};
    var DEBUG = false;   // set to true from console via: d3Interop.debug(true)

    function debug() { if (DEBUG && window.console) console.log.apply(console, arguments); }
    window.d3Interop.debug = function (on) { DEBUG = !!on; };

    // ---------- D3 ready ----------
    function waitForD3(timeoutMs, intervalMs) {
        timeoutMs = typeof timeoutMs === "number" ? timeoutMs : 4000;
        intervalMs = typeof intervalMs === "number" ? intervalMs : 25;
        return new Promise(function (resolve) {
            if (window.d3) return resolve(true);
            var waited = 0, id = setInterval(function () {
                if (window.d3) { clearInterval(id); resolve(true); }
                else if ((waited += intervalMs) >= timeoutMs) { clearInterval(id); resolve(false); }
            }, intervalMs);
        });
    }

    // ---------- Tooltip ----------
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
    function hideTip() { var tip = document.getElementById("d3-tip"); if (tip) tip.style.opacity = "0"; }

    // ---------- Normalizers (handles Count/Year, count/year) ----------
    function normYearCounts(arr) {
        arr = arr || [];
        return arr.map(function (d) {
            d = d || {};
            var y = d.year != null ? d.year : d.Year;
            var c = d.count != null ? d.count : d.Count;
            return { year: Number(y || 0), count: Number(c || 0) };
        });
    }
    function normOrgCounts(arr) {
        arr = arr || [];
        return arr.map(function (d) {
            d = d || {};
            var o = d.org != null ? d.org : d.Org;
            var c = d.count != null ? d.count : d.Count;
            return { org: String(o != null ? o : "(Unspecified)"), count: Number(c || 0) };
        });
    }

    // ---------- Helpers ----------
    function extend(t, s) { for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; return t; }
    function makeResizeObserver(el, fn) {
        if (typeof ResizeObserver !== "undefined") {
            var ro = new ResizeObserver(function () { fn(); });
            ro.observe(el); return ro;
        } else {
            var h = debounce(fn, 150);
            window.addEventListener("resize", h); return h;
        }
    }
    function debounce(fn, ms) { var t; return function () { clearTimeout(t); var a = arguments, s = this; t = setTimeout(function () { fn.apply(s, a); }, ms); }; }

    // ---------- Vertical bar chart ----------
    function renderBarChart(selector, rawData, options) {
        if (!window.d3) return { dispose: function () { } };
        var data = normYearCounts(rawData);
        debug("[renderBarChart] data:", data);

        var cfg = extend({
            height: 420,
            margin: { top: 20, right: 20, bottom: 40, left: 50 },
            animate: true,
            color: "#5b8def"
        }, options || {});

        var root = d3.select(selector), container = root.node();
        if (!container) return { dispose: function () { } };
        root.selectAll("*").remove();

        var width = container.getBoundingClientRect().width || 800;
        var height = cfg.height, m = cfg.margin;
        var innerW = Math.max(0, width - m.left - m.right);
        var innerH = Math.max(0, height - m.top - m.bottom);

        var svg = root.append("svg").attr("width", width).attr("height", height);
        var g = svg.append("g").attr("transform", "translate(" + m.left + "," + m.top + ")");

        var cats = data.map(function (d) { return String(d.year); });
        var x = d3.scaleBand().domain(cats).range([0, innerW]).padding(0.15);
        var maxY = d3.max(data, function (d) { return d.count; }) || 0;
        var y = d3.scaleLinear().domain([0, Math.max(1, maxY)]).nice().range([innerH, 0]);

        g.append("g").attr("class", "grid")
            .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
            .selectAll("line").attr("stroke", "#eee");

        g.append("g").attr("transform", "translate(0," + innerH + ")").call(d3.axisBottom(x));
        g.append("g").call(d3.axisLeft(y).ticks(5));

        // Join pattern: attributes always set
        var bars = g.selectAll("rect.d3-bar")
            .data(data, function (d) { return d.year; })
            .join("rect")
            .attr("class", "d3-bar")
            .attr("x", function (d) { return x(String(d.year)) || 0; })
            .attr("width", x.bandwidth())
            .attr("fill", cfg.color)
            .attr("stroke", "none");

        if (cfg.animate) {
            bars
                .attr("y", innerH)
                .attr("height", 0)
                .transition().duration(600)
                .attr("y", function (d) { return y(d.count); })
                .attr("height", function (d) { return Math.max(0, innerH - y(d.count)); });
        } else {
            bars
                .attr("y", function (d) { return y(d.count); })
                .attr("height", function (d) { return Math.max(0, innerH - y(d.count)); });
        }

        bars
            .on("mousemove", function (ev, d) { showTip(d.year + ": <b>" + d.count + "</b>", ev.clientX, ev.clientY); })
            .on("mouseleave", hideTip);

        var ro = makeResizeObserver(container, function () { renderBarChart(selector, data, options); });
        return { dispose: function () { if (ro.disconnect) ro.disconnect(); else window.removeEventListener("resize", ro); root.selectAll("*").remove(); } };
    }

    // ---------- Horizontal bar chart ----------
    function renderHorizontalBarChart(selector, rawData, options) {
        if (!window.d3) return { dispose: function () { } };
        var cfg = extend({
            barHeight: 28,
            margin: { top: 10, right: 20, bottom: 30, left: 120 },
            animate: true,
            sort: "countDesc"
        }, options || {});

        var d = normOrgCounts(rawData).slice();
        debug("[renderHorizontalBarChart] data:", d);

        if (cfg.sort === "countAsc") d.sort(function (a, b) { return d3.ascending(a.count, b.count); });
        else if (cfg.sort === "labelAsc") d.sort(function (a, b) { return d3.ascending(a.org, b.org); });
        else if (cfg.sort === "labelDesc") d.sort(function (a, b) { return d3.descending(a.org, b.org); });
        else d.sort(function (a, b) { return d3.descending(a.count, b.count); });

        var root = d3.select(selector), container = root.node();
        if (!container) return { dispose: function () { } };
        root.selectAll("*").remove();

        var width = container.getBoundingClientRect().width || 800;
        var height = cfg.margin.top + cfg.margin.bottom + cfg.barHeight * d.length;

        var svg = root.append("svg").attr("width", width).attr("height", height);
        var innerW = Math.max(0, width - cfg.margin.left - cfg.margin.right);
        var innerH = Math.max(0, height - cfg.margin.top - cfg.margin.bottom);
        var g = svg.append("g").attr("transform", "translate(" + cfg.margin.left + "," + cfg.margin.top + ")");

        var yBand = d3.scaleBand().domain(d.map(function (x) { return x.org; })).range([0, innerH]).padding(0.15);
        var maxX = d3.max(d, function (x) { return x.count; }) || 0;
        var xLin = d3.scaleLinear().domain([0, Math.max(1, maxX)]).nice().range([0, innerW]);

        g.append("g").attr("class", "grid")
            .call(d3.axisTop(xLin).ticks(5).tickSize(-innerH).tickFormat(""))
            .selectAll("line").attr("stroke", "#eee");

        g.append("g").call(d3.axisLeft(yBand));
        g.append("g").call(d3.axisTop(xLin).ticks(5));

        var color = d3.scaleLinear().domain([0, maxX]).range(["#a6b6ff", "#425fe6"]);

        var bars = g.selectAll("rect.d3-hbar")
            .data(d, function (x) { return x.org; })
            .join("rect")
            .attr("class", "d3-hbar")
            .attr("x", 0)
            .attr("y", function (x) { return yBand(x.org) || 0; })
            .attr("height", yBand.bandwidth())
            .attr("fill", function (x) { return color(x.count); })
            .attr("stroke", "none");

        if (cfg.animate) {
            bars
                .attr("width", 0)
                .transition().duration(600)
                .attr("width", function (d) { return xLin(d.count); });
        } else {
            bars.attr("width", function (d) { return xLin(d.count); });
        }

        bars
            .on("mousemove", function (ev, x) { showTip(x.org + ": <b>" + x.count + "</b>", ev.clientX, ev.clientY); })
            .on("mouseleave", hideTip);

        var ro = makeResizeObserver(container, function () { renderHorizontalBarChart(selector, d, options); });
        return { dispose: function () { if (ro.disconnect) ro.disconnect(); else window.removeEventListener("resize", ro); root.selectAll("*").remove(); } };
    }

    // Export
    window.d3Interop.waitForD3 = waitForD3;
    window.d3Interop.renderBarChart = renderBarChart;
    window.d3Interop.renderHorizontalBarChart = renderHorizontalBarChart;
})();
