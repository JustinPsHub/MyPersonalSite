'use strict';

const {createHash, createHmac, timingSafeEqual} = require('node:crypto');
const webauthn = require('@simplewebauthn/server');

const RP_ID = 'justinraypalmer.com';
const ORIGINS = new Set(['https://justinraypalmer.com', 'https://www.justinraypalmer.com']);
const COOKIE = '__Host-jp-passkey-challenge';
const TTL = 300000;
const cookie = (value, seconds) => `${COOKIE}=${value}; Path=/; Max-Age=${seconds}; Secure; HttpOnly; SameSite=Strict`;

function createPasskeyHandler({secret, bridge, now, json, boundedBody, sessionCookie, verifier = webauthn}) {
  const mac = value => createHmac('sha256', secret).update('observatory-passkey-v1|' + value).digest();
  function openChallenge(req, p, origin) {
    const raw = (req.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-jp-passkey-challenge=([^;]{1,1024})/)?.[1];
    const [value, signature, extra] = (raw || '').split('.');
    if (!value || !signature || extra !== undefined) return null;
    const actual = Buffer.from(signature, 'base64url');
    const expected = mac(value);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const data = JSON.parse(Buffer.from(value, 'base64url'));
    if (data.userId !== p.userId || data.origin !== origin || data.until <= now() || data.until > now() + TTL) return null;
    return data;
  }
  return async (req, p, action) => {
    const origin = req.headers.get('origin');
    if (req.method !== 'POST' || !ORIGINS.has(origin) || req.headers.get('x-observatory-action') !== 'passkey') {
      return json(403, {error:'origin'});
    }
    try {
      const {credential} = await bridge('passkey', p);
      if (action === 'passkey-options') {
        const mode = credential ? 'authenticate' : 'register';
        const options = credential
          ? await verifier.generateAuthenticationOptions({rpID: RP_ID, allowCredentials: [{id: credential.id}], userVerification: 'required', timeout: TTL})
          : await verifier.generateRegistrationOptions({rpName: 'Justin Palmer Observatory', rpID: RP_ID, userName: p.login,
            userID: createHash('sha256').update(p.userId).digest(), attestationType: 'none', timeout: TTL,
            authenticatorSelection: {residentKey: 'required', userVerification: 'required'}});
        const value = Buffer.from(JSON.stringify({mode, challenge: options.challenge, until: now() + TTL, origin, userId: p.userId})).toString('base64url');
        return json(200, {mode, options}, {'Set-Cookie':cookie(`${value}.${mac(value).toString('base64url')}`, TTL / 1000)});
      }
      const clear = {'Set-Cookie':cookie('', 0)};
      const saved = openChallenge(req, p, origin);
      if (!saved || (saved.mode === 'register') === Boolean(credential)) return json(403, {error:'passkey_challenge'}, clear);
      const response = JSON.parse(await boundedBody(req, 12288));
      const expected = {response, expectedChallenge:saved.challenge, expectedOrigin:origin, expectedRPID:RP_ID, requireUserVerification:true};
      if (saved.mode === 'register') {
        const result = await verifier.verifyRegistrationResponse(expected);
        if (!result.verified || !result.registrationInfo?.credential) return json(403, {error:'passkey_denied'}, clear);
        const registered = result.registrationInfo.credential;
        await bridge('passkey-register', p, '', JSON.stringify({id:registered.id, key:Buffer.from(registered.publicKey).toString('base64url'), counter:registered.counter}));
      } else {
        const result = await verifier.verifyAuthenticationResponse({...expected, credential: {id:credential.id, publicKey:Buffer.from(credential.key, 'base64url'), counter:credential.counter}});
        if (!result.verified) return json(403, {error:'passkey_denied'}, clear);
        const challenge = createHash('sha256').update(saved.challenge).digest('hex');
        await bridge('passkey-used', p, '', JSON.stringify({challenge, prior:credential.counter, counter:result.authenticationInfo.newCounter}));
      }
      return json(200, {verified:true}, {'Set-Cookie': sessionCookie(p)});
    } catch (error) {
      const status = error.status === 413 ? 413 : error.status >= 500 ? 503 : 403;
      return json(status, {error:status === 503 ? 'passkey_unavailable' : 'passkey_denied'}, {'Set-Cookie':cookie('', 0)});
    }
  };
}

module.exports = {createPasskeyHandler};
