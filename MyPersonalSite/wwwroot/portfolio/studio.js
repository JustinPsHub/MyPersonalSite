(()=>{
 'use strict';
 const studio=document.querySelector('.studio');
 if(!studio)return;
 const views={
  software:{label:'01 / APPLICATION ENGINEERING',tools:['C# / .NET','Blazor','APIs'],target:'visuals.html#journey',name:'Explore application engineering in the lab'},
  data:{label:'02 / DATA ARCHITECTURE',tools:['SQL','Data models','Power BI'],target:'visuals.html#journey',name:'Explore data architecture in the lab'},
  delivery:{label:'03 / CLOUD & DELIVERY',tools:['Azure','Integration','Observability'],target:'visuals.html#dependencies',name:'Explore cloud and delivery in the lab'}
 };
 const label=document.querySelector('#studio-label'),tech=document.querySelector('#studio-tech'),link=document.querySelector('#studio-deep-link');
 document.querySelectorAll('[data-perspective]').forEach(button=>button.addEventListener('click',()=>{
  const view=views[button.dataset.perspective];if(!view)return;
  label.textContent=view.label;tech.replaceChildren(...view.tools.map(tool=>{const chip=document.createElement('span');chip.textContent=tool;return chip}));
  link.href=view.target;link.setAttribute('aria-label',view.name);
 }));
 document.querySelectorAll('[data-lens]').forEach(node=>node.addEventListener('click',()=>document.querySelector(`[data-perspective="${node.dataset.lens}"]`).click()));
 // A small pointer light is event-driven; there is no persistent render loop.
 const pointer=matchMedia('(hover: hover) and (pointer: fine)'),motion=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0;
 studio.addEventListener('pointermove',event=>{
  if(!pointer.matches||motion.matches||frame)return;
  frame=requestAnimationFrame(()=>{frame=0;const bounds=studio.getBoundingClientRect();studio.style.setProperty('--light-x',`${Math.round((event.clientX-bounds.left)/bounds.width*100)}%`);studio.style.setProperty('--light-y',`${Math.round((event.clientY-bounds.top)/bounds.height*100)}%`)});
 });
 function clear(){if(frame)cancelAnimationFrame(frame);frame=0;studio.style.removeProperty('--light-x');studio.style.removeProperty('--light-y')}
 studio.addEventListener('pointerleave',clear);motion.addEventListener('change',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
})();
