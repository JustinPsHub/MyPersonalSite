'use strict';
const {app} = require('@azure/functions');
const {createContactHandler} = require('./contact');
const {createObservatoryHandler} = require('./observatory');
const {createDiagnostics} = require('./observatory-diagnostics');

const diagnostic = createDiagnostics();
const observatory = createObservatoryHandler();
const methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'];
app.http('contact', {route: 'contact', authLevel: 'anonymous', methods, handler: createContactHandler({diagnostic})});
app.http('observatory', {route: 'observatory/{action}', authLevel: 'anonymous', methods, handler: async req => {
  const response = await observatory(req);
  if (response.status === 403 || response.status === 429) {
    await diagnostic(req, response.status === 403 ? 'admin_denied' : 'admin_rate_limit', response.status);
  }
  return response;
}});
app.http('observatory-probe', {route: 'observatory-probe', authLevel: 'anonymous', methods, handler: async req => {
  await diagnostic(req, 'probe_route_hit', 404);
  return {status: 404, headers: {'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'}, body: 'Not found'};
}});
