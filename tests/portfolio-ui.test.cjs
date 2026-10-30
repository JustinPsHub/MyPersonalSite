const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../MyPersonalSite/wwwroot/portfolio');
function setup(page='index',options={}){
 const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8'),{url:'https://www.justinraypalmer.com/'+page+'.html'+(options.query||''),runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window,raf=new Map(),observers=[];let frameId=0,drawCalls=0;
 if(options.paused)w.localStorage.setItem('jp-motion','paused');
 w.matchMedia=query=>({matches:query.includes('reduced-motion')?!!options.reduced:false,addEventListener(){},removeEventListener(){}});
 w.requestAnimationFrame=fn=>{const id=++frameId;raf.set(id,fn);return id};w.cancelAnimationFrame=id=>raf.delete(id);
 w.ResizeObserver=class{constructor(fn){this.fn=fn}observe(){this.fn()}unobserve(){}};
 w.IntersectionObserver=class{constructor(fn){this.fn=fn;observers.push(this)}observe(el){this.el=el;this.fn([{target:el,isIntersecting:true}])}unobserve(){}};
 const defaultRect=w.HTMLElement.prototype.getBoundingClientRect;if(options.chartWidth)w.HTMLElement.prototype.getBoundingClientRect=function(){return this.id==='volume-chart'?{width:options.chartWidth,height:250,left:0,top:0}:defaultRect.call(this)};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 for(const file of [...w.document.querySelectorAll('script[src]')].map(el=>new URL(el.src).pathname.split('/').pop()))vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),dom.getInternalVMContext(),{filename:file});
 return {w,doc:w.document,raf,observers,errors,drawCalls:()=>drawCalls,frame(now){const current=[...raf.values()];raf.clear();for(const fn of current)fn(now)},close(){dom.window.close()}};
}
test('every page initializes with semantic navigation and unique IDs',()=>{for(const page of ['index','visuals','platform','resume']){const ui=setup(page);assert.deepEqual(ui.errors,[]);const ids=[...ui.doc.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length);assert.equal(ui.doc.querySelectorAll('h1').length,1);assert.equal(ui.doc.querySelectorAll('nav[aria-label="Main navigation"] a').length,5);assert.equal(ui.doc.querySelector('canvas,.search-trigger'),null);ui.close()}});
test('dashboard links restore filters, metric and service totals consistently',()=>{const ui=setup('visuals',{query:'?service=Identity&days=7&metric=latency&sort=name'}),{doc,w}=ui;assert.equal(doc.querySelector('#service').value,'Identity');assert.equal(doc.querySelector('#chart-metric').value,'latency');assert.equal(doc.querySelector('#requests').title,'470,013 service requests');assert.equal(doc.querySelectorAll('#service-table tr').length,5);assert.equal(doc.querySelectorAll('#service-table tr[data-selected=true]').length,1);assert.equal(doc.querySelector('#metric-title').textContent,'Response time');assert.match(doc.querySelector('#volume-chart title').textContent,/Average latency/);const select=doc.querySelector('#chart-metric');select.value='errors';select.dispatchEvent(new w.Event('change'));assert.match(w.location.search,/metric=errors/);assert.equal(doc.querySelector('#metric-title').textContent,'Failed requests');doc.querySelector('#reset-filters').click();assert.equal(doc.querySelectorAll('#service-table tr').length,5);assert.equal(doc.querySelector('#chart-metric').value,'requests');assert.equal(doc.querySelector('[data-days="30"]').getAttribute('aria-pressed'),'true');ui.close()});
test('navigation disclosure closes with Escape and restores its control focus',()=>{const ui=setup(),{doc,w}=ui,button=doc.querySelector('#nav-toggle');assert.equal(button.getAttribute('aria-controls'),'main-navigation');assert.equal(button.getAttribute('aria-expanded'),'false');button.click();assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(doc.querySelector('.header').dataset.menuOpen,'true');doc.querySelector('#main-navigation a').focus();doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(doc.activeElement,button);button.click();doc.querySelector('.hero-description').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));assert.equal(button.getAttribute('aria-expanded'),'false');assert.deepEqual(ui.errors,[]);ui.close()});
test('narrow charts use the available width and service cards retain labeled metrics',()=>{const ui=setup('visuals',{chartWidth:227,query:'?service=Identity&days=7'}),{doc}=ui;const svg=doc.querySelector('#volume-chart svg');assert.equal(svg.getAttribute('viewBox'),'0 0 240 240');assert.equal(doc.querySelector('#requests').title,'470,013 service requests');assert.deepEqual([...doc.querySelectorAll('#service-table td')].map(td=>td.dataset.label),Array(5).fill(['Requests','Success','Avg. latency','Releases',undefined]).flat());assert.ok([...svg.querySelectorAll('text')].every(el=>el.classList.contains('chart-text')));assert.deepEqual(ui.errors,[]);ui.close()});
test('valid events complete the pipeline and produce a normalized payload',()=>{const ui=setup('platform',{paused:true});ui.doc.querySelector('#run-pipeline').click();assert.match(ui.doc.querySelector('#pipeline-status').textContent,/All four stages completed/);const result=JSON.parse(ui.doc.querySelector('#event-code').textContent);assert.equal(result.total,129);assert.equal(result.destination,'analytics.orders');assert.equal(ui.doc.querySelectorAll('[data-status="complete"]').length,4);assert.equal(ui.doc.querySelector('#run-pipeline').disabled,false);ui.close()});
test('invalid events are isolated with their reasons and never produce downstream output',()=>{const ui=setup('platform',{paused:true}),{doc}=ui;doc.querySelector('[data-event-preset=invalid]').click();assert.match(doc.querySelector('#pipeline-status').textContent,/Isolated/);assert.equal(doc.querySelectorAll('[data-status="skipped"]').length,1);assert.match(doc.querySelector('#event-code').textContent,/nonnegative safe integer/);assert.equal(JSON.parse(doc.querySelector('#event-code').textContent).status,'dead-letter');assert.equal(doc.querySelector('#event-delivered').textContent,'0');assert.equal(doc.querySelector('#event-rejected').textContent,'1');assert.equal(doc.querySelectorAll('[data-dead-letter]').length,1);doc.querySelector('[data-stage="2"]').click();assert.equal(JSON.parse(doc.querySelector('#event-code').textContent).status,'skipped');assert.equal(doc.querySelector('#run-pipeline').disabled,false);ui.close()});

