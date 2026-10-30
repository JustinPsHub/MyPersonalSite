/* Deterministic, in-memory event inspection. No network or persistent storage. */
(() => {
  'use strict';
  const E = window.PortfolioEngine, $ = s => document.querySelector(s);
  if (!$('#playground')) return;
  let key = '', batch = null, selected = 0, stage = 0, page = 0;
  const buttons = [...document.querySelectorAll('[data-stage]')];
  const presets = [...document.querySelectorAll('[data-event-preset]')];
  const stages = [
    ['RECEIVE', 'Start with a clear contract.', 'Inspect the original envelope before any validation or transformation.'],
    ['VALIDATE', 'Build trust at the boundary.', 'Enforce the event type, required ID, supported currency, and nonnegative integer amount.'],
    ['TRANSFORM', 'Give the data a consistent shape.', 'Map accepted fields to the canonical analytics contract; convert integer cents to a reporting amount.'],
    ['ROUTE', 'Deliver once. Isolate violations.', 'Deliver each valid ID once per run. Isolate invalid events and retain their validation reasons.']
  ];
  const labels = {'delivered':'Delivered', 'dead-letter':'Dead letter', 'duplicate':'Duplicate skipped'};
  const say = text => { $('#pipeline-status').textContent = text; };
  const set = (id, text) => { $('#'+id).textContent = text; };
  function node(tag, text, className) {
    const el = document.createElement(tag);el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function inspect(nextStage = stage) {
    stage = nextStage;
    const row = batch?.receipts[selected], definition = stages[stage];
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === stage)));
    set('stage-label', `0${stage+1} / ${definition[0]}`);
    set('stage-title', definition[1]);set('stage-description', definition[2]);
    const sample = row?.event || E.eventPreset('valid')[0];
    let payload = sample, caption = 'INPUT / JSON';
    if (row && stage === 1) {
      payload = {valid:row.status !== 'dead-letter', errors:row.errors};caption = 'VALIDATION / JSON';
    }
    if (row && stage === 2) {
      payload = row.status === 'dead-letter' ? {status:'skipped', reason:'Contract validation failed', errors:row.errors} : E.processEvent(row.event).output;
      caption = row.status === 'dead-letter' ? 'TRANSFORM / SKIPPED' : 'CANONICAL OUTPUT / JSON';
    }
    if (row && stage === 3) {
      payload = row.status === 'delivered' ? {...row.output, status:'delivered'} : row.status === 'dead-letter'
        ? {status:'dead-letter', destination:'simulation.dead-letter', original:row.event, errors:row.errors}
        : {status:'duplicate', eventId:row.event.id, destination:null, reason:'This ID was already delivered in the current run.'};
      caption = 'DELIVERY RESULT / JSON';
    }
    set('code-caption', caption);set('event-code', JSON.stringify(payload, null, 2));
    set('event-selection', row ? `${row.event.id} · ${labels[row.status]} · Event ${selected+1} of ${batch.received}` : 'No event selected');
    const statuses = !row ? ['Ready','Waiting','Waiting','Waiting'] : row.status === 'dead-letter' ? ['Complete','Rejected','Skipped','Isolated'] : row.status === 'duplicate' ? ['Complete','Complete','Complete','Skipped'] : ['Complete','Complete','Complete','Complete'];
    buttons.forEach((button,index) => {button.querySelector('.step-state').textContent = statuses[index];button.dataset.status = statuses[index].toLowerCase();});
  }
  function select(index) {
    selected = index;page = Math.floor(index/10);inspect(3);renderReceipts();
    say(`Inspecting ${batch.receipts[index].event.id}. ${labels[batch.receipts[index].status]}.`);
  }
  function renderReceipts() {
    const host = $('#event-receipts');host.replaceChildren();
    const rows = batch?.receipts.slice(page*10,page*10+10) || [];
    if (!rows.length) host.append(node('p','Run a scenario to explore its event receipts.','event-empty'));
    rows.forEach(row => {
      const button = node('button','', 'event-receipt');button.type='button';
      button.dataset.receipt=String(row.index);button.dataset.outcome=row.status;
      button.setAttribute('aria-pressed',String(row.index===selected));
      button.append(node('span',row.event.id,'receipt-id'),node('span',labels[row.status],'receipt-outcome'),node('span','Inspect →','receipt-action'));
      button.addEventListener('click',()=>select(row.index));host.append(button);
    });
    $('#event-prev').disabled = page === 0;$('#event-next').disabled = !batch || (page+1)*10 >= batch.received;
    set('event-page',batch ? `${page*10+1}–${Math.min((page+1)*10,batch.received)} of ${batch.received}` : '0 events');
  }
  function renderDeadLetters() {
    const host = $('#dead-letter-list');host.replaceChildren();
    if (!batch?.deadLetters.length) host.append(node('p','No rejected events. Contract violations will appear here with their validation reasons.','event-empty'));
    batch?.deadLetters.forEach(row => {
      const button = node('button','','dead-letter-entry');button.type='button';button.dataset.deadLetter=String(row.index);
      button.append(node('span',row.event.id,'receipt-id'),node('span',row.errors.join(' '),'rejection-reason'),node('span','Inspect →','receipt-action'));
      button.addEventListener('click',()=>{select(row.index);$('#stage-label').scrollIntoView?.({behavior:'auto',block:'center'});buttons[3].focus({preventScroll:true});});host.append(button);
    });
  }
  function render() {
    presets.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.eventPreset===key)));
    set('event-received',batch?.received || 0);set('event-delivered',batch?.delivered.length || 0);
    set('event-rejected',batch?.deadLetters.length || 0);set('event-duplicates',batch?.duplicates.length || 0);
    set('event-accounting', batch ? `${batch.received} = ${batch.delivered.length} delivered + ${batch.deadLetters.length} dead-lettered + ${batch.duplicates.length} skipped` : 'No events processed');
    set('run-pipeline',batch ? 'Run this scenario again →' : 'Run valid event →');
    inspect();renderReceipts();renderDeadLetters();
  }
  function run(preset) {
    key = ['valid','invalid','burst'].includes(preset) ? preset : 'valid';
    batch = E.processBatch(E.eventPreset(key));selected = 0;page = 0;stage = 3;render();
    say(key==='valid' ? 'Delivered. The event passed validation and produced canonical output. All four stages completed successfully.' : key==='invalid'
      ? 'Isolated. The event failed its contract and was added to the simulated dead-letter collection. No downstream output was produced.'
      : `Batch complete. ${batch.received} received · ${batch.delivered.length} delivered · ${batch.deadLetters.length} dead-lettered · ${batch.duplicates.length} duplicates skipped.`);
  }
  presets.forEach(button => button.addEventListener('click',()=>run(button.dataset.eventPreset)));
  buttons.forEach((button,index)=>button.addEventListener('click',()=>inspect(index)));
  $('#run-pipeline').addEventListener('click',()=>run(key));
  $('#event-reset').addEventListener('click',()=>{key='';batch=null;selected=stage=page=0;render();say('Simulation reset. No events or rejected payloads remain in memory.');});
  $('#event-prev').addEventListener('click',()=>{if(page>0){page--;renderReceipts();say('Viewing events '+$('#event-page').textContent+'.');}});
  $('#event-next').addEventListener('click',()=>{if(batch && (page+1)*10<batch.received){page++;renderReceipts();say('Viewing events '+$('#event-page').textContent+'.');}});
  render();
})();
