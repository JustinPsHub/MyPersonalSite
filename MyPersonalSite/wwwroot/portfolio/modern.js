(()=>{
 'use strict';
 const one=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],engine=PortfolioEngine;
 document.documentElement.classList.add('enhanced');
 // A sticky, quiet navigation bar and a passive reading-progress indicator.
 let scrollFrame=0;
 function readProgress(){scrollFrame=0;const distance=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--read-progress',distance>0?`${scrollY/distance*100}%`:'0%')}
 addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(readProgress)},{passive:true});addEventListener('resize',readProgress);readProgress();
 // Short, one-time entrance transitions. Content stays visible if JavaScript fails.
 if('IntersectionObserver' in window&&!reduced.matches){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target)}})},{threshold:.08});all('.section-head,.project,.principle-list article,.pipeline-demo,.lab-grid,.process-grid article').forEach(el=>{el.classList.add('reveal');observer.observe(el)});document.addEventListener('motionchange',()=>{if(paused)all('.reveal').forEach(el=>el.classList.add('revealed'))})}
 // A native dialog supplies focus containment and Escape behavior without a framework.
 const menu=one('#command-menu'),input=one('#command-input'),results=one('#command-results');
 const commands=[
  {title:'Overview',detail:'Software, data, and selected work',href:'/index.html',keywords:'home portfolio'},
  {title:'Interactive lab',detail:'Explore platform signals and export data',href:'/visuals.html',keywords:'dashboard charts analytics csv'},
  {title:'Engineering playground',detail:'Run an event through a working pipeline',href:'/index.html#playground',keywords:'demo events validation animation'},
  {title:'Architecture approach',detail:'Explore the layers of a dependable platform',href:'/platform.html',keywords:'azure cloud api data design'},
  {title:'Résumé',detail:'Experience, credentials, and downloads',href:'/resume.html',keywords:'resume experience jobs cv'},
  {title:'Software & AI case study',detail:'A Blazor portal with retrieved audit context',href:'/index.html#ai-project',keywords:'openai rag blazor project'},
  {title:'Azure platform engineering',detail:'Architecture, .NET APIs, secure access, and automation',href:'/index.html#data-project',keywords:'synapse sql warehouse functions security project'},
  {title:'Governed analytics case study',detail:'25 fact tables and 90 dimensions',href:'/index.html#analytics-project',keywords:'power bi dax model project'},
  {title:'Copy email address',detail:'justinraypalmer@gmail.com',action:async()=>{try{await navigator.clipboard.writeText('justinraypalmer@gmail.com');toast('Email address copied.')}catch{toast('Email: justinraypalmer@gmail.com')}},keywords:'contact talk'},
  {title:'Switch color theme',detail:'Choose a light or dark appearance',action:()=>one('#theme').click(),keywords:'dark light mode'},
  {title:'Toggle animation',detail:'Pause or resume decorative motion',action:()=>one('#motion').click(),keywords:'motion accessibility reduce'}
 ];
 function renderCommands(){const query=input.value.trim().toLowerCase();const matches=commands.filter(c=>`${c.title} ${c.detail} ${c.keywords}`.toLowerCase().includes(query));results.replaceChildren();for(const c of matches){const item=document.createElement(c.href?'a':'button');item.className='command-result';if(c.href)item.href=c.href;const title=document.createElement('strong'),detail=document.createElement('span'),arrow=document.createElement('i');title.textContent=c.title;detail.textContent=c.detail;arrow.textContent=c.href?'↗':'↵';item.append(title,detail,arrow);if(c.action)item.addEventListener('click',()=>{menu.close();c.action()});results.append(item)}if(!matches.length){const empty=document.createElement('p');empty.className='command-empty';empty.textContent='No matches. Try “lab”, “résumé”, or “theme”.';results.append(empty)}one('#command-count').textContent=`${matches.length} results`;}
 function openCommands(){input.value='';renderCommands();if(!menu.open)menu.showModal();input.focus()}
 all('.search-trigger').forEach(b=>{b.addEventListener('click',openCommands);const k=b.querySelector('kbd');if(!/Mac|iPhone|iPad/.test(navigator.platform))k.textContent='Ctrl K'});
 one('.command-close').addEventListener('click',()=>menu.close());input.addEventListener('input',renderCommands);
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('a,button')?.focus()}if(e.key==='Enter'){e.preventDefault();results.querySelector('a,button')?.click()}});
 results.addEventListener('keydown',e=>{const items=[...results.querySelectorAll('a,button')],index=items.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const next=index+(e.key==='ArrowDown'?1:-1);if(next<0)input.focus();else items[Math.min(next,items.length-1)]?.focus()}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){e.preventDefault();menu.close();return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(menu.open)menu.close();else openCommands()}});
 menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)menu.close()}});
 // The capability lens changes only the selected explanation; every case stays visible.
 const roleButtons=all('[data-role]'),rolePanels=all('[data-role-panel]');
 function selectRole(key){
  if(!rolePanels.some(p=>p.dataset.rolePanel===key))return;
  roleButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===key)));
  rolePanels.forEach(p=>{const active=p.dataset.rolePanel===key;p.hidden=!active;p.classList.toggle('role-enter',active&&!paused&&!reduced.matches)});
 }
 if(rolePanels.length){selectRole('software');roleButtons.forEach(b=>b.addEventListener('click',()=>selectRole(b.dataset.role)))}
 // Morphing Canvas geometry. One animation loop, capped DPR and ~30 fps.
 // It owns no RAF while paused, hidden, or outside the viewport.
 const canvas=one('#data-art');
 if(canvas){const ctx=canvas.getContext('2d');if(ctx){
  one('.sculpture-fallback').hidden=true;
  let width=1,height=1,raf=0,last=0,time=0,visible=true,shape='network',mix=1;
  const count=matchMedia('(pointer: coarse)').matches?108:192,points=Array.from({length:count},(_,i)=>({...engine.pointForShape('network',i,count),px:0,py:0,depth:0}));
  let from=points.map(p=>({x:p.x,y:p.y,z:p.z}));const pointer={x:0,y:0,tx:0,ty:0};
  const canAnimate=()=>!paused&&!reduced.matches&&!document.hidden&&visible;
  function draw(now,animate){const dt=last?Math.min(now-last,64):32;last=now;if(animate){time+=dt*.00025;mix=Math.min(1,mix+dt/720);pointer.x+=(pointer.tx-pointer.x)*.08;pointer.y+=(pointer.ty-pointer.y)*.08}else{mix=1;pointer.x=pointer.tx;pointer.y=pointer.ty}
   ctx.clearRect(0,0,width,height);const scale=Math.min(width/440,height/480),ease=1-Math.pow(1-mix,3),angle=.25+Math.sin(time*.35)*.2+pointer.x*.4,tilt=-.22+pointer.y*.2,ca=Math.cos(angle),sa=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt);
   for(let i=0;i<count;i++){const p=points[i],goal=engine.pointForShape(shape,i,count,time),a=from[i];p.x=a.x+(goal.x-a.x)*ease;p.y=a.y+(goal.y-a.y)*ease;p.z=a.z+(goal.z-a.z)*ease;const rx=p.x*ca-p.z*sa,rz=p.x*sa+p.z*ca;p.px=width*.5+rx*scale;p.py=height*.49+(p.y*ct+rz*st)*scale;p.depth=rz*ct-p.y*st;}
   // Only connect geometric neighbors; a fixed distance cutoff keeps the sphere airy.
   ctx.lineWidth=.65;const limit=shape==='flow'?40:shape==='insight'?27:43;
   for(let i=0;i<count;i++){const p=points[i];for(let j=i+1;j<count;j++){const q=points[j],dx=p.x-q.x,dy=p.y-q.y,dz=p.z-q.z,d2=dx*dx+dy*dy+dz*dz;if(d2<limit*limit){const alpha=.12+(1-Math.sqrt(d2)/limit)*.28;ctx.strokeStyle=`rgba(177,223,157,${alpha})`;ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(q.px,q.py);ctx.stroke()}}}
   for(let i=0;i<count;i++){const p=points[i],active=i%19===0,alpha=.28+(p.depth+170)/400;ctx.fillStyle=active?'#e4f6bd':`rgba(163,212,145,${Math.min(alpha,1)})`;ctx.beginPath();ctx.arc(p.px,p.py,(active?3:1.6)*scale,0,Math.PI*2);ctx.fill();if(active){ctx.strokeStyle='#d2f4aa30';ctx.beginPath();ctx.arc(p.px,p.py,7*scale,0,Math.PI*2);ctx.stroke()}}
  }
  function tick(now){raf=0;if(!canAnimate())return;if(now-last>=32)draw(now,true);raf=requestAnimationFrame(tick)}
  function schedule(){if(!canAnimate()){if(raf)cancelAnimationFrame(raf);raf=0;last=0;draw(performance.now(),false)}else if(!raf){last=0;raf=requestAnimationFrame(tick)}}
  function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw(performance.now(),false);schedule()}
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);else addEventListener('resize',resize);
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule()}).observe(canvas);
  document.addEventListener('visibilitychange',schedule);document.addEventListener('motionchange',schedule);
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointer.tx=(e.clientX-r.left)/r.width-.5;pointer.ty=(e.clientY-r.top)/r.height-.5;if(paused)schedule()},{passive:true});canvas.addEventListener('pointerleave',()=>{pointer.tx=pointer.ty=0;if(paused)schedule()});
  all('[data-shape]').forEach((button,index)=>button.addEventListener('click',()=>{from=points.map(p=>({x:p.x,y:p.y,z:p.z}));mix=0;shape=button.dataset.shape;all('[data-shape]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));one('.art-number').textContent=`0${index+1} / 03`;one('#art-description').textContent={network:'Independent nodes. Connected possibilities.',flow:'Ideas in motion. Clear paths through complexity.',insight:'A common structure. A clearer perspective.'}[shape];schedule()}));resize();
 }}
 // A bounded event simulation with real validation and inspectable outputs.
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
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  one('#run-pipeline').addEventListener('click',async()=>{if(running)return;running=true;const version=++runVersion;const run=one('#run-pipeline'),scenario=one('#event-scenario');run.disabled=scenario.disabled=true;run.textContent='Processing…';result=null;statuses=['Waiting','Waiting','Waiting','Waiting'];one('#pipeline-status').textContent='Processing the sample event…';
   try{for(let i=0;i<4;i++){if(version!==runVersion)return;statuses[i]='Active';showStatuses();inspect(i);if(!paused&&!reduced.matches&&!document.hidden)await wait(650);if(i===1){result=engine.processEvent(inputEvent);if(!result.ok){statuses[1]='Rejected';statuses[2]=statuses[3]='Skipped';showStatuses();inspect(1);one('#pipeline-status').textContent='Event quarantined. Invalid data never reached transform or delivery.';return}}statuses[i]='Complete';showStatuses()}inspect(3);one('#pipeline-status').textContent='Event delivered. All four stages completed successfully.'}
   finally{running=false;run.disabled=scenario.disabled=false;run.textContent='Run again ↗'}
  });inspect(0);
 }
})();