test('profile and contact remain available without scripts',()=>{const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'));const doc=dom.window.document;assert.equal(doc.querySelectorAll('.expertise-row').length,3);assert.equal(doc.querySelector('.case-study'),null);assert.ok(doc.querySelector('a[href="contact.html"]'));assert.ok(doc.querySelector('.actions a[href="resume.html"]'));assert.ok(doc.querySelector('nav a[href="visuals.html"]'));assert.ok(doc.querySelector('footer a[href="visuals.html"]'));dom.window.close()});
test('professional introduction omits employer-specific project narratives while retaining career context',()=>{for(const page of ['index','resume','visuals','platform']){const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8')),doc=dom.window.document,text=doc.querySelector('main').textContent;assert.doesNotMatch(text,/25 fact tables|90 dimensions|VM quarantine|PL\/SQL/i);if(page!=='resume')assert.doesNotMatch(text,/Treasury|Internal Revenue Service|federal government/i);else{assert.match(text,/U.S. Department of the Treasury/);assert.match(text,/Internal Revenue Service/);assert.equal(doc.querySelectorAll('.experience').length,3);assert.equal(doc.querySelectorAll('.experience li').length,8)}dom.window.close()}});
test('theme changes persist and dashboard colors update without losing filters',()=>{const ui=setup('visuals',{query:'?service=Identity&days=7'}),{doc,w}=ui;doc.querySelector('#theme').click();assert.equal(doc.documentElement.dataset.theme,'dark');assert.equal(w.localStorage.getItem('jp-theme'),'dark');assert.equal(doc.querySelector('#service').value,'Identity');assert.equal(doc.querySelector('#requests').title,'470,013 service requests');doc.querySelector('#theme').click();assert.equal(w.localStorage.getItem('jp-theme'),'light');ui.close()});
test('perspective controls work with reduced motion while profile content stays visible',()=>{const ui=setup('index',{reduced:true}),{doc}=ui;assert.equal(doc.querySelector('.is-pending'),null);for(const [key,phrase] of [['data','Confident decisions'],['delivery','Reliable delivery'],['software','Dependable software']]){doc.querySelector(`[data-perspective="${key}"]`).click();assert.equal(doc.querySelector('.system-figure').dataset.system,key);assert.equal(doc.querySelectorAll('[data-perspective][aria-pressed="true"]').length,1);assert.match(doc.querySelector('#system-caption').textContent,new RegExp(phrase))}assert.equal(doc.querySelector('#system-caption').getAttribute('aria-live'),'polite');assert.deepEqual(ui.errors,[]);ui.close()});
test('resume printing uses the browser and retains printable contact identity',()=>{const ui=setup('resume');let called=false;ui.w.print=()=>{called=true};ui.doc.querySelector('#print-resume').click();assert.equal(called,true);assert.match(ui.doc.querySelector('.print-contact').textContent,/Justin Palmer.*justinraypalmer\.com\/contact/);assert.ok(ui.doc.querySelector('a[href="/resume/jrp_resume_20260128.docx"]'));ui.close()});


test('dependency selection coordinates all views and preserves keyboard focus',()=>{
 const ui=setup('visuals'),{doc,w}=ui;const node=doc.querySelector('[data-map-node="identity"]');node.focus();node.click();assert.equal(doc.activeElement.dataset.mapNode,'identity');assert.equal(doc.querySelector('#service').value,'Identity');assert.equal(doc.querySelector('#inspector-title').textContent,'Identity');assert.match(w.location.search,/service=Identity/);assert.equal(doc.querySelectorAll('#service-table tr[data-selected=true]').length,1);assert.equal(doc.querySelector('#atlas-error').hidden,true);ui.close();
});
test('what-if controls change model output and preserve the observed metrics',()=>{
 const ui=setup('visuals'),{doc,w}=ui;const requests=doc.querySelector('#requests').textContent,latency=doc.querySelector('#latency').textContent;const slider=doc.querySelector('#latency-delta');slider.value='100';slider.dispatchEvent(new w.Event('input'));assert.equal(doc.querySelector('#delta-output').textContent,'+100 ms');assert.match(doc.querySelector('#scenario-insight').textContent,/69.5 ms/);assert.equal(doc.querySelector('#requests').textContent,requests);assert.equal(doc.querySelector('#latency').textContent,latency);assert.match(w.location.search,/delta=100/);doc.querySelector('[data-map-node="observe"]').click();assert.equal(doc.querySelector('#modeled-impact').textContent.trim().startsWith('+'),true);assert.match(doc.querySelector('#scenario-insight').textContent,/asynchronous/);assert.equal(doc.querySelector('#affected-count').textContent,'0');ui.close();
});
test('incident investigation applies a coherent day filter that can be cleared',()=>{
 const ui=setup('visuals'),{doc}=ui;doc.querySelector('#investigate').click();assert.equal(doc.querySelector('#service').value,'Storage');assert.equal(doc.querySelector('#latency').textContent,'276 ms');assert.equal(doc.querySelector('#requests').title,'55,781 service requests');assert.equal(doc.querySelector('#clear-date').hidden,false);assert.match(doc.querySelector('#selection-summary').textContent,/1 synthetic daily record$/);doc.querySelector('#clear-date').click();assert.equal(doc.querySelector('#clear-date').hidden,true);assert.equal(doc.activeElement.id,'inspect-day');assert.match(doc.querySelector('#selection-summary').textContent,/7 synthetic daily records/);ui.close();
});
test('service search has a safe useful empty state and a focused recovery action',()=>{
 const ui=setup('visuals'),{doc,w}=ui;const search=doc.querySelector('#service-search');search.value='<img src=x onerror=alert(1)>';search.dispatchEvent(new w.Event('input'));assert.equal(doc.querySelector('#service-table').children.length,0);assert.equal(doc.querySelector('#explorer-empty').hidden,false);assert.equal(doc.querySelector('#explorer-empty img'),null);doc.querySelector('#clear-search').click();assert.equal(doc.querySelectorAll('#service-table tr').length,5);assert.equal(doc.activeElement.id,'service-search');search.value='infrastructure';search.dispatchEvent(new w.Event('input'));assert.equal(doc.querySelectorAll('#service-table tr').length,1);assert.match(doc.querySelector('#service-table').textContent,/Storage/);ui.close();
});
test('service dialog supports relationship drilldown, focus action, and opener restoration',()=>{
 const ui=setup('visuals'),{doc}=ui;const opener=doc.querySelector('[data-details="data"]');opener.click();assert.equal(doc.querySelector('#service-dialog').open,true);assert.equal(doc.querySelector('#detail-title').textContent,'Data Platform');doc.querySelector('[data-related="storage"]').click();assert.equal(doc.querySelector('#detail-title').textContent,'Storage');doc.querySelector('#focus-service').click();assert.equal(doc.querySelector('#service-dialog').open,false);assert.equal(doc.querySelector('#service').value,'Storage');doc.querySelector('#open-details').click();doc.querySelector('#close-details').click();assert.equal(doc.activeElement.id,'open-details');ui.close();
});
test('URL restoration includes the selected day, model and safe table search',()=>{
 const ui=setup('visuals',{query:'?service=Storage&days=7&date=2026-10-08&metric=latency&focus=storage&delta=125&q=infra'}),{doc,w}=ui;assert.equal(doc.querySelector('#latency').textContent,'276 ms');assert.equal(doc.querySelector('#latency-delta').value,'125');assert.equal(doc.querySelector('#service-search').value,'infra');assert.equal(doc.querySelectorAll('#service-table tr').length,1);w.history.replaceState(null,'','?service=Identity&days=7');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal(doc.querySelector('#service').value,'Identity');assert.equal(doc.querySelector('#service-search').value,'');assert.equal(doc.querySelector('#requests').title,'470,013 service requests');ui.close();
});
test('exports contain exactly the selected observed records and label their provenance',()=>{
 const ui=setup('visuals',{query:'?service=Storage&days=7&date=2026-10-08&delta=300'}),{doc,w}=ui;let blob,download;w.Blob=class{constructor(parts){blob=parts.join('')}};w.URL.createObjectURL=()=> 'blob:demo';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){download=this.download};doc.querySelector('#export-data').click();const rows=blob.split('\r\n');assert.equal(rows.length,2);assert.equal(rows[1],'synthetic,2026-10-08,Storage,55781,642,276,0');assert.match(download,/synthetic-2026-10-08/);ui.close();
});
test('daily chart inspection exposes exact values and focuses every analytical view',()=>{
 const ui=setup('visuals'),{doc,w}=ui;const slider=doc.querySelector('#inspect-day');slider.value='23';slider.dispatchEvent(new w.Event('input'));assert.match(slider.getAttribute('aria-valuetext'),/Oct 8/);doc.querySelector('#focus-day').click();assert.match(doc.querySelector('#selection-summary').textContent,/Oct 8/);assert.match(doc.querySelector('#selection-summary').textContent,/5 synthetic daily records/);assert.match(w.location.search,/date=2026-10-08/);ui.close();
});

test('Atlas has no serious semantic accessibility violations, including the service dialog',async()=>{
 const ui=setup('visuals'),{w,doc}=ui;w.eval(require('axe-core').source);
 const options={runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:false}}};
 const result=await w.axe.run(doc,options);assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));
 doc.querySelector('[data-details="storage"]').click();const dialogResult=await w.axe.run(doc,options);assert.equal(dialogResult.violations.length,0,JSON.stringify(dialogResult.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));ui.close();
});

