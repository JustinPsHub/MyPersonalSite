// Apply saved preferences before the stylesheet paints; storage may be unavailable.
(()=>{try{const t=localStorage.getItem('jp-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch{}})();
