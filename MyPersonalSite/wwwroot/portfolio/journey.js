/* Coordinated order processing, reliability exploration, and native command menu. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), J = window.JourneyEngine, E = window.AtlasEngine;
  if (!$("#journey")) return;
  if (!J || !E) { $("#journey-error").hidden = false; return; }
  try {
    const money = cents => (cents / 100).toLocaleString('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2});
    const dateLabel = date => new Date(date+'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
    const initial = J.parse(location.search);
    let result = J.select(initial.key, E.parse(location.search)), stage = initial.stage,
      selected = initial.selected, selectedOnly = new URLSearchParams(location.search).get('order') === 'selected',
      page = 0, timer = null, replaying = false;
    let scopeSignature = scopeKey();
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    function scopeKey() { const s=E.parse(location.search); return [s.service,s.days,s.date].join('|'); }
    function stop() { clearTimeout(timer); timer=null; replaying=false; }
    function recordAtSelection() { return result.records.find(r=>r.index===selected); }
    function payload(record) {
      if (!record) return {status:'empty',message:'No deliveries match this scope.'};
      if (stage===0) return record.event;
      if (record.status==='quarantined') return {eventId:record.event.id,status:'quarantined',errors:record.reasons};
      if (stage>=2 && record.status==='duplicate') return {eventId:record.event.id,status:'skipped',reason:'Event ID already accepted; no additional order is written.'};
      if (stage===1) return {eventId:record.event.id,contract:'valid',currency:'USD',totalCents:record.event.totalCents};
      if (stage===2) return {eventId:record.event.id,write:'accepted',idempotencyKey:record.event.id};
      if (stage===3) return record.output;
      return {eventId:record.event.id,contribution:money(record.event.totalCents),measure:'recognized_order_value',provenance:'synthetic',date:record.date,service:record.serviceName};
    }
    function renderComparisons() {
      const comparison=$('#scenario-comparisons'); if(!comparison)return;
      const state=E.parse(location.search), focused=document.activeElement?.dataset.compareScenario;
      comparison.innerHTML=Object.entries(J.scenarios).map(([key,scenario])=>{
        const run=J.select(key,state);
        return `<button type="button" class="scenario-row" data-compare-scenario="${key}" aria-pressed="${key===result.key}"><span class="scenario-name">${scenario.name}<small>${run.accepted.toLocaleString('en-US')} accepted · ${run.quarantine.toLocaleString('en-US')} quarantined · ${run.duplicate.toLocaleString('en-US')} duplicates</small></span><span class="scenario-composition" aria-hidden="true"><i style="width:${run.received?run.accepted/run.received*100:0}%"></i><i style="width:${run.received?run.quarantine/run.received*100:0}%"></i><i style="width:${run.received?run.duplicate/run.received*100:0}%"></i></span><span class="scenario-value">${money(run.totalCents)}<small>filtered recognized value ↗</small></span></button>`;
      }).join('');
      if(focused)comparison.querySelector(`[data-compare-scenario="${focused}"]`)?.focus({preventScroll:true});
    }
    function renderJourney() {
      if(!recordAtSelection()){selected=result.records[0]?.index??0;selectedOnly=false;page=0;}
      page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(result.received/12)-1)));
      const params=new URLSearchParams(location.search);
      params.set('journey',result.key);params.set('stage',stage);params.set('event',selected);
      if(selectedOnly)params.set('order','selected');else params.delete('order');
      history.replaceState(null,'',location.pathname+'?'+params+location.hash);
      $('#journey-scenario').value=result.key;
      const focusedStage=document.activeElement?.dataset.journeyStage, record=recordAtSelection(), current=J.stages[stage];
      const processing=selectedOnly?J.summarize(record?[record]:[],result.key):result;
      const product=J.product(result,stage,selectedOnly?selected:null);
      $('#journey-scenario-note').textContent=J.scenarios[result.key].note;
      $('#journey-canvas').dataset.replaying=String(replaying);
      const counts=[processing.received,processing.valid,processing.accepted,processing.accepted,processing.accepted];
      $('#journey-stages').innerHTML=J.stages.map((s,i)=>`<button type="button" class="journey-node" data-journey-stage="${i}" aria-pressed="${i===stage}" data-reached="${i<=stage}"><span class="journey-node-top"><span>0${i+1}</span><span aria-hidden="true">${i<stage?'✓':i===stage?'◉':'○'}</span></span><strong>${s.name}</strong><span class="journey-node-count">${counts[i].toLocaleString('en-US')} <small>${i===0?(counts[i]===1?'delivery':'deliveries'):i===4?(counts[i]===1?'order':'orders'):(counts[i]===1?'event':'events')}</small></span><span class="journey-node-kind">${s.kind}</span></button>`).join('');
      $('#journey-reconciliation').innerHTML=`<span><strong>${processing.received}</strong> received</span><span aria-hidden="true">=</span><span><strong>${processing.accepted}</strong> accepted</span><span aria-hidden="true">+</span><span data-alert="${!!processing.quarantine}"><strong>${processing.quarantine}</strong> quarantined</span><span aria-hidden="true">+</span><span data-alert="${!!processing.duplicate}"><strong>${processing.duplicate}</strong> duplicates skipped</span>`;
      $('#journey-kind').textContent=`0${stage+1} / ${current.kind.toUpperCase()}`;
      const excluded=record&&((stage>=1&&record.status==='quarantined')||(stage>=2&&record.status==='duplicate'));
      $('#journey-stage-title').textContent=record?(excluded?'Excluded':current.name)+' · '+record.event.id:'No matching deliveries';
      $('#journey-description').textContent=!record?'Clear the workspace filters to view deliveries.':excluded?(record.status==='quarantined'?'Stopped at validation. This delivery contributes nothing to the published measures.':'Skipped at deduplication. This retry contributes no additional order value.'):current.description;
      $('#journey-code-caption').textContent=record?`${record.serviceName.toUpperCase()} / ${dateLabel(record.date)} / ${stage===0?'SOURCE JSON':stage===4?'MEASURE LINEAGE':'PROCESSING RESULT'}`:'EMPTY SCOPE';
      $('#journey-code').textContent=JSON.stringify(payload(record),null,2);
      $('#journey-progress').textContent=`${stage+1} of 5${replaying?' · Replaying':''}`;
      $('#journey-prev').disabled=stage===0;$('#journey-next').disabled=stage===4;
      $('#journey-replay').innerHTML=replaying?'Pause replay Ⅱ':'Replay flow ↻';
      $('#product-status').textContent=selectedOnly?'Selected delivery':`${current.name} preview`;
      $('#journey-value-label').textContent=product.valueLabel;$('#journey-count-label').textContent=product.countLabel;$('#journey-average-label').textContent=product.averageLabel;
      $('#journey-total').textContent=product.totalCents===null?'Pending':money(product.totalCents);
      $('#journey-orders').textContent=product.count.toLocaleString('en-US');
      $('#journey-average').textContent=product.averageCents===null?'—':money(product.averageCents);
      const state=E.parse(location.search);
      $('#journey-scope').textContent=selectedOnly&&record?`${record.event.id} · ${record.serviceName} · ${dateLabel(record.date)}`:`${state.service==='all'?'All services':state.service} · ${state.date?dateLabel(state.date):state.days+' days'} · ${result.received.toLocaleString('en-US')} synthetic deliveries`;
      $('#journey-clear-selection').hidden=!selectedOnly;
      const visible=result.records.slice(page*12,(page+1)*12), bars=J.product(J.summarize(visible,result.key),stage).records;
      const max=Math.max(1,...bars.map(r=>Number(r.event.totalCents)||0));
      $('#journey-bars-label').textContent=`Delivery contributions · page ${page+1}${selectedOnly?' · selection highlighted':''}`;
      $('#journey-contributions').innerHTML=bars.length?bars.map(r=>`<button class="contribution-bar" data-event="${r.index}" aria-label="Filter to ${r.event.id}, ${stage===0?'awaiting validation':money(r.event.totalCents)}" aria-pressed="${selectedOnly&&r.index===selected}" style="--value:${stage===0?100:Math.round((r.event.totalCents/max)*100)}%"><span aria-hidden="true"></span></button>`).join(''):'<p class="chart-note">No contributing deliveries at this stage.</p>';
      $('#journey-product-note').textContent=`${processing.accepted} accepted · ${processing.quarantine} quarantined · ${processing.duplicate} duplicates excluded. ${stage===0?'Value is unavailable until validation.':stage===1?'Validated value includes retries before deduplication.':'Measures include accepted unique orders only.'}`;
      $('#journey-ledger-count').textContent=`${result.received?Math.min(page*12+1,result.received):0}–${Math.min((page+1)*12,result.received)} OF ${result.received.toLocaleString('en-US')} DELIVERIES`;
      $('#journey-ledger').innerHTML=visible.map(r=>`<button class="ledger-event" data-event="${r.index}" data-status="${r.status}" aria-pressed="${selectedOnly&&r.index===selected}" aria-label="Delivery ${r.delivery+1}, ${r.event.id}, ${r.status}"><span class="ledger-index">${dateLabel(r.date)} · ${E.serviceById(r.serviceId).short}</span><strong>Order ${String(r.delivery+1).padStart(2,'0')}</strong><span class="ledger-outcome">${r.status==='accepted'?'✓ Accepted':r.status==='duplicate'?'↻ Duplicate':'! Quarantined'}</span></button>`).join('');
      $('#journey-page').textContent=`Page ${page+1} of ${Math.max(1,Math.ceil(result.received/12))}`;
      $('#journey-page-prev').disabled=page===0;$('#journey-page-next').disabled=(page+1)*12>=result.received;
      if(focusedStage!==undefined)$(`[data-journey-stage="${focusedStage}"]`)?.focus({preventScroll:true});
    }
    $('#journey-clear-selection').addEventListener('click',()=>{selectedOnly=false;renderJourney();$('#journey-stage-title').focus({preventScroll:true});});
    for(const [id,step] of [['journey-page-prev',-1],['journey-page-next',1]])$('#'+id).addEventListener('click',()=>{page+=step;selectedOnly=false;selected=result.records[page*12]?.index??0;renderJourney();});
    $('#journey-scenario').addEventListener('change',e=>{stop();result=J.select(e.target.value,E.parse(location.search));stage=4;selected=result.records[0]?.index??0;selectedOnly=false;page=0;renderComparisons();renderJourney();});
    $('#journey-replay').addEventListener('click',()=>{if(replaying){stop();renderJourney();return;}stop();stage=0;replaying=!reduced();renderJourney();if(reduced()){stage=4;renderJourney();return;}function advance(){stage++;if(stage===4)replaying=false;renderJourney();if(stage<4)timer=setTimeout(advance,850);}timer=setTimeout(advance,850);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&replaying){stop();renderJourney();}});
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',()=>{if(replaying){stop();renderJourney();}});
    $('#journey-prev').addEventListener('click',()=>{stop();stage=Math.max(0,stage-1);renderJourney();});
    $('#journey-next').addEventListener('click',()=>{stop();stage=Math.min(4,stage+1);renderJourney();});
    $('#journey').addEventListener('click',e=>{const node=e.target.closest('[data-journey-stage]'),event=e.target.closest('[data-event]');if(node){stop();stage=Number(node.dataset.journeyStage);renderJourney();}if(event){stop();selected=Number(event.dataset.event);selectedOnly=true;const ledger=!!event.closest('#journey-ledger');renderJourney();$(ledger?`#journey-ledger [data-event="${selected}"]`:`#journey-contributions [data-event="${selected}"]`)?.focus({preventScroll:true});}});
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
    window.addEventListener("atlas:render", () => {
      renderMatrix();
      if(scopeKey()!==scopeSignature){
        stop();scopeSignature=scopeKey();result=J.select(result.key,E.parse(location.search));
        selectedOnly=false;page=0;selected=result.records[0]?.index??0;
        renderComparisons();renderJourney();
      }
    });
    window.addEventListener("atlas:reset", () => {
      stop();
      result = J.select("clean", E.parse(location.search));
      selectedOnly=false;page=0;
      stage = 4;
      selected = 0;
      renderComparisons();renderJourney();
    });
    window.addEventListener("popstate", () => {
      const view = J.parse(location.search);
      scopeSignature=scopeKey();
      stop();
      result = J.select(view.key, E.parse(location.search));
      selectedOnly=new URLSearchParams(location.search).get("order")==="selected";
      stage = view.stage;
      selected = view.selected;
      page=Math.max(0,Math.floor(result.records.findIndex(r=>r.index===selected)/12));
      renderComparisons();renderJourney();
    }, {capture:true});
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
    $('#scenario-comparisons').addEventListener('click',event=>{
      const button=event.target.closest('[data-compare-scenario]');if(!button)return;
      stop();result=J.select(button.dataset.compareScenario,E.parse(location.search));
      selected=(result.records.find(r=>r.status!=='accepted')||result.records[0])?.index??0;
      stage=4;selectedOnly=false;page=Math.max(0,Math.floor(result.records.findIndex(r=>r.index===selected)/12));
      renderComparisons();renderJourney();$('#journey-stage-title').focus();
    });
    page=Math.max(0,Math.floor(result.records.findIndex(r=>r.index===selected)/12));
    renderComparisons();renderJourney();
    renderMatrix();
  } catch (error) {
    $("#journey-error").hidden = false;
    console.error("Data journey initialization failed.", error);
  }
})();