test('reduced motion retains the full Atlas workflow and live chart values',()=>{const ui=setup('visuals',{reduced:true});ui.doc.querySelector('#investigate').click();assert.equal(ui.doc.querySelector('#latency').textContent,'276 ms');assert.equal(ui.doc.querySelector('#atlas-error').hidden,true);assert.equal(ui.raf.size,0);ui.close()});
test('keyboard focus survives cross filtering from a failure contribution',()=>{const ui=setup('visuals'),b=ui.doc.querySelector('.failure-row[data-service="storage"]');b.focus();b.click();assert.equal(ui.doc.activeElement.dataset.service,'storage');assert.ok(ui.doc.activeElement.classList.contains('failure-row'));ui.close()});

test('journey scenarios change derived measures and reveal rejected provenance without altering telemetry',()=>{
 const ui=setup('visuals',{query:'?service=API+Gateway&days=7&date=2026-10-14'}),{doc,w}=ui,requests=doc.querySelector('#requests').textContent;
 assert.equal(doc.querySelector('#journey-total').textContent,'$1,729.00');
 const scenario=doc.querySelector('#journey-scenario');scenario.value='drift';scenario.dispatchEvent(new w.Event('change'));
 assert.equal(doc.querySelector('#journey-total').textContent,'$1,340.50');assert.equal(doc.querySelector('#journey-orders').textContent,'9');
 doc.querySelector('#journey-ledger [data-event="3"]').click();assert.match(doc.querySelector('#journey-code').textContent,/quarantined/);assert.match(doc.querySelector('#journey-code').textContent,/safe integer/);
 assert.equal(doc.activeElement.dataset.event,'3');assert.equal(doc.querySelector('#requests').textContent,requests);
 scenario.value='retry';scenario.dispatchEvent(new w.Event('change'));doc.querySelector('#journey-ledger [data-event="10"]').click();assert.match(doc.querySelector('#journey-code').textContent,/skipped/);
 assert.equal(doc.querySelector('#journey-total').textContent,'$0.00');doc.querySelector('#journey-clear-selection').click();assert.equal(doc.querySelector('#journey-total').textContent,'$1,356.00');assert.deepEqual(ui.errors,[]);ui.close();
});
test('journey share state survives analytical filters, browser navigation and reset',()=>{
 const ui=setup('visuals',{query:'?journey=drift&stage=1&event=7'}),{doc,w}=ui;
 assert.equal(doc.querySelector('#journey-scenario').value,'drift');assert.match(doc.querySelector('#journey-code').textContent,/USD/);
 doc.querySelector('[data-days="7"]').click();assert.match(w.location.search,/journey=drift/);assert.match(w.location.search,/stage=1/);assert.match(w.location.search,/event=0/);
 w.history.replaceState(null,'','?journey=retry&stage=2&event=10');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.match(doc.querySelector('#journey-code').textContent,/skipped/);
 doc.querySelector('#reset-filters').click();assert.equal(doc.querySelector('#journey-scenario').value,'clean');assert.equal(doc.querySelector('#journey-total').textContent,'$350,589.69');ui.close();
});
test('matrix keyboard movement and selection coordinate the exact service and day',()=>{
 const ui=setup('visuals'),{doc,w}=ui;let cell=doc.querySelector('[data-cell="49"]');cell.focus();cell.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 assert.equal(doc.activeElement.dataset.cell,'50');doc.activeElement.click();assert.equal(doc.querySelector('#service').value,'Storage');assert.match(doc.querySelector('#selection-summary').textContent,/Oct 9/);
 assert.equal(doc.activeElement.dataset.cell,'50');assert.match(doc.querySelector('#matrix-readout').textContent,/250 failed/);
 doc.querySelector('[data-days="7"]').click();assert.equal(doc.querySelectorAll('[data-cell]').length,35);assert.equal(doc.querySelectorAll('[data-cell][tabindex="0"]').length,1);ui.close();
});
test('command menu supports query, arrow keys, safe empty state, navigation and focus return',async()=>{
 const ui=setup('visuals'),{doc,w}=ui;const opener=doc.querySelector('#open-command');opener.focus();opener.click();assert.equal(doc.querySelector('#command-dialog').open,true);assert.equal(doc.activeElement.id,'command-search');
 const input=doc.querySelector('#command-search');input.value='<img>';input.dispatchEvent(new w.Event('input'));assert.ok(doc.querySelector('.command-empty'));assert.equal(doc.querySelector('#command-results img'),null);
 input.value='data journey';input.dispatchEvent(new w.Event('input'));input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(doc.activeElement.dataset.command,'0');doc.activeElement.click();assert.equal(w.location.hash,'#journey');assert.equal(doc.activeElement.id,'journey-title');
 opener.focus();opener.click();doc.querySelector('#close-command').click();assert.equal(doc.activeElement,opener);
 doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));assert.equal(doc.querySelector('#command-dialog').open,true);
 w.eval(require('axe-core').source);const result=await w.axe.run(doc,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:false}}});assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>v.id)));ui.close();
});
test('reduced motion replay is immediate, inspectable and schedules no animation',()=>{
 const ui=setup('visuals',{reduced:true}),{doc}=ui;doc.querySelector('#journey-replay').click();assert.equal(doc.querySelector('#journey-progress').textContent,'5 of 5');assert.equal(doc.querySelector('#journey-canvas').dataset.replaying,'false');doc.querySelector('[data-journey-stage="0"]').focus();doc.querySelector('[data-journey-stage="0"]').click();assert.equal(doc.activeElement.dataset.journeyStage,'0');assert.match(doc.querySelector('#journey-code').textContent,/totalCents/);ui.close();
});


