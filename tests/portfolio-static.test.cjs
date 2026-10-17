const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'artifacts/static-site');

test('static release preserves page links, fonts, downloads, and route targets without publishing server files',()=>{
  execFileSync(process.execPath,[path.join(root,'scripts/build-static.mjs')]);
  const config=JSON.parse(fs.readFileSync(path.join(output,'staticwebapp.config.json'),'utf8'));
  for(const route of config.routes.filter(r=>r.rewrite)) assert.ok(fs.existsSync(path.join(output,route.rewrite)),route.route);
  for(const page of ['index','visuals','platform','resume']){
    const dom=new JSDOM(fs.readFileSync(path.join(output,page+'.html'),'utf8'));
    for(const element of dom.window.document.querySelectorAll('[href],[src]')){
      const value=element.getAttribute('href')||element.getAttribute('src');
      if(!value||value.startsWith('#')||/^[a-z]+:/i.test(value))continue;
      const url=new URL(value,'https://example.com/'+page+'.html');
      assert.ok(fs.existsSync(path.join(output,decodeURIComponent(url.pathname))),`${page}: ${value}`);
    }
    dom.window.close();
  }
  const css=fs.readFileSync(path.join(output,'portfolio/style.css'),'utf8');
  for(const [,value] of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)){
    const url=new URL(value,'https://example.com/portfolio/style.css');
    assert.ok(fs.existsSync(path.join(output,url.pathname)),value);
  }
  assert.equal(config.navigationFallback,undefined,'Missing files must remain 404s');
  assert.ok(config.globalHeaders['Content-Security-Policy'].includes("script-src 'self'"));
  assert.deepEqual(fs.readdirSync(output).sort(),['index.html','platform.html','portfolio','resume','resume.html','robots.txt','sitemap.xml','staticwebapp.config.json','visuals.html']);
});
