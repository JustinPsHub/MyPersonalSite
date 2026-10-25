const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {gzipSync}=require('node:zlib');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'../MyPersonalSite/wwwroot/portfolio');
test('runtime remains self-hosted and inside the compressed asset budget',()=>{const scripts=['preferences.js','engine.js','app.js','modern.js'];const scriptBytes=scripts.reduce((sum,file)=>sum+gzipSync(fs.readFileSync(path.join(root,file))).length,0);assert.ok(scriptBytes<8*1024,`${scriptBytes} compressed script bytes`);const styleBytes=gzipSync(fs.readFileSync(path.join(root,'style.css'))).length;assert.ok(styleBytes<7*1024,`${styleBytes} compressed stylesheet bytes`);for(const page of ['index','visuals','platform','resume']){const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8'));for(const el of dom.window.document.querySelectorAll('script[src],link[rel="stylesheet"]')){const url=new URL(el.getAttribute('src')||el.getAttribute('href'),'https://www.justinraypalmer.com');assert.equal(url.origin,'https://www.justinraypalmer.com');assert.ok(fs.existsSync(path.join(root,path.basename(url.pathname))))}dom.window.close()}});
test('the main content and navigation do not depend on JavaScript',()=>{for(const page of ['index','visuals','platform','resume']){const dom=new JSDOM(fs.readFileSync(path.join(root,page+'.html'),'utf8'));const doc=dom.window.document;assert.equal(doc.querySelectorAll('nav[aria-label="Main navigation"] a').length,4);assert.ok(doc.querySelector('h1').textContent.trim());assert.ok(doc.querySelector('main').textContent.length>1000);if(page==='index')assert.equal(doc.querySelectorAll('.case-study').length,3);dom.window.close()}});
