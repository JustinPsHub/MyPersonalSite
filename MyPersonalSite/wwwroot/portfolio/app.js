'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const storage = {get(key){try{return localStorage.getItem(key)}catch{return null}},set(key,value){try{localStorage.setItem(key,value)}catch{}}};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const savedTheme = storage.get('jp-theme');
if(savedTheme) document.documentElement.dataset.theme=savedTheme;
function isDark(){return document.documentElement.dataset.theme==='dark'}
function syncThemeControl(){const label='Switch to '+(isDark()?'light':'dark')+' theme';$('#theme').setAttribute('aria-label',label);$('#theme').title=label;$('#theme').textContent=isDark()?'☼':'◐'}
syncThemeControl();
$('#theme').addEventListener('click',()=>{document.documentElement.dataset.theme=isDark()?'light':'dark';storage.set('jp-theme',document.documentElement.dataset.theme);syncThemeControl();document.dispatchEvent(new Event('themechange'));if(typeof renderDashboard==='function'&&$('#volume-chart'))renderDashboard()});
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500)}
$('#copy-email')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('justinraypalmer@gmail.com');toast('Email address copied.')}catch{toast('Email: justinraypalmer@gmail.com')}});
$('#print-resume')?.addEventListener('click',()=>window.print());
// Pure data functions share one deterministic dataset across every dashboard view.
function makeData(){const names=['Data Platform','API Gateway','Identity','Observability','Storage'];return Array.from({length:90},(_,day)=>names.map((name,index)=>{const noise=Math.sin(day*1.39+index*2.1);const requests=Math.round((6200-index*850)*(1+day*.003)+noise*600);const errors=Math.max(1,Math.round(requests*(.0003+index*.00009+Math.abs(noise)*.0005)));return {day,date:new Date(Date.UTC(2026,6,17+day)).toISOString().slice(0,10),name,requests,errors,latency:Math.round(75+index*19+(noise+1)*18),deployments:(day+index*2)%4===0?1+(day%3):0}})).flat()}
const dataset=$('#volume-chart')?makeData():[];let state=PortfolioEngine.dashboardState(location.search);
function selectedRows(data=dataset,filters=state){return data.filter(r=>r.day>=90-filters.days&&(filters.service==='all'||r.name===filters.service))}
function summarize(rows){const requests=rows.reduce((a,r)=>a+r.requests,0);const errors=rows.reduce((a,r)=>a+r.errors,0);return {requests,errors,success:requests?(1-errors/requests)*100:0,latency:requests?rows.reduce((a,r)=>a+r.latency*r.requests,0)/requests:0,deployments:rows.reduce((a,r)=>a+r.deployments,0)}}
const number = n=>Math.round(n).toLocaleString('en-US');
function groupServices(rows){return [...new Set(rows.map(r=>r.name))].map(name=>({name,...summarize(rows.filter(r=>r.name===name))}))}
function drawVolume(rows){
 const daily=[...new Set(rows.map(r=>r.date))].map(date=>{const summary=summarize(rows.filter(r=>r.date===date));return {date,value:summary[state.metric]}});
 const label={requests:'Daily requests',latency:'Average latency',errors:'Failed requests'}[state.metric],unit=state.metric==='latency'?' ms':'';
 const w=Math.max(220,Math.min(700,Math.round($('#volume-chart').getBoundingClientRect().width)||600)),h=250,left=54,right=16,top=18,bottom=38,peak=Math.max(...daily.map(r=>r.value));
 const step=state.metric==='requests'?5000:state.metric==='latency'?50:10,max=Math.max(step,Math.ceil(peak/step)*step);
 const x=i=>left+i/Math.max(daily.length-1,1)*(w-left-right),y=n=>h-bottom-n/max*(h-top-bottom);
 const ink=isDark()?'#b5c8b8':'#5e7162',line=isDark()?'#344b40':'#e8ede5';
 const coords=daily.map((r,i)=>`${x(i).toFixed(1)},${y(r.value).toFixed(1)}`).join(' ');
 const format=n=>state.metric==='requests'?(n/1000).toFixed(n%1000?1:0)+'k':Math.round(n)+unit;
 const grid=[0,.25,.5,.75,1].map(t=>`<line x1="${left}" x2="${w-right}" y1="${y(t*max)}" y2="${y(t*max)}" stroke="${line}"/><text x="${left-10}" y="${y(t*max)+3}" text-anchor="end" fill="${ink}" font-size="12">${format(t*max)}</text>`).join('');
 const markers=daily.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.value)}" r="${state.days===7?4:2}" fill="#648c5b"><title>${r.date}: ${number(r.value)}${unit}</title></circle>`).join('');
 const ticks=[0,Math.floor((daily.length-1)/2),daily.length-1].map(i=>`<text x="${x(i)}" y="${h-7}" text-anchor="${i===0?'start':i===daily.length-1?'end':'middle'}" fill="${ink}" font-size="12">${daily[i].date.slice(5).replace('-','/')}</text>`).join('');
 $('#metric-title').textContent={requests:'Request volume',latency:'Response time',errors:'Failed requests'}[state.metric];
 $('#volume-chart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="chart-title chart-desc"><title id="chart-title">${label}</title><desc id="chart-desc">${daily.length} days, ${daily[0].date} through ${daily.at(-1).date}. Daily values are available in the CSV export; service totals are in the table below.</desc><defs><linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#91b67e" stop-opacity=".3"/><stop offset="1" stop-color="#91b67e" stop-opacity=".015"/></linearGradient></defs>${grid}<polygon points="${left},${h-bottom} ${coords} ${w-right},${h-bottom}" fill="url(#chart-area)"/><polyline points="${coords}" fill="none" stroke="#648c5b" stroke-width="2.5" stroke-linejoin="round"/>${markers}${ticks}</svg>`;
 $('#chart-summary').textContent=`${daily[0].date} → ${daily.at(-1).date} · Peak: ${number(peak)}${unit} ${state.metric==='requests'?'requests / day':state.metric==='errors'?'failed requests / day':'average latency'}`;
}
function syncDashboardControls(){ $('#service').value=state.service;$('#sort').value=state.sort;$('#chart-metric').value=state.metric;$$('[data-days]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.days)===state.days)))}
function updateDashboard(){const q=new URLSearchParams({service:state.service,days:state.days,sort:state.sort,metric:state.metric});history.replaceState(null,'',location.pathname+'?'+q);renderDashboard()}
function renderDashboard(){const rows=selectedRows();const total=summarize(rows);$('#requests').textContent=number(total.requests);$('#success').textContent=total.success.toFixed(2)+'%';$('#latency').textContent=number(total.latency)+' ms';$('#deployments').textContent=number(total.deployments);drawVolume(rows);const groups=groupServices(rows);$('#service-bars').innerHTML=[...groups].sort((a,b)=>b.requests-a.requests).map(g=>`<div class="bar-row"><div class="bar-label"><span>${g.name}</span><span>${(g.requests/total.requests*100).toFixed(1)}%</span></div><div class="bar-track"><div class="bar-fill" style="width:${g.requests/total.requests*100}%"></div></div></div>`).join('');groups.sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name):state.sort==='success'?b.success-a.success:b.requests-a.requests);$('#service-table').innerHTML=groups.map(g=>`<tr role="row"><th scope="row" role="rowheader">${g.name}</th><td role="cell" data-label="Requests">${number(g.requests)}</td><td role="cell" data-label="Success">${g.success.toFixed(2)}%</td><td role="cell" data-label="Avg. latency">${number(g.latency)} ms</td><td role="cell" data-label="Deployments">${g.deployments}</td></tr>`).join('')}
if($('#volume-chart')){
 syncDashboardControls();renderDashboard();
 let chartWidth=0;const resizeChart=()=>{const width=Math.round($('#volume-chart').getBoundingClientRect().width);if(width>0&&width!==chartWidth){chartWidth=width;drawVolume(selectedRows())}};
 if('ResizeObserver' in window)new ResizeObserver(resizeChart).observe($('#volume-chart'));else window.addEventListener('resize',resizeChart);
 for(const [id,key] of [['service','service'],['sort','sort'],['chart-metric','metric']])$('#'+id).addEventListener('change',e=>{state[key]=e.target.value;updateDashboard()});
 $$('[data-days]').forEach(button=>button.addEventListener('click',()=>{state.days=Number(button.dataset.days);syncDashboardControls();updateDashboard()}));
 $('#reset-filters').addEventListener('click',()=>{state=PortfolioEngine.dashboardState('');syncDashboardControls();updateDashboard();toast('Filters reset.')});
 window.addEventListener('popstate',()=>{state=PortfolioEngine.dashboardState(location.search);syncDashboardControls();renderDashboard()});
 $('#share-view').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Link to this filtered view copied.')}catch{toast('Copy this page’s address to share the current view.')}});
 $('#export-data').addEventListener('click',()=>{const rows=selectedRows();const csv=['date,service,requests,failed_requests,average_latency_ms,deployments',...rows.map(r=>[r.date,r.name,r.requests,r.errors,r.latency,r.deployments].join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='justin-palmer-demo-'+state.days+'days.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Filtered demo data exported.')});
}
