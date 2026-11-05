const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPublicKey,verify,createHash}=require('node:crypto');
const {createObservatoryHandler,publicKey}=require('../api/src/observatory');
const secret='test-only-secret-with-at-least-32-characters';
const identity={identityProvider:'github',userDetails:'JustinPsHub',userId:'a'.repeat(32),userRoles:['anonymous','authenticated']};
function req(action,{p=identity,cookie='',method='GET',body,headers={}}={}){return new Request('https://justinraypalmer.com/api/observatory/'+action,{method,headers:{...(p?{'x-ms-client-principal':Buffer.from(JSON.stringify(p)).toString('base64')}:{Cookie:''}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body}:{} )})}
function setup(){const calls=[];let credential=null;
const webauthn={generateRegistrationOptions:async()=>({challenge:'local-registration-challenge'}),generateAuthenticationOptions:async()=>({challenge:'local-assertion-challenge'}),verifyRegistrationResponse:async v=>{assert.equal(v.expectedOrigin,'https://justinraypalmer.com');assert.equal(v.requireUserVerification,true);assert.equal(v.expectedChallenge,'local-registration-challenge');return {verified:v.response.valid===true,registrationInfo:{credential:{id:'test-key-id-fake',publicKey:Buffer.from('test-public-key'),counter:0}}}},verifyAuthenticationResponse:async v=>{assert.equal(v.expectedChallenge,'local-assertion-challenge');return {verified:v.response.valid===true,authenticationInfo:{newCounter:1}}}};
const fetch=async(url,options)=>{calls.push({url,options});const h=new Headers(options.headers),u=new URL(url),p=JSON.parse(Buffer.from(h.get('x-observatory-principal'),'base64url'));
 assert.equal(p.login,'justinpshub');assert.equal(p.userId,identity.userId);
 const expected=[options.method,u.pathname+u.search,h.get('x-observatory-time'),h.get('x-observatory-nonce'),h.get('x-observatory-principal'),createHash('sha256').update(options.body||'').digest('hex')].join('\n');
 assert.equal(verify(null,Buffer.from(expected),createPublicKey({key:publicKey(secret),format:'jwk'}),Buffer.from(h.get('x-observatory-signature'),'base64url')),true);
 const action=u.pathname.split('/').at(-1);
 if(action==='passkey-register')credential=JSON.parse(options.body);
 const result={authorize:{authorized:true},settings:{paused:true},passkey:{credential},'passkey-register':{registered:true},'passkey-used':{verified:true}}[action]||{current:{views:7},journeys:[]};
 return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}})};
 const handler=createObservatoryHandler({secret,fetch,html:'PRIVATE-HTML',passkeyHtml:'PASSKEY-HTML',webauthn});
 const passkeyHeaders={Origin:'https://justinraypalmer.com','x-observatory-action':'passkey'};
 async function unlock(){const options=await handler(req('passkey-options',{method:'POST',headers:passkeyHeaders}));assert.equal(options.status,200);const challenge=options.headers['Set-Cookie'].split(';')[0];const result=await handler(req('passkey-finish',{method:'POST',headers:passkeyHeaders,cookie:challenge,body:'{"valid":true}'}));assert.equal(result.status,200);return result.headers['Set-Cookie'];}
 return {calls,handler,unlock,passkeyHeaders};}

