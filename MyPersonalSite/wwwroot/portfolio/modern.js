(()=>{
 'use strict';
 const one=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],engine=PortfolioEngine;
 document.documentElement.classList.add('enhanced');
 // Mobile navigation is a disclosure; links stay visible when JavaScript is unavailable.
 const navToggle=one('#nav-toggle'),nav=one('#main-navigation'),siteHeader=one('.header');
 function setNav(open,restoreFocus=false){if(!navToggle||!siteHeader)return;siteHeader.dataset.menuOpen=String(open);navToggle.setAttribute('aria-expanded',String(open));navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');one('#nav-toggle-label').textContent=open?'Close':'Menu';if(restoreFocus)navToggle.focus()}
 if(navToggle&&nav){setNav(false);navToggle.addEventListener('click',()=>setNav(navToggle.getAttribute('aria-expanded')!=='true'));nav.addEventListener('click',e=>{if(e.target.closest('a'))setNav(false)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navToggle.getAttribute('aria-expanded')==='true'){setNav(false,true);e.preventDefault()}});document.addEventListener('pointerdown',e=>{if(!siteHeader.contains(e.target))setNav(false)});matchMedia('(max-width: 900px)').addEventListener('change',()=>setNav(false))}

 const system=one('.system-figure');
 if(system){
  const perspectives={software:['01','Clear interfaces. Dependable software.'],data:['02','Connected data. Confident decisions.'],delivery:['03','Considered architecture. Reliable delivery.']};
  all('[data-perspective]').forEach(button=>button.addEventListener('click',()=>{
   const key=button.dataset.perspective,content=perspectives[key];
   if(!content)return;
   system.dataset.system=key;
   all('[data-perspective]').forEach(control=>control.setAttribute('aria-pressed',String(control===button)));
   one('.system-index').textContent=content[0]+' / 03';
   one('#system-caption').textContent=content[1];
  }));
 }

})();
