(()=>{
 'use strict';
 const one=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],engine=PortfolioEngine;
 document.documentElement.classList.add('enhanced');
 // Mobile navigation is a disclosure; links stay visible when JavaScript is unavailable.
 const navToggle=one('#nav-toggle'),nav=one('#main-navigation'),siteHeader=one('.header');
 function setNav(open,restoreFocus=false){if(!navToggle||!siteHeader)return;siteHeader.dataset.menuOpen=String(open);navToggle.setAttribute('aria-expanded',String(open));navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');one('#nav-toggle-label').textContent=open?'Close':'Menu';if(restoreFocus)navToggle.focus()}
 if(navToggle&&nav){setNav(false);navToggle.addEventListener('click',()=>setNav(navToggle.getAttribute('aria-expanded')!=='true'));nav.addEventListener('click',e=>{if(e.target.closest('a'))setNav(false)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navToggle.getAttribute('aria-expanded')==='true'){setNav(false,true);e.preventDefault()}});document.addEventListener('pointerdown',e=>{if(!siteHeader.contains(e.target))setNav(false)});matchMedia('(max-width: 760px)').addEventListener('change',()=>setNav(false))}

 if(one('#run-pipeline')){
  const sample={id:'demo-001',type:'order.created',totalCents:12900,currency:'USD'},stages=[
   {label:'RECEIVE',title:'Start with a clear contract.',description:'An event carries an ID and a typed payload. A predictable shape lets each service evolve independently.'},
   {label:'VALIDATE',title:'Build trust at the boundary.',description:'Validate the event type, required ID, currency, and amount before allowing data downstream. Invalid events are quarantined.'},
   {label:'TRANSFORM',title:'Give the data a useful shape.',description:'Convert integer cents into a reporting amount and map the payload to an explicit output contract.'},
   {label:'DELIVER',title:'Make a dependable handoff.',description:'Route the normalized result to an analytics destination. In a real system, delivery would also need idempotency, retries, and observability.'}
  ];let inputEvent={...sample},result=null,selected=0,running=false,runVersion=0,statuses=['Ready','Waiting','Waiting','Waiting'];
  const buttons=all('[data-stage]');
  function inspect(index){selected=index;const stage=stages[index];buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(index===i)));one('#stage-label').textContent=`0${index+1} / ${stage.label}`;one('#stage-title').textContent=stage.title;one('#stage-description').textContent=stage.description;let payload=inputEvent,caption='INPUT / JSON';if(index===1&&result){payload=result.ok?{valid:true,errors:[]}: {valid:false,errors:result.errors};caption='VALIDATION / JSON'}if(index>=2&&result){payload=result.ok?result.output:{status:'quarantined',errors:result.errors};caption=result.ok?'OUTPUT / JSON':'QUARANTINE / JSON'}one('#code-caption').textContent=caption;one('#event-code').textContent=JSON.stringify(payload,null,2)}
  function showStatuses(){buttons.forEach((b,i)=>{b.querySelector('.step-state').textContent=statuses[i];b.dataset.status=statuses[i].toLowerCase()})}
  buttons.forEach((b,i)=>b.addEventListener('click',()=>inspect(i)));
  one('#event-scenario').addEventListener('change',e=>{if(running)return;inputEvent={...sample,totalCents:e.target.value==='invalid'?-12900:12900};result=null;statuses=['Ready','Waiting','Waiting','Waiting'];showStatuses();inspect(0);one('#pipeline-status').textContent='Scenario ready. Run the event to inspect the result.'});
  one('#run-pipeline').addEventListener('click',()=>{if(running)return;running=true;const version=++runVersion;const run=one('#run-pipeline'),scenario=one('#event-scenario');run.disabled=scenario.disabled=true;run.textContent='Processing…';result=null;statuses=['Waiting','Waiting','Waiting','Waiting'];one('#pipeline-status').textContent='Processing the sample event…';
   try{for(let i=0;i<4;i++){if(version!==runVersion)return;statuses[i]='Active';showStatuses();inspect(i);if(i===1){result=engine.processEvent(inputEvent);if(!result.ok){statuses[1]='Rejected';statuses[2]=statuses[3]='Skipped';showStatuses();inspect(1);one('#pipeline-status').textContent='Event quarantined. Invalid data never reached transform or delivery.';return}}statuses[i]='Complete';showStatuses()}inspect(3);one('#pipeline-status').textContent='Event delivered. All four stages completed successfully.'}
   finally{running=false;run.disabled=scenario.disabled=false;run.textContent='Run again ↗'}
  });inspect(0);
 }
})();