test('anonymous and every other authenticated identity receive no dashboard or data',async()=>{const {handler,calls}=setup();for(const p of [null,{...identity,userDetails:'someone-else'},{...identity,identityProvider:'aad'},{...identity,userRoles:['anonymous']}]){const r=await handler(req('data',{p}));assert.ok([401,403].includes(r.status));assert.doesNotMatch(JSON.stringify(r),/PRIVATE-HTML|journeys|views/)}assert.equal(calls.length,0);const page=await handler(req('page',{p:null}));assert.equal(page.status,302);assert.match(page.headers.Location,/^\/\.auth\/login\/github\?/)});
test('a public verification key contains no private material or authentication secret',async()=>{const {handler}=setup();const r=await handler(req('public-key',{p:null}));assert.equal(r.status,200);assert.equal(r.jsonBody.kty,'OKP');assert.equal(r.jsonBody.crv,'Ed25519');assert.equal(r.jsonBody.d,undefined);assert.doesNotMatch(JSON.stringify(r),new RegExp(secret));assert.ok(r.headers['Cache-Control'].startsWith('public'))});
test('GitHub identity needs a valid passkey before the dashboard and data are available',async()=>{
 const {handler,unlock,passkeyHeaders}=setup();
 assert.equal((await handler(req('data'))).status,401);
 const locked=await handler(req('page'));assert.equal(locked.status,200);assert.equal(locked.body,'PASSKEY-HTML');assert.equal(locked.headers['Set-Cookie'],undefined);
 assert.equal((await handler(req('passkey-finish',{method:'POST',headers:passkeyHeaders,body:'{"valid":true}'}))).status,403);
 assert.equal((await handler(req('passkey-options',{method:'POST',headers:{...passkeyHeaders,Origin:'https://evil.test'}}))).status,403);
 const cookie=await unlock();for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=1800'])assert.ok(cookie.includes(flag));
 const session=cookie.split(';')[0];assert.equal((await handler(req('page',{cookie:session}))).body,'PRIVATE-HTML');
 assert.equal((await handler(req('data?days=7',{cookie:session}))).jsonBody.current.views,7);
 assert.equal((await handler(req('data',{cookie:session+'bad'}))).status,401);
 assert.equal((await handler(req('data',{p:{...identity,userId:'b'.repeat(32)},cookie:session}))).status,401);
 await unlock();
 const logout=await handler(req('logout',{method:'POST',headers:{Origin:'https://justinraypalmer.com'},cookie:session}));
 assert.equal(logout.status,303);assert.match(logout.headers['Set-Cookie'],/Max-Age=0/);
});
test('settings enforce same-site origin and intentional action header before touching storage',async()=>{const {handler,calls,unlock}=setup(),cookie=(await unlock()).split(';')[0],before=calls.length;const body=JSON.stringify({paused:true});assert.equal((await handler(req('settings',{cookie,method:'POST',body,headers:{Origin:'https://evil.test','x-observatory-action':'settings'}}))).status,403);assert.equal((await handler(req('settings',{cookie,method:'POST',body,headers:{Origin:'https://justinraypalmer.com'}}))).status,403);assert.equal(calls.length,before);assert.equal((await handler(req('settings',{cookie,method:'POST',body,headers:{Origin:'https://justinraypalmer.com','x-observatory-action':'settings'}}))).status,200)});
test('the owner sign-in page loads during a collector outage while passkey access fails closed',async()=>{
 const missing=createObservatoryHandler({secret:''});assert.equal((await missing(req('page'))).status,503);
 const offline=createObservatoryHandler({secret,fetch:async()=>{throw new Error('private internals')}});
 const page=await offline(req('page'));assert.equal(page.status,200);assert.match(page.body,/Verify with a passkey/);assert.equal(page.headers['Set-Cookie'],undefined);
 const options=await offline(req('passkey-options',{method:'POST',headers:{Origin:'https://justinraypalmer.com','x-observatory-action':'passkey'}}));
 assert.equal(options.status,503);assert.equal(options.jsonBody.error,'passkey_unavailable');assert.doesNotMatch(JSON.stringify(options),/private internals/);
 assert.equal((await offline(req('data'))).status,401);
});
test('deployment gates all dashboard routes and never ships private HTML as a static asset',()=>{const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),c=JSON.parse(fs.readFileSync(path.join(root,'staticwebapp.config.json')));for(const route of ['/admin','/admin/telemetry','/admin.html','/api/observatory/*'])assert.ok(c.routes.find(r=>r.route===route).allowedRoles.includes('authenticated'));assert.equal(c.routes.find(r=>r.route==='/api/observatory/public-key').allowedRoles,undefined);assert.ok(fs.existsSync(path.join(root,'api/assets/observatory.html')));assert.equal(fs.existsSync(path.join(root,'MyPersonalSite/wwwroot/portfolio/admin.html')),false);assert.equal(fs.existsSync(path.join(root,'artifacts/static-site/admin.html')),false)});