test('replay can be paused and scenario changes cancel an in-flight sequence',()=>{
 const ui=setup('visuals'),{doc,w}=ui;const timers=new Map();let id=0;w.setTimeout=fn=>{timers.set(++id,fn);return id};w.clearTimeout=key=>timers.delete(key);
 doc.querySelector('#journey-replay').click();assert.equal(doc.querySelector('#journey-progress').textContent,'1 of 5 · Replaying');assert.equal(timers.size,1);
 const advance=[...timers.values()][0];timers.clear();advance();assert.equal(doc.querySelector('#journey-progress').textContent,'2 of 5 · Replaying');
 doc.querySelector('#journey-replay').click();assert.equal(timers.size,0);assert.equal(doc.querySelector('#journey-progress').textContent,'2 of 5');
 doc.querySelector('#journey-replay').click();const scenario=doc.querySelector('#journey-scenario');scenario.value='retry';scenario.dispatchEvent(new w.Event('change'));assert.equal(timers.size,0);assert.equal(doc.querySelector('#journey-progress').textContent,'5 of 5');assert.equal(doc.querySelector('#journey-total').textContent,'$274,956.27');ui.close();
});

test('Systems Studio routes perspectives and node activation without losing focus',()=>{
 const ui=setup('index'),{doc}=ui;
 for(const [key,target] of [['data','#journey'],['delivery','#dependencies'],['software','#journey']]){
  const button=doc.querySelector(`[data-perspective="${key}"]`);button.focus();button.click();
  assert.equal(doc.activeElement,button);assert.equal(doc.querySelectorAll('[data-perspective][aria-pressed=true]').length,1);
  assert.match(doc.querySelector('#studio-deep-link').getAttribute('href'),new RegExp(target+'$'));
 }
 const node=doc.querySelector('[data-lens="data"]');node.focus();node.click();
 assert.equal(doc.querySelector('.studio').dataset.system,'data');assert.equal(doc.activeElement,node);
 assert.equal(doc.querySelector('#studio-label').textContent,'02 / DATA ARCHITECTURE');assert.equal(doc.querySelector('#studio-tech').textContent,'SQLData modelsPower BI');assert.deepEqual(ui.errors,[]);ui.close();
});
test('Systems Studio reduced motion schedules no frames and retains navigation',()=>{
 const ui=setup('index',{reduced:true}),{doc,w}=ui;
 doc.querySelector('.studio').dispatchEvent(new w.MouseEvent('pointermove',{clientX:20,clientY:20}));
 assert.equal(ui.raf.size,0);doc.querySelector('[data-perspective="delivery"]').click();assert.match(doc.querySelector('#studio-tech').textContent,/Azure/);
 assert.equal(doc.querySelectorAll('.project-preview').length,2);ui.close();
});
test('scenario comparison derives exact outcomes and opens the first exclusion with URL state and focus',()=>{
 const ui=setup('visuals',{query:'?service=API+Gateway&days=7&date=2026-10-14'}),{doc,w}=ui;const before=doc.querySelector('#requests').textContent;
 assert.equal(doc.querySelectorAll('[data-compare-scenario]').length,3);
 assert.match(doc.querySelector('[data-compare-scenario=drift]').textContent,/9 accepted · 3 quarantined · 0 duplicates/);
 assert.match(doc.querySelector('[data-compare-scenario=drift]').textContent,/\$1,340\.50/);
 doc.querySelector('[data-compare-scenario=drift]').click();assert.match(w.location.search,/journey=drift/);assert.match(w.location.search,/event=3/);assert.match(w.location.search,/stage=4/);assert.match(doc.querySelector('#journey-code').textContent,/quarantined/);assert.equal(doc.activeElement.id,'journey-stage-title');
 doc.querySelector('[data-compare-scenario=retry]').click();assert.match(doc.querySelector('#journey-code').textContent,/skipped/);assert.match(w.location.search,/event=10/);assert.match(doc.querySelector('#journey-total').textContent,/1,356\.00/);
 assert.equal(doc.querySelectorAll('[data-compare-scenario][aria-pressed=true]').length,1);assert.equal(doc.querySelector('#requests').textContent,before);
 doc.querySelector('#reset-filters').click();assert.equal(doc.querySelector('[data-compare-scenario=clean]').getAttribute('aria-pressed'),'true');ui.close();
});
test('the homepage has no WCAG semantic accessibility violations',async()=>{
 const ui=setup('index'),{doc,w}=ui;w.eval(require('axe-core').source);
 const result=await w.axe.run(doc,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:false}}});assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>v.id)));ui.close();
});

