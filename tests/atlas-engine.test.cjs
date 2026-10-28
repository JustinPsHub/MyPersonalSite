const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../MyPersonalSite/wwwroot/portfolio/atlas-engine.js');
test('synthetic telemetry has one complete, immutable service record per UTC day',()=>{
 assert.equal(E.data.length,900);assert.equal(new Set(E.data.map(r=>r.date)).size,180);
 assert.equal(E.data.at(-1).date,'2026-10-14');assert.equal(new Set(E.data.map(r=>r.date+':'+r.id)).size,900);
 assert.ok(E.data.every(r=>Number.isSafeInteger(r.requests)&&r.requests>0&&r.errors>=0&&r.errors<=r.requests&&r.latency>0));
 assert.ok(Object.isFrozen(E.data)&&Object.isFrozen(E.data[0]));
});
test('90-day comparisons use disjoint equal periods without truncating the baseline',()=>{
 const state=E.parse('?days=90');const current=E.select(state),previous=E.select(state,{previous:true});
 assert.equal(current.length,450);assert.equal(previous.length,450);
 assert.ok(previous.at(-1).date<current[0].date);assert.equal(new Set([...current,...previous].map(r=>r.date+':'+r.id)).size,900);
});
test('weighted metrics and the error budget honor their definitions',()=>{
 const rows=[{requests:100,errors:1,latency:200,deployments:1},{requests:900,errors:0,latency:100,deployments:2}];
 const result=E.summarize(rows);assert.equal(result.requests,1000);assert.equal(result.errors,1);assert.equal(result.success,99.9);assert.equal(result.latency,110);assert.equal(result.deployments,3);assert.ok(Math.abs(result.budget-100)<1e-8);
 const empty=E.summarize([]);assert.ok(Object.values(empty).every(v=>Number.isFinite(v)&&v===0));
});
test('a focused incident day selects exact records and compares the matched earlier day',()=>{
 const state=E.parse('?service=Storage&days=30&date=2026-10-08');const rows=E.select(state),previous=E.select(state,{previous:true});
 assert.equal(rows.length,1);assert.equal(rows[0].requests,55781);assert.equal(rows[0].errors,642);assert.equal(rows[0].latency,276);assert.equal(previous.length,1);assert.equal(previous[0].date,'2026-09-08');
 assert.equal(E.select(state,{ignoreDate:true}).length,30);assert.equal(E.select(state,{allServices:true}).length,5);
});
test('untrusted URL values cannot escape the allowed service, date, or model domain',()=>{
 const state=E.parse('?service=%3Cimg%20onerror%3Dalert(1)%3E&days=1000000&date=2020-01-01&focus=__proto__&metric=constructor&sort=html&delta=Infinity');
 assert.deepEqual(state,{service:'all',days:30,metric:'requests',sort:'requests',date:'',focus:'storage',delta:0});
 assert.equal(E.parse('?days=7&date=2026-09-01').date,'');assert.equal(E.parse('?delta=999999').delta,300);assert.equal(E.parse('?delta=-5').delta,0);assert.equal(E.parse('?delta=62').delta,50);
});
test('dependency exposure follows synchronous paths and excludes asynchronous telemetry',()=>{
 const weights=E.influence('storage');assert.equal(weights.storage,1);assert.equal(weights.data,.8);assert.equal(weights.identity,.5);assert.ok(Math.abs(weights.gateway-.695)<1e-12);assert.equal(weights.observe,0);
 assert.deepEqual(E.influence('observe'),{gateway:0,data:0,identity:0,storage:0,observe:1});
 const model=E.model('storage',100,[{id:'gateway',requests:100,errors:0,latency:100,deployments:0},{id:'storage',requests:100,errors:0,latency:50,deployments:0}]);
 assert.ok(Math.abs(model.added-84.75)<1e-10);assert.deepEqual(model.affected,['gateway','data','identity']);
});
test('modeling never mutates the observed telemetry or forecasts failures',()=>{
 const original=JSON.stringify(E.data);const rows=E.select(E.parse(''));E.model('storage',300,rows);assert.equal(JSON.stringify(E.data),original);assert.equal(E.model('storage',0,rows).added,0);
});
