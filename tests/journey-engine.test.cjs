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

test('order scopes follow the exact service, reporting window and selected date',()=>{
 for(const days of [7,30,90]){
  const all=J.select('clean',E.parse('?days='+days));assert.equal(all.received,days*5*12);
  for(const service of E.services){
   const r=J.select('clean',E.parse('?days='+days+'&service='+encodeURIComponent(service.name)));
   assert.equal(r.received,days*12);assert.ok(r.records.every(x=>x.serviceId===service.id&&x.offset<days));
   assert.equal(r.totalCents,r.records.reduce((sum,x)=>sum+x.event.totalCents,0));
  }
 }
 const batch=J.select('clean',E.parse('?service=API+Gateway&days=7&date=2026-10-14'));
 assert.equal(batch.received,12);assert.equal(batch.totalCents,172900);
 const storage=J.select('clean',E.parse('?service=Storage&days=7&date=2026-10-08'));
 assert.equal(storage.received,12);assert.equal(storage.totalCents,257967);
 assert.ok(storage.records.every(x=>x.date==='2026-10-08'&&x.serviceId==='storage'));
 assert.equal(new Set(J.select('clean',E.parse('?days=90')).records.map(x=>x.event.id)).size,5400);
});
test('scoped pipeline excludes invalid and duplicate deliveries and preserves immutable provenance',()=>{
 for(const key of ['clean','drift','retry']){
  const r=J.select(key,E.parse('?service=Storage&days=7'));
  assert.equal(r.received,84);assert.equal(r.received,r.accepted+r.quarantine+r.duplicate);
  assert.equal(r.totalCents,r.records.filter(x=>x.status==='accepted').reduce((sum,x)=>sum+x.event.totalCents,0));
  assert.ok(Object.isFrozen(r.records)&&Object.isFrozen(r.records[0]));
 }
 assert.equal(J.select('drift',E.parse('?service=Identity&days=7')).quarantine,21);
 assert.equal(J.select('retry',E.parse('?service=Identity&days=7')).duplicate,14);
});
test('order product responds to a single delivery and honest processing-stage semantics',()=>{
 const state=E.parse('?service=API+Gateway&days=7&date=2026-10-14'),clean=J.select('clean',state);
 assert.equal(J.product(clean,4,0).totalCents,12900);assert.equal(J.product(clean,4,0).count,1);
 assert.equal(J.product(clean,4,1).totalCents,8450);
 const drift=J.select('drift',state),retry=J.select('retry',state);
 assert.equal(J.product(drift,4,3).totalCents,0);assert.equal(J.product(drift,4,3).count,0);
 assert.equal(J.product(retry,1,10).totalCents,21000);assert.equal(J.product(retry,2,10).totalCents,0);
 assert.equal(J.product(retry,0).totalCents,null);assert.equal(J.product(retry,0).count,12);
 assert.ok(J.product(retry,1).totalCents>J.product(retry,2).totalCents);
 assert.equal(J.product(retry,3).totalCents,J.product(retry,4).totalCents);
 assert.equal(J.product(clean,4,999999).totalCents,0);
});
