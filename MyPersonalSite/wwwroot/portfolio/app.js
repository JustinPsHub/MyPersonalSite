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
$('#theme').addEventListener('click',()=>{document.documentElement.dataset.theme=isDark()?'light':'dark';storage.set('jp-theme',document.documentElement.dataset.theme);syncThemeControl();document.dispatchEvent(new Event('themechange'))});
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500)}
$('#print-resume')?.addEventListener('click',()=>window.print());
