/* Atlas: deterministic synthetic telemetry and pure analytical selectors. No network or personal data. */
(function (root) {
  "use strict";
  const services = Object.freeze([
    {
      id: "gateway",
      name: "API Gateway",
      owner: "Edge engineering",
      kind: "Entry point",
      short: "API",
      x: 14,
      y: 48,
      description:
        "Routes application requests through identity checks and into the data platform.",
    },
    {
      id: "data",
      name: "Data Platform",
      owner: "Data engineering",
      kind: "Processing",
      short: "DP",
      x: 48,
      y: 22,
      description:
        "Transforms operational events into consistent analytical data products.",
    },
    {
      id: "identity",
      name: "Identity",
      owner: "Platform engineering",
      kind: "Access",
      short: "ID",
      x: 48,
      y: 68,
      description:
        "Validates service identities and evaluates application access policies.",
    },
    {
      id: "storage",
      name: "Storage",
      owner: "Infrastructure",
      kind: "Persistence",
      short: "ST",
      x: 83,
      y: 42,
      description:
        "Provides the shared persistence layer used by data processing and identity.",
    },
    {
      id: "observe",
      name: "Observability",
      owner: "Reliability engineering",
      kind: "Telemetry",
      short: "OB",
      x: 83,
      y: 84,
      description:
        "Receives asynchronous telemetry. It is outside the synchronous request path.",
    },
  ]);
  // Directed edges mean caller → dependency. Weight is the modeled share of caller latency exposed to that dependency.
  const edges = Object.freeze([
    { from: "gateway", to: "data", weight: 0.65 },
    { from: "gateway", to: "identity", weight: 0.35 },
    { from: "data", to: "storage", weight: 0.8 },
    { from: "identity", to: "storage", weight: 0.5 },
    { from: "data", to: "observe", weight: 0, async: true },
    { from: "storage", to: "observe", weight: 0, async: true },
  ]);
  const end = Date.UTC(2026, 9, 14),
    dayMs = 86400000,
    slo = 99.9;
  const data = Object.freeze(
    Array.from({ length: 180 }, (_, day) =>
      services.map((s, i) => {
        const date = new Date(end - (179 - day) * dayMs)
          .toISOString()
          .slice(0, 10);
        const weekday = new Date(date + "T00:00:00Z").getUTCDay();
        const cycle = Math.sin(day * 0.41 + i * 1.7);
        const requests = Math.round(
          [94000, 71000, 58000, 43000, 34000][i] *
            (1 + day * 0.0014) *
            (weekday === 0 || weekday === 6 ? 0.72 : 1) *
            (1 + cycle * 0.075),
        );
        const incident =
          day >= 172 && day <= 174 ? [0.55, 1, 0.35][day - 172] : 0;
        const exposure = [0.695, 0.8, 0.5, 1, 0][i];
        const latency = Math.round(
          [142, 116, 78, 61, 43][i] + cycle * 8 + incident * exposure * 210,
        );
        const errors = Math.max(
          1,
          Math.round(
            requests *
              ([0.00037, 0.0003, 0.00022, 0.00042, 0.00016][i] +
                Math.abs(cycle) * 0.00015 +
                incident * [0.003, 0.004, 0.0014, 0.011, 0][i]),
          ),
        );
        return Object.freeze({
          day,
          date,
          id: s.id,
          name: s.name,
          requests,
          errors,
          latency,
          deployments:
            weekday > 0 && weekday < 6 && (day + i) % 3 === 0
              ? 1 + (day % 2)
              : 0,
        });
      }),
    ).flat(),
  );
  const serviceById = (id) => services.find((s) => s.id === id);
  const dateForDay = (day) =>
    new Date(end - (179 - day) * dayMs).toISOString().slice(0, 10);
  function parse(search) {
    const p = new URLSearchParams(search),
      service = p.get("service");
    const days = [7, 30, 90].includes(Number(p.get("days")))
      ? Number(p.get("days"))
      : 30;
    const date = p.get("date");
    return {
      service: services.some((s) => s.name === service) ? service : "all",
      days,
      metric: ["requests", "latency", "errors"].includes(p.get("metric"))
        ? p.get("metric")
        : "requests",
      sort: ["requests", "success", "name", "latency"].includes(p.get("sort"))
        ? p.get("sort")
        : "requests",
      date: data.some((r) => r.day >= 180 - days && r.date === date)
        ? date
        : "",
      focus: serviceById(p.get("focus"))
        ? p.get("focus")
        : services.find((s) => s.name === service)?.id || "storage",
      delta: Number.isFinite(Number(p.get("delta")))
        ? Math.min(
            300,
            Math.max(0, Math.round(Number(p.get("delta")) / 25) * 25),
          )
        : 0,
    };
  }
  function select(state, options = {}) {
    const shift = options.previous ? state.days : 0;
    return data.filter(
      (r) =>
        r.day >= 180 - state.days - shift &&
        r.day < 180 - shift &&
        (options.allServices ||
          state.service === "all" ||
          r.name === state.service) &&
        (options.ignoreDate ||
          !state.date ||
          r.date ===
            (options.previous
              ? new Date(Date.parse(state.date) - state.days * dayMs)
                  .toISOString()
                  .slice(0, 10)
              : state.date)),
    );
  }
  function summarize(rows) {
    let requests = 0,
      errors = 0,
      latencySum = 0,
      deployments = 0;
    for (const r of rows) {
      requests += r.requests;
      errors += r.errors;
      latencySum += r.latency * r.requests;
      deployments += r.deployments;
    }
    return {
      requests,
      errors,
      success: requests ? (1 - errors / requests) * 100 : 0,
      latency: requests ? latencySum / requests : 0,
      deployments,
      budget: requests ? (errors / (requests * (1 - slo / 100))) * 100 : 0,
    };
  }
  function daily(rows) {
    const dates = new Map();
    for (const r of rows) {
      if (!dates.has(r.date)) dates.set(r.date, []);
      dates.get(r.date).push(r);
    }
    return [...dates].map(([date, records]) => ({
      date,
      ...summarize(records),
    }));
  }
  function groups(rows) {
    return services.map((s) => ({
      ...s,
      ...summarize(rows.filter((r) => r.id === s.id)),
    }));
  }
  function influence(rootId) {
    const cache = new Map();
    function visit(id, seen = new Set()) {
      if (id === rootId) return 1;
      if (cache.has(id)) return cache.get(id);
      if (seen.has(id)) return 0;
      const next = new Set(seen).add(id);
      const value = Math.min(
        1,
        edges
          .filter((e) => e.from === id)
          .reduce((sum, e) => sum + e.weight * visit(e.to, next), 0),
      );
      cache.set(id, value);
      return value;
    }
    return Object.fromEntries(services.map((s) => [s.id, visit(s.id)]));
  }
  function model(rootId, delta, rows) {
    const weights = influence(rootId),
      grouped = groups(rows),
      total = summarize(rows);
    const added = grouped.reduce(
      (sum, s) => sum + s.requests * weights[s.id] * delta,
      0,
    );
    return {
      weights,
      added: total.requests ? added / total.requests : 0,
      affected: services
        .filter((s) => s.id !== rootId && weights[s.id] > 0)
        .map((s) => s.id),
    };
  }
  const api = Object.freeze({
    services,
    edges,
    data,
    slo,
    endDate: "2026-10-14",
    incidentDate: "2026-10-08",
    serviceById,
    dateForDay,
    parse,
    select,
    summarize,
    daily,
    groups,
    influence,
    model,
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AtlasEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
