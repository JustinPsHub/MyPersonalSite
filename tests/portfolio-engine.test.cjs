const {test}=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../MyPersonalSite/wwwroot/portfolio/engine.js');
const valid={id:'demo-001',type:'order.created',totalCents:12900,currency:'USD'};
test('pipeline transforms a valid event without changing the input',()=>{const input={...valid},result=engine.processEvent(input);assert.equal(result.ok,true);assert.deepEqual(result.output,{eventId:'demo-001',eventType:'order.created',total:129,currency:'USD',status:'ready',destination:'analytics.orders'});assert.deepEqual(input,valid)});
test('invalid amounts are quarantined and produce no output',()=>{for(const totalCents of [-1,1.1,NaN,Infinity,'12900',null,Number.MAX_SAFE_INTEGER+1]){const result=engine.processEvent({...valid,totalCents});assert.equal(result.ok,false);assert.equal(result.output,null);assert.match(result.errors.join(' '),/safe integer/)}});
test('boundary validation checks identity, event type and currency',()=>{for(const event of [null,{},[],{...valid,id:''},{...valid,id:' '},{...valid,type:'unknown'},{...valid,currency:'EUR'}]){assert.equal(engine.processEvent(event).ok,false)}assert.equal(engine.processEvent({...valid,totalCents:0}).ok,true)});
test('dashboard links round-trip an allowed state',()=>{assert.deepEqual(engine.dashboardState('?service=Identity&days=7&sort=success&metric=latency'),{service:'Identity',days:7,sort:'success',metric:'latency'})});
test('untrusted and missing query parameters fall back safely',()=>{for(const query of ['', '?service=<script>&days=-1&sort=__proto__&metric=html','?days=Infinity','?days=0','?days=7.5'])assert.deepEqual(engine.dashboardState(query),{service:'all',days:30,sort:'requests',metric:'requests'})});
