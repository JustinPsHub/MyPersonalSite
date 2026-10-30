/* Pure, deterministic event processing. The UI and tests use this same pipeline. */
(function (root) {
  "use strict";
  const contract =
    typeof module !== "undefined" && module.exports
      ? require("./engine.js")
      : root.PortfolioEngine;
  const scenarios = Object.freeze({
    clean: {
      name: "Healthy delivery",
      note: "Every event satisfies the contract. Follow an order into the analytical model.",
    },
    drift: {
      name: "Schema drift",
      note: "Three deliveries per dated service batch violate the contract. Quarantine keeps invalid values out of the analytical model.",
    },
    retry: {
      name: "Delivery retries",
      note: "Two repeated deliveries per dated service batch share existing IDs. Idempotency prevents double counting.",
    },
  });
  const stages = Object.freeze([
    {
      name: "Receive",
      kind: "Immutable source",
      description:
        "Retain the original deliveries so every decision can be inspected and replayed.",
    },
    {
      name: "Validate",
      kind: "Contract boundary",
      description:
        "Check event identity, type, integer cents and currency before accepting a record.",
    },
    {
      name: "Deduplicate",
      kind: "Idempotent write",
      description:
        "Keep the first valid event for each ID. A repeated delivery never becomes a second order.",
    },
    {
      name: "Model",
      kind: "Semantic layer",
      description:
        "Normalize integer cents into dollars and calculate measures from accepted unique orders.",
    },
    {
      name: "Publish",
      kind: "Analytical product",
      description:
        "Expose a reconciled summary and trace every measure back to its contributing events.",
    },
  ]);
  function run(key = "clean") {
    if (!Object.hasOwn(scenarios, key)) key = "clean";
    const input = Array.from({ length: 12 }, (_, i) => ({
      id: "order-" + String(i + 1).padStart(3, "0"),
      type: "order.created",
      totalCents: [
        12900, 8450, 21000, 5600, 17300, 9900, 32000, 7450, 14200, 6800, 25800,
        11500,
      ][i],
      currency: "USD",
    }));
    if (key === "drift") {
      input[3].totalCents = "5600";
      input[7].currency = "EUR";
      input[10].totalCents = -25800;
    }
    if (key === "retry") {
      input[10] = { ...input[2] };
      input[11] = { ...input[5] };
    }
    const seen = new Set();
    const records = input.map((event, index) => {
      const validation = contract.processEvent(event);
      const duplicate = validation.ok && seen.has(event.id);
      if (validation.ok && !duplicate) seen.add(event.id);
      const status = !validation.ok
        ? "quarantined"
        : duplicate
          ? "duplicate"
          : "accepted";
      return Object.freeze({
        index,
        event: Object.freeze(event),
        status,
        reasons: Object.freeze(validation.errors),
        output: status === "accepted" ? Object.freeze(validation.output) : null,
      });
    });
    const accepted = records.filter((r) => r.status === "accepted");
    const totalCents = accepted.reduce((sum, r) => sum + r.event.totalCents, 0);
    const quarantine = records.filter((r) => r.status === "quarantined").length;
    const duplicate = records.filter((r) => r.status === "duplicate").length;
    return Object.freeze({
      key,
      records: Object.freeze(records),
      received: records.length,
      valid: records.length - quarantine,
      quarantine,
      duplicate,
      accepted: accepted.length,
      totalCents,
      averageCents: accepted.length ? totalCents / accepted.length : 0,
    });
  }

  // Each dated service batch is synthetic attribution, not service telemetry or real sales.
  const atlas = typeof module !== "undefined" && module.exports
    ? require("./atlas-engine.js") : root.AtlasEngine;
  const datasets = new Map();
  function summarize(records, key = "clean") {
    const accepted = records.filter(r => r.status === "accepted");
    const totalCents = accepted.reduce((sum, r) => sum + r.event.totalCents, 0);
    const quarantine = records.filter(r => r.status === "quarantined").length;
    const duplicate = records.filter(r => r.status === "duplicate").length;
    return Object.freeze({ key, records: Object.freeze(records), received: records.length,
      valid: records.length - quarantine, quarantine, duplicate, accepted: accepted.length,
      totalCents, averageCents: accepted.length ? totalCents / accepted.length : 0 });
  }
  function dataset(key) {
    if (!Object.hasOwn(scenarios, key)) key = "clean";
    if (datasets.has(key)) return datasets.get(key);
    const template = run(key), records = [];
    for (let offset = 0; offset < 90; offset++) {
      const date = atlas.dateForDay(179 - offset);
      atlas.services.forEach((service, serviceIndex) => {
        const seen = new Set();
        template.records.forEach((source, delivery) => {
          const amount = Math.round(Math.abs(Number(source.event.totalCents)) *
            (1 + serviceIndex * .13 + (offset % 13) * .017));
          const event = Object.freeze({ ...source.event,
            id: source.event.id.replace('order-', `order-${date.replaceAll('-', '')}-${service.id}-`),
            totalCents: typeof source.event.totalCents === 'string' ? String(amount)
              : source.event.totalCents < 0 ? -amount : amount });
          const validation = contract.processEvent(event);
          const duplicate = validation.ok && seen.has(event.id);
          if (validation.ok && !duplicate) seen.add(event.id);
          const status = !validation.ok ? 'quarantined' : duplicate ? 'duplicate' : 'accepted';
          records.push(Object.freeze({ index: records.length, date, offset, serviceId: service.id,
            serviceName: service.name, delivery, event, status,
            reasons: Object.freeze(validation.errors),
            output: status === 'accepted' ? Object.freeze(validation.output) : null }));
        });
      });
    }
    const result = Object.freeze(records); datasets.set(key, result); return result;
  }
  function select(key, state) {
    return summarize(dataset(key).filter(r => r.offset < state.days &&
      (state.service === 'all' || r.serviceName === state.service) &&
      (!state.date || r.date === state.date)), Object.hasOwn(scenarios, key) ? key : 'clean');
  }
  function product(result, stage, selectedIndex = null) {
    const scoped = selectedIndex === null ? result.records
      : result.records.filter(r => r.index === selectedIndex);
    const records = stage === 0 ? scoped : stage === 1
      ? scoped.filter(r => r.status !== 'quarantined')
      : scoped.filter(r => r.status === 'accepted');
    const totalCents = stage === 0 ? null : records.reduce((sum, r) => sum + r.event.totalCents, 0);
    return { records, totalCents, count: records.length,
      averageCents: totalCents === null ? null : records.length ? totalCents / records.length : 0,
      valueLabel: stage === 0 ? 'Order value pending validation' : stage === 1 ? 'Validated delivery value' : 'Recognized order value',
      countLabel: stage === 0 ? 'Received deliveries' : stage === 1 ? 'Valid deliveries' : 'Unique orders',
      averageLabel: stage < 2 ? 'Average delivery' : 'Average order' };
  }

  function matrix(rows, limit = 14) {
    const dates = [...new Set(rows.map((r) => r.date))].sort().slice(-limit);
    return {
      dates,
      cells: rows
        .filter((r) => dates.includes(r.date))
        .map((r) => ({
          ...r,
          success: (1 - r.errors / r.requests) * 100,
          budget: r.errors / (r.requests * 0.001),
        })),
    };
  }
  function parse(search) {
    const p = new URLSearchParams(search);
    const integer = (key, fallback, max) =>
      p.has(key) && Number.isInteger(Number(p.get(key)))
        ? Math.max(0, Math.min(max, Number(p.get(key))))
        : fallback;
    return {
      key: Object.hasOwn(scenarios, p.get("journey"))
        ? p.get("journey")
        : "clean",
      stage: integer("stage", 4, 4),
      selected: integer("event", 0, 5399),
    };
  }
  const api = Object.freeze({ scenarios, stages, run, summarize, select, product, matrix, parse });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.JourneyEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