test('order intelligence recalculates for service, period, day slider, map and reset selections',()=>{
 const ui=setup('visuals'),{doc,w}=ui;
 assert.equal(doc.querySelector('#journey-orders').textContent,'1,800');
 const initial=doc.querySelector('#journey-total').textContent;
 const service=doc.querySelector('#service');service.value='Identity';service.dispatchEvent(new w.Event('change'));
 assert.equal(doc.querySelector('#journey-orders').textContent,'360');assert.notEqual(doc.querySelector('#journey-total').textContent,initial);
 doc.querySelector('[data-days="7"]').click();assert.equal(doc.querySelector('#journey-orders').textContent,'84');
 assert.equal(doc.querySelector('#journey-total').textContent,'$15,867.06');
 const slider=doc.querySelector('#inspect-day');slider.value='0';slider.dispatchEvent(new w.Event('input'));
 assert.equal(doc.querySelector('#journey-orders').textContent,'12');assert.match(doc.querySelector('#journey-scope').textContent,/Oct 8/);
 doc.querySelector('[data-map-node="storage"]').click();assert.equal(doc.querySelector('#journey-total').textContent,'$2,579.67');
 doc.querySelector('#reset-filters').click();assert.equal(doc.querySelector('#journey-total').textContent,initial);assert.equal(doc.querySelector('#journey-orders').textContent,'1,800');assert.deepEqual(ui.errors,[]);ui.close();
});
test('delivery selection filters measures, stages expose processing state, and clearing retains workspace filters',()=>{
 const ui=setup('visuals',{query:'?service=API+Gateway&days=7&date=2026-10-14'}),{doc,w}=ui;
 doc.querySelector('#journey-ledger [data-event="0"]').click();assert.equal(doc.querySelector('#journey-total').textContent,'$129.00');assert.equal(doc.querySelector('#journey-orders').textContent,'1');assert.match(w.location.search,/order=selected/);assert.match(doc.querySelector('[data-journey-stage="0"]').textContent,/1 delivery/);assert.match(doc.querySelector('[data-journey-stage="4"]').textContent,/1 order/);
 doc.querySelector('#journey-contributions [data-event="1"]').click();assert.equal(doc.querySelector('#journey-total').textContent,'$84.50');
 doc.querySelector('[data-journey-stage="0"]').click();assert.equal(doc.querySelector('#journey-total').textContent,'Pending');assert.equal(doc.querySelector('#journey-count-label').textContent,'Received deliveries');
 doc.querySelector('[data-journey-stage="4"]').click();assert.equal(doc.querySelector('#journey-total').textContent,'$84.50');
 doc.querySelector('#journey-clear-selection').click();assert.equal(doc.querySelector('#journey-total').textContent,'$1,729.00');assert.equal(doc.querySelector('#journey-clear-selection').hidden,true);assert.equal(doc.querySelector('#service').value,'API Gateway');assert.doesNotMatch(w.location.search,/order=selected/);ui.close();
});
test('scoped order URLs, history, paging, comparison and exclusions stay coordinated',()=>{
 const ui=setup('visuals',{query:'?service=Storage&days=7&date=2026-10-08&journey=drift&stage=4&event=399&order=selected'}),{doc,w}=ui;
 assert.equal(doc.querySelector('#journey-total').textContent,'$0.00');assert.equal(doc.querySelector('#journey-orders').textContent,'0');assert.match(doc.querySelector('#journey-code').textContent,/quarantined/);
 doc.querySelector('#journey-clear-selection').click();assert.equal(doc.querySelector('#journey-total').textContent,'$2,000.03');
 assert.match(doc.querySelector('[data-compare-scenario=drift]').textContent,/9 accepted · 3 quarantined/);
 const date=doc.querySelector('#clear-date');date.click();assert.equal(doc.querySelector('#journey-orders').textContent,'63');
 doc.querySelector('#journey-page-next').click();assert.match(doc.querySelector('#journey-page').textContent,/Page 2 of 7/);assert.equal(doc.querySelectorAll('#journey-ledger button').length,12);
 w.history.replaceState(null,'','?service=API+Gateway&days=7&date=2026-10-14&event=0&order=selected');w.dispatchEvent(new w.PopStateEvent('popstate'));
 assert.equal(doc.querySelector('#journey-total').textContent,'$129.00');assert.match(doc.querySelector('#journey-page').textContent,/Page 1 of 1/);
 const before=doc.querySelector('#journey-total').textContent;const delta=doc.querySelector('#latency-delta');delta.value='100';delta.dispatchEvent(new w.Event('input'));assert.equal(doc.querySelector('#journey-total').textContent,before);assert.match(w.location.search,/order=selected/);assert.deepEqual(ui.errors,[]);ui.close();
});
test('public Resume labels use plain lettering',()=>{
 for(const page of ['index','resume','contact','visuals','platform']){
  const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8'));
  assert.doesNotMatch(dom.window.document.documentElement.textContent,/r[ée]sum[é]/i);
  if(page==='resume')assert.match(dom.window.document.querySelector('main').textContent,/Download PDF/);
  dom.window.close();
 }
});


