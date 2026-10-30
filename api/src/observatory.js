'use strict';
const {createHash,createHmac,createPrivateKey,createPublicKey,randomBytes,sign,timingSafeEqual}=require('node:crypto');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const SERVICE='https://palmer-observatory.happy-mink-8142.chatgpt.site';
const OWNER='justinpshub';
const COOKIE='__Host-jp-admin';
const HEADERS={'Cache-Control':'no-store, private','X-Robots-Tag':'noindex, noarchive, nosnippet','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"};
const ORIGINS=new Set(['https://justinraypalmer.com','https://www.justinraypalmer.com','https://icy-beach-0aa64750f.1.azurestaticapps.net']);
function principal(req){
 try{const raw=req.headers.get('x-ms-client-principal');if(!raw||raw.length>8192)return null;const p=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));
 if(p.identityProvider!=='github'||typeof p.userDetails!=='string'||p.userDetails.toLowerCase()!==OWNER||!Array.isArray(p.userRoles)||!p.userRoles.includes('authenticated')||typeof p.userId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(p.userId))return null;
 return {provider:'github',login:OWNER,userId:p.userId};}catch{return null}
}
function signingKey(secret){const seed=createHash('sha256').update('jp-observatory-bridge-v1\0').update(secret).digest();return createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]),format:'der',type:'pkcs8'})}
function publicKey(secret){return createPublicKey(signingKey(secret)).export({format:'jwk'})}
function canonical(method,pathname,time,nonce,identity,body){return [method,pathname,time,nonce,identity,createHash('sha256').update(body).digest('hex')].join('\n')}
function signedHeaders(secret,method,pathname,p,body='',now=Date.now()){
 const time=String(now),nonce=randomBytes(16).toString('hex'),identity=Buffer.from(JSON.stringify(p)).toString('base64url');
 return {'X-Observatory-Time':time,'X-Observatory-Nonce':nonce,'X-Observatory-Principal':identity,'X-Observatory-Signature':sign(null,Buffer.from(canonical(method,pathname,time,nonce,identity,body)),signingKey(secret)).toString('base64url'),'Content-Type':'application/json'};
}

async function boundedBody(req,max){
 if(Number(req.headers.get('content-length')||0)>max)throw Object.assign(new Error('size'),{status:413});
 const reader=req.body?.getReader();if(!reader){const t=await req.text();if(Buffer.byteLength(t)>max)throw Object.assign(new Error('size'),{status:413});return t}
 const parts=[];let size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Object.assign(new Error('size'),{status:413})}parts.push(Buffer.from(value))}return Buffer.concat(parts).toString('utf8');
}

function createObservatoryHandler(options={}){
 const secret=options.secret??process.env.CONTACT_SESSION_SECRET,request=options.fetch||global.fetch,now=options.now||Date.now;
 const counters=new Map();
 const json=(status,value,extra={})=>({status,headers:{...HEADERS,...extra,'Content-Type':'application/json; charset=utf-8'},jsonBody:value});
 const mac=s=>createHmac('sha256',secret).update('admin-session-v1|'+s).digest('base64url');
 function validSession(req,p){const value=(req.headers.get('cookie')||'').match(/(?:^|;\s*)__Host-jp-admin=([^;]+)/)?.[1];if(!value)return false;const [expiry,sig,...extra]=value.split('.'),age=Number(expiry)-now();if(extra.length||age<=0||age>1800000||!sig)return false;const a=Buffer.from(sig),b=Buffer.from(mac(p.userId+'|'+expiry));return a.length===b.length&&timingSafeEqual(a,b)}
 function rate(p){for(const [key,v] of counters)if(v.until<=now())counters.delete(key);const b=counters.get(p.userId)||{count:0,until:now()+60000};b.count++;counters.set(p.userId,b);return b.count<=60}
 async function bridge(action,p,query='',body=''){
  const pathname='/bridge/'+action+query,method=body?'POST':'GET';
  const response=await request(SERVICE+pathname,{method,headers:signedHeaders(secret,method,pathname,p,body,now()),...(body?{body}:{}),signal:AbortSignal.timeout(15000),redirect:'error',cache:'no-store'});
  if(!response.ok){const e=new Error('bridge');e.status=response.status;throw e}
  return response.json();
 }
 return async function observatory(req){
  const url=new URL(req.url),action=req.params?.action||url.pathname.split('/').at(-1),page=action==='page';
  if(action==='public-key'){
   if(req.method!=='GET')return json(405,{error:'method'});
   if(typeof secret!=='string'||secret.length<32)return json(503,{error:'unavailable'});
   return json(200,publicKey(secret),{'Cache-Control':'public, max-age=60'});
  }
  const p=principal(req);
  if(!p){
   if(page&&req.method==='GET'&&!req.headers.get('x-ms-client-principal'))return {status:302,headers:{...HEADERS,Location:'/.auth/login/github?post_login_redirect_uri='+encodeURIComponent((ORIGINS.has(url.origin)?url.origin:'https://justinraypalmer.com')+'/admin')}};
   return json(req.headers.get('x-ms-client-principal')?403:401,{error:'unauthorized'});
  }
  if(typeof secret!=='string'||secret.length<32)return json(503,{error:'configuration_unavailable'});
  if(!rate(p))return json(429,{error:'limited'},{'Retry-After':'60'});
  if(page&&req.method==='GET'){
   try{await bridge('authorize',p);const expiry=String(now()+1800000),body=options.html??await readFile(path.join(__dirname,'../assets/observatory.html'),'utf8');return {status:200,headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8','Set-Cookie':COOKIE+'='+expiry+'.'+mac(p.userId+'|'+expiry)+'; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=Strict'},body};}catch{return json(503,{error:'analytics_temporarily_unavailable'})}
  }
  if(!validSession(req,p))return json(401,{error:'session_expired'});
  if(action==='data'&&req.method==='GET'){
   const query=new URLSearchParams();for(const key of ['days','start','end'])if(url.searchParams.has(key))query.set(key,url.searchParams.get(key).slice(0,20));
   try{return json(200,await bridge('data',p,query.size?'?'+query:''))}catch(e){return json(e.status===400?400:503,{error:e.status===400?'invalid_date_range':'data_temporarily_unavailable'})}
  }
  if(action==='settings'&&req.method==='POST'){
   if(!ORIGINS.has(req.headers.get('origin'))||req.headers.get('x-observatory-action')!=='settings')return json(403,{error:'origin'});
   try{const data=JSON.parse(await boundedBody(req,256));if(!data||typeof data.paused!=='boolean'||Object.keys(data).some(k=>k!=='paused'))return json(400,{error:'payload'});return json(200,await bridge('settings',p,'',JSON.stringify({paused:data.paused})))}catch(e){return json(e.status===413?413:e instanceof SyntaxError?400:503,{error:e.status===413?'size':e instanceof SyntaxError?'payload':'unavailable'})}
  }
  return json(404,{error:'not_found'});
 };
}
module.exports={createObservatoryHandler,principal,publicKey,signedHeaders,canonical};
