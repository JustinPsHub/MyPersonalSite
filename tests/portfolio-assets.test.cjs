const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {gzipSync}=require('node:zlib');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../MyPersonalSite/wwwroot/portfolio');
test('runtime remains self-hosted and inside the compressed asset budget',()=>{const scripts=['preferences.js','engine.js','app.js','modern.js','contact.js'];const scriptBytes=scripts.reduce((sum,file)=>sum+gzipSync(fs.readFileSync(path.join(root,file))).length,0);assert.ok(scriptBytes<8*1024,`${scriptBytes} compressed script bytes`);const styleBytes=gzipSync(fs.readFileSync(path.join(root,'style.css'))).length;assert.ok(styleBytes<7*1024,`${styleBytes} compressed stylesheet bytes`);for(const page of ['index','visuals','platform','resume']){const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8'));for(const el of dom.window.document.querySelectorAll('script[src],link[rel="stylesheet"]')){const url=new URL(el.getAttribute('src')||el.getAttribute('href'),'https://www.justinraypalmer.com');assert.equal(url.origin,'https://www.justinraypalmer.com');assert.ok(fs.existsSync(path.join(root,path.basename(url.pathname))))}dom.window.close()}});
test('the main content and navigation do not depend on JavaScript',()=>{for(const page of ['index','visuals','platform','resume']){const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8'));const doc=dom.window.document;assert.equal(doc.querySelectorAll('nav[aria-label="Main navigation"] a').length,5);assert.ok(doc.querySelector('h1').textContent.trim());assert.ok(doc.querySelector('main p').textContent.trim());if(page==='index')assert.equal(doc.querySelectorAll('.expertise-row').length,3);dom.window.close()}});

test('Atlas workspace assets stay isolated while the pure engine powers the homepage preview',()=>{
 const scripts=['atlas.js','atlas-engine.js'];const bytes=scripts.reduce((sum,file)=>sum+gzipSync(fs.readFileSync(path.join(root,file))).length,0);assert.ok(bytes<12*1024,`${bytes} compressed Atlas script bytes`);const styles=gzipSync(fs.readFileSync(path.join(root,'atlas.css'))).length;assert.ok(styles<9*1024,`${styles} compressed Atlas stylesheet bytes`);
 for(const page of ['resume','contact','platform']){const html=fs.readFileSync(path.join(root,page+'.html'),'utf8');assert.doesNotMatch(html,/atlas\.(js|css)|atlas-engine\.js/)}
});

test('Atlas light and dark text and chart tokens meet their contrast thresholds',()=>{
 const css=fs.readFileSync(path.join(root,'atlas.css'),'utf8');
 function luminance(hex){return (hex.length===3?hex.split('').map(c=>c+c).join(''):hex).match(/[a-f0-9]{2}/gi).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
 for(const rule of [css.match(/\.atlas-page\s*\{([^}]+)/)[1],css.match(/\[data-theme="?dark"?\] \.atlas-page\s*\{([^}]+)/)[1]]){
  const colors=Object.fromEntries([...rule.matchAll(/--([\w-]+):\s*#([0-9a-f]{3,6})/g)].map(m=>[m[1],m[2]]));
  for(const [fg,bg,min] of [['ink','surface',4.5],['muted','surface',4.5],['warning','warning-soft',4.5],['chart','surface',3],['compare','surface',3]])assert.ok(contrast(colors[fg],colors[bg])>=min,`${fg} on ${bg}`);
 }
});


test('journey enhancements remain isolated to Atlas and within their compressed budget',()=>{
 const scripts=['journey.js','journey-engine.js'];const bytes=scripts.reduce((sum,file)=>sum+gzipSync(fs.readFileSync(path.join(root,file))).length,0);assert.ok(bytes<10*1024,`${bytes} compressed journey script bytes`);
 assert.ok(gzipSync(fs.readFileSync(path.join(root,'journey.css'))).length<6*1024);
 for(const page of ['index','resume','contact','platform'])assert.doesNotMatch(fs.readFileSync(path.join(root,page+'.html'),'utf8'),/journey\.(js|css)|journey-engine\.js/);
});

test('Systems Studio stays isolated, self-hosted and within its compressed budget',()=>{
 const z=file=>gzipSync(fs.readFileSync(path.join(root,file))).length;
 assert.ok(z('studio.js')<2*1024);assert.ok(z('studio.css')<6*1024);
 for(const page of ['visuals','platform','resume','contact'])assert.doesNotMatch(fs.readFileSync(path.join(root,page+'.html'),'utf8'),/studio\.(css|js)/);
});

test('event workspace and preview enhancements retain bounded self-hosted assets',()=>{
 const size=file=>gzipSync(fs.readFileSync(path.join(root,file))).length;assert.ok(size('event-lab.js')<5*1024);assert.ok(size('lab-previews.js')<2*1024);assert.ok(size('product.css')<8*1024);
 for(const page of ['index','resume','contact','visuals'])assert.doesNotMatch(fs.readFileSync(path.join(root,page+'.html'),'utf8'),/event-lab\.js/);
});

test('shared light and dark text tokens remain readable on every new surface',()=>{
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');const rules=[css.match(/:root\{([^}]+)/)[1],css.match(/:root\[data-theme=dark\]\{([^}]+)/)[1]];
 const lum=h=>h.match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 for(const rule of rules){const c=Object.fromEntries([...rule.matchAll(/--([\w-]+):#([a-f0-9]{3,6})/g)].map(m=>[m[1],m[2].length===3?m[2].split('').map(x=>x+x).join(''):m[2]]));for(const fg of ['ink','muted','accent'])for(const bg of ['bg','surface','soft']){const a=lum(c[fg]),b=lum(c[bg]);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' on '+bg);}}
});
