/* Coordinated reliability exploration, inspectable event lineage, and native command menu. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    J = window.JourneyEngine,
    E = window.AtlasEngine;
  if (!$("#journey")) return;
  if (!J || !E) {
    $("#journey-error").hidden = false;
    return;
  }
  try {
    const money = (cents) =>
      (cents / 100).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      });
    const dateLabel = (date) =>
      new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    const initial = J.parse(location.search);
    let result = J.run(initial.key),
      stage = initial.stage,
      selected = initial.selected,
      timer = null,
      replaying = false;
    const reduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function stop() {
      clearTimeout(timer);
      timer = null;
      replaying = false;
    }
    function payload(record) {
      if (stage === 0) return record.event;
      if (record.status === "quarantined")
        return {
          eventId: record.event.id,
          status: "quarantined",
          errors: record.reasons,
        };
      if (stage >= 2 && record.status === "duplicate")
        return {
          eventId: record.event.id,
          status: "skipped",
          reason: "Event ID already accepted; no additional order is written.",
        };
      if (stage === 1)
        return {
          eventId: record.event.id,
          contract: "valid",
          currency: "USD",
          totalCents: record.event.totalCents,
        };
      if (stage === 2)
        return {
          eventId: record.event.id,
          write: "accepted",
          idempotencyKey: record.event.id,
        };
      if (stage === 3) return record.output;
      return {
        eventId: record.event.id,
        contribution: money(record.event.totalCents),
        measure: "recognized_order_value",
        provenance: "synthetic",
      };
    }
    function renderJourney() {
      const p = new URLSearchParams(location.search);
      p.set("journey", result.key);
      p.set("stage", stage);
      p.set("event", selected);
      history.replaceState(
        null,
        "",
        location.pathname + "?" + p + location.hash,
      );
      $("#journey-scenario").value = result.key;
      document.querySelectorAll('[data-compare-scenario]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.compareScenario===result.key)));
      const focusedStage = document.activeElement?.dataset.journeyStage;
      const record = result.records[selected],
        current = J.stages[stage];
      $("#journey-scenario-note").textContent = J.scenarios[result.key].note;
      $("#journey-canvas").dataset.replaying = String(replaying);
      const counts = [
        result.received,
        result.valid,
        result.accepted,
        result.accepted,
        result.accepted,
      ];
      $("#journey-stages").innerHTML = J.stages
        .map(
          (s, i) =>
            `<button type="button" class="journey-node" data-journey-stage="${i}" aria-pressed="${i === stage}" data-reached="${i <= stage}"><span class="journey-node-top"><span>0${i + 1}</span><span aria-hidden="true">${i < stage ? "✓" : i === stage ? "◉" : "○"}</span></span><strong>${s.name}</strong><span class="journey-node-count">${counts[i]} <small>${i === 0 ? "deliveries" : i === 4 ? "orders" : "events"}</small></span><span class="journey-node-kind">${s.kind}</span></button>`,
        )
        .join("");
      $("#journey-reconciliation").innerHTML =
        `<span><strong>${result.received}</strong> received</span><span aria-hidden="true">=</span><span><strong>${result.accepted}</strong> accepted</span><span aria-hidden="true">+</span><span data-alert="${!!result.quarantine}"><strong>${result.quarantine}</strong> quarantined</span><span aria-hidden="true">+</span><span data-alert="${!!result.duplicate}"><strong>${result.duplicate}</strong> duplicates skipped</span>`;
      $("#journey-kind").textContent =
        `0${stage + 1} / ${current.kind.toUpperCase()}`;
      const excluded =
        (stage >= 1 && record.status === "quarantined") ||
        (stage >= 2 && record.status === "duplicate");
      $("#journey-stage-title").textContent =
        (excluded ? "Excluded" : current.name) + " · " + record.event.id;
      $("#journey-description").textContent = excluded
        ? record.status === "quarantined"
          ? "Stopped at validation. This delivery contributes nothing to the published measures."
          : "Skipped at deduplication. The original order is already represented; this retry contributes no additional value."
        : current.description;
      $("#journey-code-caption").textContent =
        `DELIVERY ${String(selected + 1).padStart(2, "0")} / ${stage === 0 ? "SOURCE JSON" : stage === 4 ? "MEASURE LINEAGE" : "PROCESSING RESULT"}`;
      $("#journey-code").textContent = JSON.stringify(payload(record), null, 2);
      $("#journey-progress").textContent =
        `${stage + 1} of 5${replaying ? " · Replaying" : ""}`;
      $("#journey-prev").disabled = stage === 0;
      $("#journey-next").disabled = stage === 4;
      $("#journey-replay").innerHTML = replaying
        ? "Pause replay Ⅱ"
        : "Replay flow ↻";
      $("#product-status").textContent = "Calculated preview";
      $("#journey-total").textContent = money(result.totalCents);
      $("#journey-orders").textContent = result.accepted;
      $("#journey-average").textContent = money(result.averageCents);
      const max = Math.max(
        ...result.records
          .filter((r) => r.status === "accepted")
          .map((r) => r.event.totalCents),
      );
      $("#journey-contributions").innerHTML = result.records
        .filter((r) => r.status === "accepted")
        .map(
          (r) =>
            `<button class="contribution-bar" data-event="${r.index}" aria-label="Inspect ${r.event.id}, ${money(r.event.totalCents)}" aria-pressed="${r.index === selected}" style="--value:${Math.round((r.event.totalCents / max) * 100)}%"><span aria-hidden="true"></span></button>`,
        )
        .join("");
      $("#journey-product-note").textContent =
        `${result.accepted} accepted orders · ${result.quarantine} quarantined · ${result.duplicate} duplicates excluded. Select a bar to trace its contribution.`;
      $("#journey-ledger").innerHTML = result.records
        .map(
          (r) =>
            `<button class="ledger-event" data-event="${r.index}" data-status="${r.status}" aria-pressed="${r.index === selected}" aria-label="Delivery ${r.index + 1}, ${r.event.id}, ${r.status}"><span class="ledger-index">${String(r.index + 1).padStart(2, "0")}</span><strong>${r.event.id}</strong><span class="ledger-outcome">${r.status === "accepted" ? "✓ Accepted" : r.status === "duplicate" ? "↻ Duplicate" : "! Quarantined"}</span></button>`,
        )
        .join("");
      if (focusedStage !== undefined)
        $(`[data-journey-stage="${focusedStage}"]`)?.focus({
          preventScroll: true,
        });
    }
    $("#journey-scenario").addEventListener("change", (e) => {
      stop();
      result = J.run(e.target.value);
      stage = 4;
      selected = 0;
      renderJourney();
    });
    $("#journey-replay").addEventListener("click", () => {
      if (replaying) {
        stop();
        renderJourney();
        return;
      }
      stop();
      stage = 0;
      replaying = !reduced();
      renderJourney();
      if (reduced()) {
        stage = 4;
        renderJourney();
        return;
      }
      function advance() {
        stage++;
        if (stage === 4) replaying = false;
        renderJourney();
        if (stage < 4) timer = setTimeout(advance, 850);
      }
      timer = setTimeout(advance, 850);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && replaying) {
        stop();
        renderJourney();
      }
    });
    window
      .matchMedia("(prefers-reduced-motion: reduce)")
      .addEventListener?.("change", () => {
        if (replaying) {
          stop();
          renderJourney();
        }
      });
    $("#journey-prev").addEventListener("click", () => {
      stop();
      stage = Math.max(0, stage - 1);
      renderJourney();
    });
    $("#journey-next").addEventListener("click", () => {
      stop();
      stage = Math.min(4, stage + 1);
      renderJourney();
    });
    $("#journey").addEventListener("click", (e) => {
      const node = e.target.closest("[data-journey-stage]"),
        event = e.target.closest("[data-event]");
      if (node) {
        stop();
        stage = Number(node.dataset.journeyStage);
        renderJourney();
      }
      if (event) {
        stop();
        selected = Number(event.dataset.event);
        const ledger = !!event.closest("#journey-ledger");
        renderJourney();
        $(
          ledger
            ? `#journey-ledger [data-event="${selected}"]`
            : `#journey-contributions [data-event="${selected}"]`,
        )?.focus({ preventScroll: true });
      }
    });
    function selectWorkspace(id, date) {
      window.dispatchEvent(
        new CustomEvent("atlas:select", { detail: { id, date } }),
      );
    }
    let matrixData,
      matrixIndex = 0;
    function renderMatrix() {
      const focused = document.activeElement?.dataset.cell;
      const state = E.parse(location.search);
      matrixData = J.matrix(
        E.select(state, { allServices: true, ignoreDate: true }),
      );
      const { dates, cells } = matrixData;
      matrixIndex = Math.min(matrixIndex, cells.length - 1);
      $("#matrix-scope").textContent =
        `LAST ${dates.length} DAYS OF ${state.days}-DAY WINDOW`;
      $("#reliability-matrix").style.setProperty("--days", dates.length);
      const header = `<div class="matrix-row matrix-dates"><span>Success / 99.9% target</span>${dates.map((d, i) => `<span>${i === 0 ? dateLabel(d) : Number(d.slice(8))}</span>`).join("")}</div>`;
      const rows = E.services
        .map(
          (s, row) =>
            `<div class="matrix-row"><button class="matrix-service" data-matrix-service="${s.id}">${s.name}</button>${dates
              .map((d, col) => {
                const cell = cells.find((r) => r.id === s.id && r.date === d),
                  index = row * dates.length + col,
                  level = cell.budget >= 5 ? 2 : cell.budget > 1 ? 1 : 0;
                return `<button class="matrix-cell" data-cell="${index}" data-level="${level}" data-selected="${state.service === s.name && state.date === d}" tabindex="${index === Math.min(matrixIndex, cells.length - 1) ? 0 : -1}" aria-pressed="${state.service === s.name && state.date === d}" aria-label="${s.name}, ${dateLabel(d)}, ${cell.success.toFixed(3)}% success, ${cell.errors} failed requests"><span aria-hidden="true">${level === 2 ? "!" : level === 1 ? "·" : ""}</span></button>`;
              })
              .join("")}</div>`,
        )
        .join("");
      $("#reliability-matrix").innerHTML = header + rows;
      if (focused !== undefined)
        $(`[data-cell="${focused}"]`)?.focus({ preventScroll: true });
    }
    function getCell(index) {
      const dates = matrixData.dates;
      return matrixData.cells.find(
        (r) =>
          r.id === E.services[Math.floor(index / dates.length)].id &&
          r.date === dates[index % dates.length],
      );
    }
    function readCell(index) {
      const cell = getCell(index);
      $("#matrix-readout").textContent =
        `${cell.name} · ${dateLabel(cell.date)} · ${cell.success.toFixed(3)}% success · ${cell.errors} failed / ${cell.requests.toLocaleString("en-US")} requests`;
    }
    $("#reliability-matrix").addEventListener("focusin", (e) => {
      if (e.target.dataset.cell !== undefined) {
        matrixIndex = Number(e.target.dataset.cell);
        readCell(matrixIndex);
      }
    });
    $("#reliability-matrix").addEventListener("pointerover", (e) => {
      const cell = e.target.closest("[data-cell]");
      if (cell) readCell(Number(cell.dataset.cell));
    });
    $("#reliability-matrix").addEventListener("click", (e) => {
      const cell = e.target.closest("[data-cell]"),
        service = e.target.closest("[data-matrix-service]");
      if (cell) {
        matrixIndex = Number(cell.dataset.cell);
        const r = getCell(matrixIndex);
        selectWorkspace(r.id, r.date);
        readCell(matrixIndex);
      }
      if (service) selectWorkspace(service.dataset.matrixService, "");
    });
    $("#reliability-matrix").addEventListener("keydown", (e) => {
      if (e.target.dataset.cell === undefined) return;
      const columns = matrixData.dates.length,
        old = Number(e.target.dataset.cell);
      const movements = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -columns,
        ArrowDown: columns,
      };
      if (!(e.key in movements) && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      matrixIndex =
        e.key === "Home"
          ? Math.floor(old / columns) * columns
          : e.key === "End"
            ? Math.floor(old / columns) * columns + columns - 1
            : Math.max(0, Math.min(columns * 5 - 1, old + movements[e.key]));
      $("#reliability-matrix")
        .querySelectorAll("[data-cell]")
        .forEach(
          (b) => (b.tabIndex = Number(b.dataset.cell) === matrixIndex ? 0 : -1),
        );
      $(`[data-cell="${matrixIndex}"]`).focus();
    });
    window.addEventListener("atlas:render", renderMatrix);
    window.addEventListener("atlas:reset", () => {
      stop();
      result = J.run("clean");
      stage = 4;
      selected = 0;
      renderJourney();
    });
    window.addEventListener("popstate", () => {
      const view = J.parse(location.search);
      stop();
      result = J.run(view.key);
      stage = view.stage;
      selected = view.selected;
      renderJourney();
    });
    const commands = [
      {
        name: "Data journey",
        description: "Follow events into trusted measures",
        section: "journey",
      },
      {
        name: "Overview",
        description: "Explore performance over time",
        section: "overview",
      },
      {
        name: "Reliability heatmap",
        description: "Find the service and day behind a signal",
        section: "reliability",
      },
      {
        name: "Dependency lens",
        description: "Model how a slowdown travels",
        section: "dependencies",
      },
      {
        name: "Service explorer",
        description: "Search, compare and inspect services",
        section: "explorer",
      },
      ...E.services.map((s) => ({
        name: s.name,
        description: "Focus this service",
        id: s.id,
        section: "dependencies",
      })),
      {
        name: "Investigate incident",
        description: "October 8 synthetic storage slowdown",
        action: "investigate",
      },
      {
        name: "Reset workspace",
        description: "Clear analytical filters",
        action: "reset-filters",
      },
    ];
    let commandOpener = null,
      matched = [];
    const dialog = $("#command-dialog");
    function renderCommands() {
      const q = $("#command-search").value.trim().toLowerCase();
      matched = commands.filter((c) =>
        (c.name + " " + c.description).toLowerCase().includes(q),
      );
      $("#command-results").innerHTML = matched.length
        ? matched
            .map(
              (c, i) =>
                `<button class="command-result" data-command="${i}"><span><strong>${c.name}</strong><small>${c.description}</small></span><span aria-hidden="true">↵</span></button>`,
            )
            .join("")
        : '<p class="command-empty">No matching destinations. Try “data”, “Storage” or “reset”.</p>';
    }
    function closeCommand() {
      dialog.close();
      commandOpener?.focus?.({ preventScroll: true });
    }
    function openCommand() {
      if (dialog.open || $("#service-dialog").open) return;
      commandOpener = document.activeElement;
      $("#command-search").value = "";
      renderCommands();
      dialog.showModal();
      $("#command-search").focus();
    }
    $("#open-command").addEventListener("click", openCommand);
    $("#close-command").addEventListener("click", closeCommand);
    dialog.addEventListener("close", () =>
      commandOpener?.focus?.({ preventScroll: true }),
    );
    $("#command-search").addEventListener("input", renderCommands);
    $("#command-results").addEventListener("click", (e) => {
      const b = e.target.closest("[data-command]");
      if (!b) return;
      const c = matched[Number(b.dataset.command)];
      closeCommand();
      if (c.id) selectWorkspace(c.id, "");
      if (c.action) $("#" + c.action).click();
      if (c.section) {
        location.hash = c.section;
        const section = $("#" + c.section);
        section.scrollIntoView?.({ behavior: "auto" });
        const heading = section.querySelector("h1,h2");
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
    dialog.addEventListener("keydown", (e) => {
      const items = [...dialog.querySelectorAll("[data-command]")],
        index = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next =
          index < 0
            ? e.key === "ArrowDown"
              ? 0
              : items.length - 1
            : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
        items[next]?.focus();
      }
      if (
        e.key === "Enter" &&
        document.activeElement === $("#command-search")
      ) {
        e.preventDefault();
        items[0]?.click();
      }
    });
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.open) closeCommand();
        else openCommand();
      }
    });
    document.querySelectorAll(".experience-shortcuts a").forEach((a) =>
      a.addEventListener("click", () => {
        document
          .querySelectorAll(".workspace-nav a")
          .forEach((b) => b.removeAttribute("aria-current"));
      }),
    );
    const comparison = $("#scenario-comparisons");
    if(comparison){
      comparison.innerHTML=Object.entries(J.scenarios).map(([key,scenario])=>{
        const run=J.run(key);
        return `<button type="button" class="scenario-row" data-compare-scenario="${key}" aria-pressed="${key===result.key}"><span class="scenario-name">${scenario.name}<small>${run.accepted} accepted · ${run.quarantine} quarantined · ${run.duplicate} duplicates</small></span><span class="scenario-composition" aria-hidden="true"><i style="width:${run.accepted/run.received*100}%"></i><i style="width:${run.quarantine/run.received*100}%"></i><i style="width:${run.duplicate/run.received*100}%"></i></span><span class="scenario-value">${money(run.totalCents)}<small>recognized value ↗</small></span></button>`;
      }).join("");
      comparison.addEventListener('click',event=>{
        const button=event.target.closest('[data-compare-scenario]');if(!button)return;
        stop();result=J.run(button.dataset.compareScenario);
        const excluded=result.records.find(record=>record.status!=='accepted');
        selected=excluded?excluded.index:0;
        stage=excluded?(excluded.status==='duplicate'?2:1):4;
        renderJourney();$("#journey-stage-title").focus();
      });
    }
    renderJourney();
    renderMatrix();
  } catch (error) {
    $("#journey-error").hidden = false;
    console.error("Data journey initialization failed.", error);
  }
})();
