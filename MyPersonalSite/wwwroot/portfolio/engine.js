/* Pure, dependency-free logic shared by the UI and the contract tests. */
(()=>{
 'use strict';
 const services=['all','Data Platform','API Gateway','Identity','Observability','Storage'];
 function dashboardState(search){const p=new URLSearchParams(search);return {service:services.includes(p.get('service'))?p.get('service'):'all',days:[7,30,90].includes(Number(p.get('days')))?Number(p.get('days')):30,sort:['requests','success','name'].includes(p.get('sort'))?p.get('sort'):'requests',metric:['requests','latency','errors'].includes(p.get('metric'))?p.get('metric'):'requests'}}
 function processEvent(event){
  const errors=[];
  if(!event||typeof event!=='object')return {ok:false,errors:['An event object is required.'],output:null};
  if(typeof event.id!=='string'||!event.id.trim())errors.push('A nonempty event ID is required.');
  if(event.type!=='order.created')errors.push('The event type must be order.created.');
  if(!Number.isSafeInteger(event.totalCents)||event.totalCents<0)errors.push('totalCents must be a nonnegative safe integer.');
  if(event.currency!=='USD')errors.push('This demo supports USD only.');
  return errors.length?{ok:false,errors,output:null}:{ok:true,errors:[],output:{eventId:event.id,eventType:event.type,total:event.totalCents/100,currency:event.currency,status:'ready',destination:'analytics.orders'}};
 }
 // Deterministic fixtures and batch accounting are shared with the homepage preview.
 function eventPreset(key){
  const sample={id:'demo-001',type:'order.created',totalCents:12900,currency:'USD'};
  if(key==='invalid')return [{...sample,totalCents:-12900}];
  if(key!=='burst')return [sample];
  return Array.from({length:100},(_,i)=>({id:'burst-'+String(i%10===9?i-1:i).padStart(3,'0'),type:'order.created',totalCents:i%10===6?-500:1000+(i%10===9?i-1:i)*137,currency:'USD'}));
 }
 function processBatch(events){
  if(!Array.isArray(events)||events.length>100)throw new RangeError('A simulation batch must contain at most 100 events.');
  const seen=new Set(),receipts=[],delivered=[],deadLetters=[],duplicates=[];
  for(const [index,input] of events.entries()){
   const event=Object.freeze({...input}),result=processEvent(input);
   let status='delivered';
   if(!result.ok)status='dead-letter';
   else if(seen.has(input.id))status='duplicate';
   else seen.add(input.id);
   const receipt=Object.freeze({index,event,status,errors:Object.freeze([...result.errors]),output:status==='delivered'?Object.freeze(result.output):null});
   receipts.push(receipt);
   (status==='delivered'?delivered:status==='dead-letter'?deadLetters:duplicates).push(receipt);
  }
  return Object.freeze({received:receipts.length,receipts:Object.freeze(receipts),delivered:Object.freeze(delivered),deadLetters:Object.freeze(deadLetters),duplicates:Object.freeze(duplicates),totalCents:delivered.reduce((sum,r)=>sum+r.event.totalCents,0)});
 }
 const engine=Object.freeze({dashboardState,processEvent,eventPreset,processBatch});
 if(typeof module!=='undefined'&&module.exports)module.exports=engine;else globalThis.PortfolioEngine=engine;
})();