test('homepage lab previews derive their measures from the actual engines',()=>{
 const ui=setup('index'),{w,doc}=ui,E=w.AtlasEngine,rows=E.select(E.parse('')),totals=E.summarize(rows),model=E.model('storage',150,rows);
 assert.equal(doc.querySelector('#preview-callers').textContent,String(model.affected.length));assert.equal(doc.querySelector('#preview-gateway').textContent,'+'+(150*model.weights.gateway).toFixed(1)+' ms');assert.equal(doc.querySelector('#preview-success').textContent,totals.success.toFixed(3)+'%');
 assert.equal(doc.querySelector('#preview-events').textContent,'2');assert.equal(doc.querySelector('#preview-accepted').textContent,'1');assert.equal(doc.querySelector('#preview-rejected').textContent,'1');assert.match(doc.querySelector('#preview-event-value').textContent,/129.00/);assert.equal(doc.querySelectorAll('.simulation-status').length,2);assert.deepEqual(ui.errors,[]);ui.close();
});
test('shared navigation exposes both labs and exactly one active page without leaking biography',()=>{
 for(const page of ['index','visuals','platform','resume','contact']){const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8')),doc=dom.window.document,nav=doc.querySelector('#main-navigation');
 assert.equal(nav.querySelectorAll('a').length,5);assert.equal(nav.querySelectorAll('[aria-current=page]').length,1);assert.equal(nav.querySelector('[aria-current=page]').getAttribute('href'),page+'.html');
 if(page!=='resume')assert.doesNotMatch(doc.body.textContent,/Hillsboro|Remote & hybrid|Treasury|Internal Revenue Service|16\+ years|Master of Business|Accounting|AZ-900|DP-900|AI-900/);dom.window.close();}
});

