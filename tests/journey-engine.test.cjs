const {test}=require('node:test');
const assert=require('node:assert/strict');
const J=require('../MyPersonalSite/wwwroot/portfolio/journey-engine.js');
const E=require('../MyPersonalSite/wwwroot/portfolio/atlas-engine.js');
test('all event scenarios reconcile and sum only accepted integer amounts',()=>{
 for(const key of Object.keys(J.scenarios)){
  const r=J.run(key);
  assert.equal(r.received,r.accepted+r.quarantine+r.duplicate);
  assert.equal(r.records.length,12);
  assert.equal(r.totalCents,r.records.filter(x=>x.status==='accepted').reduce((sum,x)=>sum+x.event.totalCents,0));
  assert.ok(Number.isSafeInteger(r.totalCents));
  assert.equal(r.records.filter(x=>x.output).length,r.accepted);
  assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.records));
 }
 assert.equal(J.run('clean').totalCents,172900);
});
test('schema drift quarantines type, currency and negative value violations',()=>{
 const r=J.run('drift');assert.equal(r.accepted,9);assert.equal(r.quarantine,3);assert.equal(r.duplicate,0);assert.equal(r.totalCents,134050);
 for(const x of r.records.filter(x=>x.status==='quarantined')){assert.equal(x.output,null);assert.ok(x.reasons.length>0);}
 assert.match(r.records[3].reasons.join(' '),/safe integer/);
 assert.match(r.records[7].reasons.join(' '),/USD/);
});
test('retries retain first valid IDs and never double count replayed orders',()=>{
 const r=J.run('retry');assert.equal(r.accepted,10);assert.equal(r.duplicate,2);assert.equal(r.quarantine,0);assert.equal(r.totalCents,135600);
 assert.equal(new Set(r.records.filter(x=>x.status==='accepted').map(x=>x.event.id)).size,10);
 assert.equal(r.records[10].status,'duplicate');assert.deepEqual(J.run('retry'),r);
});
test('journey URL inputs are bounded and unknown scenarios fall back safely',()=>{
 assert.deepEqual(J.parse('?journey=<script>&stage=Infinity&event=-7'),{key:'clean',stage:4,selected:0});
 assert.deepEqual(J.parse('?journey=drift&stage=2&event=11'),{key:'drift',stage:2,selected:11});
 assert.deepEqual(J.parse('?journey=retry&stage=999&event=1.5'),{key:'retry',stage:4,selected:0});
 assert.deepEqual(J.run('__proto__'),J.run('clean'));
});
test('reliability matrix preserves exact daily records, complete services and incident signal',()=>{
 for(const days of [7,30,90]){
  const rows=E.select(E.parse('?days='+days),{allServices:true,ignoreDate:true}),m=J.matrix(rows);
  assert.equal(m.dates.length,Math.min(14,days));assert.equal(m.cells.length,m.dates.length*5);
  assert.equal(m.dates.at(-1),'2026-10-14');
  const cell=m.cells.find(c=>c.id==='storage'&&c.date==='2026-10-08');assert.equal(cell.errors,642);assert.ok(cell.budget>5);
  assert.equal(m.cells.filter(c=>c.id==='observe'&&c.budget>1).length,0);
 }
});
