'use strict';
const {randomBytes,createHmac,timingSafeEqual}=require('node:crypto');
const {isIP}=require('node:net');
const COOKIE='__Host-jp-contact',TTL=10*60*1000,MIN_AGE=1200,MAX_BODY=2048;
const DEFAULT_ORIGINS=['https://justinraypalmer.com','https://www.justinraypalmer.com','https://icy-beach-0aa64750f.1.azurestaticapps.net'];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function createContactHandler(options={}){
 const secret=options.secret??process.env.CONTACT_SESSION_SECRET,email=options.email??process.env.CONTACT_EMAIL;
 const now=options.now||Date.now,random=options.random||randomBytes;
 const origins=new Set(options.origins||[...DEFAULT_ORIGINS,...(process.env.CONTACT_ALLOWED_ORIGINS||'').split(',').filter(Boolean)]);
 const counters=new Map(),used=new Map();
 const sign=(kind,value)=>createHmac('sha256',secret).update(kind+'|'+value).digest('base64url');
 const same=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right)};
 const validSession=s=>{const [id,sig,...extra]=String(s||'').split('.');return !extra.length&&/^[a-f0-9]{48}$/.test(id||'')&&same(sig,sign('session',id))};
 function sessionFrom(req){const raw=req.headers.get('cookie')||'';if(raw.length>4096)return '';const s=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return validSession(s)?s:''}
 function consume(key,limit){const time=now();for(const [k,v] of counters)if(v.until<=time)counters.delete(k);const item=counters.get(key)||{count:0,until:time+TTL};if(counters.size>=5000&&!counters.has(key))return false;item.count++;counters.set(key,item);return item.count<=limit}
 function clientKey(req){let ip=req.headers.get('client-ip')||req.headers.get('x-azure-socketip')||'';if(ip.startsWith('['))ip=ip.slice(1,ip.indexOf(']'));else if(ip.includes('.')&&ip.includes(':'))ip=ip.split(':')[0];return sign('client',isIP(ip)?ip:'shared')}
 function challenge(session){const data={v:1,iat:now(),nonce:random(16).toString('hex'),session:sign('binding',session)};const payload=Buffer.from(JSON.stringify(data)).toString('base64url');return payload+'.'+sign('challenge',payload)}
 const headers={
  'Cache-Control':'no-store, private, max-age=0','Pragma':'no-cache','Vary':'Accept, Cookie, Origin',
  'X-Robots-Tag':'noindex, noarchive, nosnippet','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
  'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
 };
 function html(content){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, noarchive, nosnippet"><title>Contact — Justin Palmer</title><script src="/portfolio/preferences.js?v=15"></script><link rel="stylesheet" href="/portfolio/style.css?v=15"></head><body><header class="header wrap"><a class="brand" href="/"><span class="mark" aria-hidden="true">jp.</span>Justin Palmer</a><nav aria-label="Main navigation"><a href="/">Profile</a><a href="/resume">Background</a><a href="/contact" aria-current="page">Contact</a></nav></header><main id="main" class="wrap contact-page"><p class="eyebrow">GET IN TOUCH</p><h1>Let’s talk.</h1>'+content+'<div class="contact-alternatives"><a class="text-link" href="/resume">View résumé ↗</a><a class="text-link" href="https://github.com/JustinPsHub" rel="noopener">GitHub ↗</a></div></main></body></html>'}
 function form(token,message=''){return html('<p class="contact-intro">For engineering roles, collaborations, or a useful conversation.</p><p class="contact-status fine-print" role="status">'+escape(message)+'</p><form method="post" action="/api/contact"><input type="hidden" name="token" value="'+escape(token)+'"><div class="contact-trap" aria-hidden="true"><label>Company website<input name="company" tabindex="-1" autocomplete="off"></label></div><button type="submit" class="button primary">Email Justin ↗</button><p class="fine-print">Continue to my email address.</p></form>')}
 function reply(status,data,wantsHTML,extra={}){return {status,headers:{...headers,...extra,'Content-Type':wantsHTML?'text/html; charset=utf-8':'application/json; charset=utf-8'},...(wantsHTML?{body:typeof data==='string'?data:html('<p class="contact-intro">'+escape(data.message)+'</p><p><a class="text-link" href="/contact">Back to contact ↗</a></p>')}:{jsonBody:data})}}
 async function bodyText(req){const length=Number(req.headers.get('content-length')||0);if(length>MAX_BODY)throw new Error('large');if(req.body?.getReader){const reader=req.body.getReader(),chunks=[];let size=0;while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new Error('large')}chunks.push(Buffer.from(item.value))}return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))}const s=await req.text();if(Buffer.byteLength(s)>MAX_BODY)throw new Error('large');return s}
 return async function contact(req){
  const wantsHTML=(req.headers.get('accept')||'').includes('text/html');
  const error=(status,message,extra)=>reply(status,{message},wantsHTML,extra);
  if(!['GET','POST'].includes(req.method))return error(405,'Please use the contact page.',{'Allow':'GET, POST'});
  if(typeof secret!=='string'||secret.length<32||typeof email!=='string'||email.length>254||!/^[-A-Za-z0-9.!#$%&'*+/=?^_`{|}~]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))return error(503,'Email contact is temporarily unavailable. Please try again later or use GitHub.');
  const origin=req.headers.get('origin'),site=req.headers.get('sec-fetch-site');
  if((origin&&!origins.has(origin))||site==='cross-site'||(req.method==='POST'&&!origins.has(origin)))return error(403,'Please open the contact page on this website.');
  if(!consume('global',600)||!consume('client:'+clientKey(req),30))return error(429,'Please try again in a few minutes.',{'Retry-After':'600'});
  let session=sessionFrom(req);
  if(req.method==='GET'){
   if(!session){const id=random(24).toString('hex');session=id+'.'+sign('session',id)}
   if(!consume('issue:'+sign('bucket',session),10))return error(429,'Please try again in a few minutes.',{'Retry-After':'600'});
   const token=challenge(session),cookie=COOKIE+'='+session+'; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Strict';
   return reply(200,wantsHTML?form(token):{token},wantsHTML,{'Set-Cookie':cookie});
  }
  if(!session)return error(403,'Please refresh the contact page and try again.');
  if(!consume('reveal:'+sign('bucket',session),5))return error(429,'Please try again in a few minutes.',{'Retry-After':'600'});
  const type=(req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!['application/json','application/x-www-form-urlencoded'].includes(type))return error(415,'Please use the contact page.');
  let data;
  try{const text=await bodyText(req);if(type==='application/json')data=JSON.parse(text);else{const params=new URLSearchParams(text);if([...params.keys()].some(k=>params.getAll(k).length!==1))throw new Error('duplicate');data=Object.fromEntries(params)}
   if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['token','company'].includes(k))||typeof data.token!=='string'||data.token.length>1024||(data.company!==undefined&&(typeof data.company!=='string'||data.company.length>200)))throw new Error('shape');
  }catch{return error(400,'Please refresh the contact page and try again.')}
  if(data.company)return error(400,'Please use the contact page.');
  const [payload,sig,...extra]=data.token.split('.');
  if(extra.length||!payload||!same(sig,sign('challenge',payload)))return error(403,'Please refresh the contact page and try again.');
  let value;try{value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{return error(403,'Please refresh the contact page and try again.')}
  const age=now()-value.iat;
  if(value.v!==1||!Number.isFinite(value.iat)||!Number.isFinite(age)||age<0||age>TTL||!same(value.session,sign('binding',session))||!/^[a-f0-9]{32}$/.test(value.nonce||''))return error(403,'Please refresh the contact page and try again.');
  if(age<MIN_AGE)return reply(425,wantsHTML?form(data.token,'Please try again in a moment.'):{message:'Please try again in a moment.'},wantsHTML,{'Retry-After':'2'});
  for(const [key,expires] of used)if(expires<=now())used.delete(key);
  if(used.has(value.nonce)||used.size>=5000)return error(403,'Please refresh the contact page and try again.');
  used.set(value.nonce,now()+TTL);
  const mailto='mailto:'+encodeURIComponent(email);
  return reply(200,wantsHTML?html('<p class="contact-intro">Send me a note using your preferred email app.</p><p class="contact-address">'+escape(email)+'</p><a class="button primary" href="'+escape(mailto)+'">Open email app ↗</a>'):{email,mailto},wantsHTML);
 };
}
module.exports={createContactHandler};