test('background leads with experience and places credentials last',()=>{
 const ui=setup('resume'),{doc}=ui;assert.deepEqual([...doc.querySelectorAll('.background-section h2')].map(x=>x.textContent),['Selected Technical Leadership & Experience','Technical Range','Business Perspective','Education','Microsoft Azure Credentials']);assert.equal(doc.querySelectorAll('.experience li').length,8);assert.match(doc.querySelector('.actions a').getAttribute('href'),/\.pdf$/);assert.equal(doc.querySelectorAll('.credential-list li').length,3);assert.deepEqual(ui.errors,[]);ui.close();
});

test('guided Atlas scenarios replace stale state and produce reproducible views and announcements',()=>{
 const ui=setup('visuals',{query:'?service=Identity&days=90&date=2026-10-08&delta=275&q=missing&journey=drift&event=396&order=selected'}),{w,doc}=ui;
 doc.querySelector('[data-atlas-scenario=slowdown]').click();let state=w.AtlasEngine.parse(w.location.search);assert.equal(state.days,7);assert.equal(state.service,'Storage');assert.equal(state.date,'2026-10-08');assert.equal(state.delta,0);assert.equal(doc.querySelector('#affected-count').textContent,'3');assert.equal(doc.querySelector('#latency').textContent,'276 ms');assert.equal(doc.querySelector('#service-search').value,'');assert.doesNotMatch(w.location.search,/order=selected|journey=drift/);assert.match(doc.querySelector('#atlas-scenario-status').textContent,/three callers/);
 doc.querySelector('[data-atlas-scenario=latency]').click();state=w.AtlasEngine.parse(w.location.search);assert.equal(state.service,'all');assert.equal(state.days,30);assert.equal(state.date,'');assert.equal(state.delta,150);assert.match(doc.querySelector('#scenario-insight').textContent,/104.3 ms/);assert.equal(doc.querySelectorAll('[data-atlas-scenario][aria-pressed=true]').length,1);
 doc.querySelector('[data-atlas-scenario=slo]').click();state=w.AtlasEngine.parse(w.location.search);assert.equal(state.metric,'errors');assert.equal(state.sort,'success');assert.equal(state.delta,0);assert.match(doc.querySelector('#budget-note').textContent,/error budget used/);assert.equal(doc.querySelector('#atlas-scenario-status').getAttribute('aria-live'),'polite');
 doc.querySelector('#scenario-reset').click();assert.equal(w.AtlasEngine.parse(w.location.search).metric,'requests');assert.equal(doc.querySelectorAll('[data-atlas-scenario][aria-pressed=true]').length,0);assert.equal(doc.querySelector('#journey-orders').textContent,'1,800');assert.deepEqual(ui.errors,[]);ui.close();
});
test('Atlas error descriptions are absent from static DOM until actual failure',()=>{
 const html=fs.readFileSync(path.join(root,'visuals.html'),'utf8'),dom=new JSDOM(html);assert.equal(dom.window.document.querySelector('#atlas-error').textContent,'');assert.equal(dom.window.document.querySelector('#journey-error').textContent,'');assert.doesNotMatch(html,/workspace could not initialize|demonstration could not initialize/);dom.window.close();
 const ui=setup('visuals');ui.w.AtlasEngine=undefined;ui.w.eval(fs.readFileSync(path.join(root,'atlas.js'),'utf8'));assert.equal(ui.doc.querySelector('#atlas-error').hidden,false);assert.match(ui.doc.querySelector('#atlas-error').textContent,/couldn’t start/);assert.ok(ui.doc.querySelector('#atlas-error a'));ui.close();
});

