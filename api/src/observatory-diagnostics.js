'use strict';

const {createHmac} = require('node:crypto');
const {isIP} = require('node:net');
const {signedHeaders} = require('./observatory');

const SERVICE = 'https://palmer-observatory.happy-mink-8142.chatgpt.site';
const PATH = '/bridge/diagnostic';
const PRINCIPAL = {provider: 'azure', purpose: 'diagnostics'};

function classifyAgent(userAgent = '') {
  const claimedCrawler = userAgent.match(/\b(Googlebot|bingbot|DuckDuckBot|Applebot|GPTBot|ClaudeBot|AhrefsBot|SemrushBot)\b/i);
  if (claimedCrawler) return {traffic: 'crawler claim', agent: claimedCrawler[1].toLowerCase()};
  if (!userAgent || /bot|crawler|spider|curl|wget|python-requests|headless|playwright|puppeteer/i.test(userAgent)) {
    return {traffic: 'automation signal', agent: userAgent ? 'script or bot signature' : 'missing user agent'};
  }
  return {traffic: 'unknown', agent: 'other user agent'};
}

function createDiagnostics(options = {}) {
  const secret = options.secret ?? process.env.CONTACT_SESSION_SECRET;
  const request = options.fetch ?? global.fetch;
  const now = options.now ?? Date.now;
  let minute = 0;
  let admitted = 0;
  return async function diagnostic(req, kind, status, duration = 0) {
    if (typeof secret !== 'string' || secret.length < 32) return;
    const time = now();
    const bucket = Math.floor(time / 60000);
    if (bucket !== minute) { minute = bucket; admitted = 0; }
    if (admitted >= 100) return;
    admitted++;
    const day = new Date(time).toISOString().slice(0, 10);
    const ip = req.headers.get('x-azure-socketip') || '';
    const source = isIP(ip) ? createHmac('sha256', secret).update(`observatory-network-v1|${day}|${ip}`).digest('hex').slice(0, 16) : '';
    const body = JSON.stringify({kind, status, duration: Math.min(120000, Math.max(0, Math.round(duration))), source, ...classifyAgent(req.headers.get('user-agent') || '')});
    try {
      await request(SERVICE + PATH, {
        method: 'POST', body, headers: signedHeaders(secret, 'POST', PATH, PRINCIPAL, body, time),
        signal: AbortSignal.timeout(800), redirect: 'error', cache: 'no-store'
      });
    } catch {
      // Contact and authorization must continue if telemetry is unavailable.
    }
  };
}

module.exports = {createDiagnostics};
