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
 function pointForShape(shape,i,count,time=0){
  const u=i/Math.max(count-1,1),angle=i*2.399963229728653;
  if(shape==='flow'){const turn=u*Math.PI*6;return {x:(u-.5)*310,y:Math.cos(turn+time)*54,z:Math.sin(turn+time)*75}}
  if(shape==='insight'){const row=i%12,col=Math.floor(i/12);return {x:(row-5.5)*23,y:Math.sin(row*.32+col*.3+time)*28-55,z:(col-(count/12-1)/2)*23}}
  const y=1-u*2,r=Math.sqrt(Math.max(0,1-y*y));return {x:Math.cos(angle)*r*144,y:y*144,z:Math.sin(angle)*r*144};
 }
 const engine=Object.freeze({dashboardState,processEvent,pointForShape});
 if(typeof module!=='undefined'&&module.exports)module.exports=engine;else globalThis.PortfolioEngine=engine;
})();
