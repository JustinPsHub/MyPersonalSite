window.d3Interop = (function () {
    function renderBarChart(selector, data, options) {
        console.log("renderBarChart data:", data); // <-- should show an array with items
        const cfg = Object.assign({
            height: 420,
            margin: { top: 20, right: 20, bottom: 40, left: 50 },
            animate: true
        }, options || {});

        const root = d3.select(selector);
        root.selectAll("*").remove();

        const container = root.node();
        const width = container.getBoundingClientRect().width || 800;
        const { height, margin } = cfg;
        const innerW = Math.max(0, width - margin.left - margin.right);
        const innerH = Math.max(0, height - margin.top - margin.bottom);

        const svg = root.append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(data.map(d => String(d.year)))
            .range([0, innerW])
            .padding(0.15);

        const maxY = d3.max(data, d => d.count) ?? 0;
        const y = d3.scaleLinear()
            .domain([0, Math.max(1, maxY)]) // ensure non-zero domain
            .nice()
            .range([innerH, 0]);

        g.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x));
        g.append("g").call(d3.axisLeft(y).ticks(5));

        const bars = g.selectAll(".bar").data(data, d => d.year);
        const enter = bars.enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(String(d.year)))
            .attr("y", innerH)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("fill", "#6c8cff"); // <-- explicit color so bars are visible

        const upd = enter.merge(bars);

        if (cfg.animate) {
            upd.transition().duration(600)
                .attr("y", d => y(d.count))
                .attr("height", d => innerH - y(d.count));
        } else {
            upd.attr("y", d => y(d.count))
                .attr("height", d => innerH - y(d.count));
        }

        upd.append("title").text(d => `${d.year}: ${d.count}`);
    }

    return { renderBarChart };
})();