test('burst scenarios reconcile 100 events, support inspection and paging, and reset cleanly',()=>{
 const ui=setup('platform',{reduced:true}),{doc}=ui;doc.querySelector('[data-event-preset=burst]').click();assert.equal(doc.querySelector('#event-received').textContent,'100');assert.equal(doc.querySelector('#event-delivered').textContent,'80');assert.equal(doc.querySelector('#event-rejected').textContent,'10');assert.equal(doc.querySelector('#event-duplicates').textContent,'10');assert.equal(doc.querySelectorAll('[data-receipt]').length,10);assert.equal(doc.querySelectorAll('[data-dead-letter]').length,10);assert.match(doc.querySelector('#pipeline-status').textContent,/Batch complete/);assert.equal(doc.querySelector('#pipeline-status').getAttribute('aria-live'),'polite');
 doc.querySelector('[data-receipt="9"]').click();assert.equal(JSON.parse(doc.querySelector('#event-code').textContent).status,'duplicate');assert.equal(doc.querySelectorAll('[data-receipt][aria-pressed=true]').length,1);doc.querySelector('#event-next').click();assert.equal(doc.querySelector('#event-page').textContent,'11–20 of 100');assert.equal(doc.querySelector('#event-delivered').textContent,'80');doc.querySelector('[data-dead-letter="96"]').click();assert.equal(doc.querySelector('#event-page').textContent,'91–100 of 100');assert.match(doc.querySelector('#event-selection').textContent,/burst-096/);assert.equal(JSON.parse(doc.querySelector('#event-code').textContent).output,undefined);
 doc.querySelector('#run-pipeline').click();assert.equal(doc.querySelector('#event-received').textContent,'100');assert.equal(doc.querySelector('#event-page').textContent,'1–10 of 100');doc.querySelector('[data-event-preset=valid]').click();assert.equal(doc.querySelector('#event-received').textContent,'1');assert.equal(doc.querySelector('#event-rejected').textContent,'0');doc.querySelector('#event-reset').click();assert.equal(doc.querySelector('#event-received').textContent,'0');assert.equal(doc.querySelectorAll('[data-dead-letter]').length,0);assert.equal(doc.querySelectorAll('[data-receipt]').length,0);assert.equal(doc.querySelectorAll('[data-event-preset][aria-pressed=true]').length,0);assert.deepEqual(ui.errors,[]);assert.equal(ui.raf.size,0);ui.close();
});
test('background and event workspace have no WCAG semantic accessibility violations',async()=>{
 for(const page of ['resume','platform']){const ui=setup(page),{doc,w}=ui;if(page==='platform')doc.querySelector('[data-event-preset=burst]').click();w.eval(require('axe-core').source);const result=await w.axe.run(doc,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:{'color-contrast':{enabled:false}}});assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));ui.close();}
});
