/* Compact views use the same pure engines as their full workspaces. */
(() => {
  'use strict';
  const set = (id, value) => { document.getElementById(id).textContent = value; };
  const E = window.AtlasEngine;
  const rows = E.select(E.parse(''));
  const totals = E.summarize(rows);
  const model = E.model('storage', 150, rows);
  set('preview-gateway', `+${(model.weights.gateway * 150).toFixed(1)} ms`);
  set('preview-data', `+${Math.round(model.weights.data * 150)} ms`);
  set('preview-callers', model.affected.length);
  set('preview-success', totals.success.toFixed(3) + '%');
  set('preview-budget', totals.budget.toFixed(0) + '%');
  set('atlas-preview-source', `${rows.length} synthetic records · 30-day scope · 14 Oct 2026`);
  const P = window.PortfolioEngine;
  const result = P.processBatch([...P.eventPreset('valid'), ...P.eventPreset('invalid')]);
  set('preview-events', result.received);
  set('preview-accepted', result.delivered.length);
  set('preview-rejected', result.deadLetters.length);
  set('preview-event-value', `Canonical output · USD ${result.delivered[0].output.total.toFixed(2)}`);
})();
