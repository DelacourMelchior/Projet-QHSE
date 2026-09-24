// Calculation tests for tool 1.1 (KPI dashboard).
// Run: node --test OUTILS_RENTABILITE_DELACOUR/build/test_outil_1_1.test.js
// The page script is evaluated in a minimal DOM stub, then its pure functions are exercised.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadApp() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'tool_page.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const main = scripts.reduce((a, b) => (b.length > a.length ? b : a));
  const el = () => new Proxy({ classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: {}, appendChild() {}, querySelectorAll: () => [], addEventListener() {} },
    { get: (t, k) => (k in t ? t[k] : undefined), set: (t, k, v) => { t[k] = v; return true; } });
  const store = {};
  const ctx = {
    console, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame() {},
    alert() {}, confirm: () => true,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    document: { getElementById: () => el(), querySelector: () => null, querySelectorAll: () => [], createElement: el, addEventListener() {}, body: el() },
    navigator: {}, indexedDB: {}, performance: { now: () => 0 },
  };
  ctx.window = Object.assign(ctx, { addEventListener() {}, location: { search: '' }, history: { pushState() {} }, innerWidth: 1440 });
  vm.createContext(ctx);
  vm.runInContext(main + '\n;globalThis.__app = { TOOLS_DATA, INITIAL_TOOLS_DATA, get SharedStore() { return SharedStore; } };', ctx);
  return ctx;
}

const app = loadApp();
const plain = x => JSON.parse(JSON.stringify(x));   // objects from the vm realm -> plain objects
const demo = () => JSON.parse(JSON.stringify(app.__app.INITIAL_TOOLS_DATA['1.1']));
const kpi = (over = {}) => ({ id: 'k', name: 'KPI', unit: '€', goalDirection: 'higher', target: '100', targetVal: 100, calcType: 'sum', months: ['', '', ''], ...over });

test('parseKpiNumber reads French and shorthand formats', () => {
  assert.equal(app.parseKpiNumber('1.234,56'), 1234.56);
  assert.equal(app.parseKpiNumber('1 234,5 €'), 1234.5);
  assert.equal(app.parseKpiNumber('45 000 €'), 45000);
  assert.equal(app.parseKpiNumber('2.5 h'), 2.5);
  assert.equal(app.parseKpiNumber('1.234.567'), 1234567);
  assert.equal(app.parseKpiNumber('12k€'), 12000);
  assert.equal(app.parseKpiNumber('-'), null);
  assert.equal(app.parseKpiNumber(''), null);
});

test('status uses the requested month, not the last filled one', () => {
  const ind = kpi({ months: ['50', '120', ''] });
  assert.equal(app.computeKpiStatus(ind, 0).isAlert, true);
  assert.equal(app.computeKpiStatus(ind, 1).text, 'Conforme');
  const pending = app.computeKpiStatus(ind, 2);
  assert.equal(pending.isPending, true);
  assert.equal(pending.isAlert, false);
});

test('zero target shows an absolute gap', () => {
  const ind = kpi({ goalDirection: 'lower', target: '0 litige', targetVal: 0, months: ['2'] });
  const st = app.computeKpiStatus(ind, 0);
  assert.equal(st.isAlert, true);
  assert.match(st.text, /2 pour 0/);
  assert.equal(app.computeKpiStatus(kpi({ goalDirection: 'lower', targetVal: 0, months: ['0'] }), 0).text, 'Conforme');
});

test('annual summary: stocks use the last value', () => {
  assert.match(app.computeKpiAnnualSummary(kpi({ id: 'kpi_treso', calcType: 'avg', months: ['40 000 €', '30 000 €', ''] })), /^30\s000 €$/);   // fr-FR uses a narrow no-break space
  assert.match(app.computeKpiAnnualSummary(kpi({ months: ['100', '200', ''] })), /^300/);
  assert.equal(app.getKpiSummaryMode(kpi({ id: 'kpi_devis_attente' })), 'last');
});

test('year to date only counts the active year', () => {
  const tool = demo();
  tool.columns = [{ month: 11, year: 2025 }, { month: 0, year: 2026 }, { month: 1, year: 2026 }].map((c, i) => ({ ...c, id: 'c' + i, label: 'x' }));
  const ca = kpi({ months: ['999', '100', '50'] });
  tool.processes = [{ id: 'P1', name: 'P1', indicators: [ca] }];
  const ytd = app.kpiYearToDate(tool, ca, 2);
  assert.equal(ytd.sum, 150);
  assert.equal(ytd.months, 2);
});

test('claims are counted in the month they are dated', () => {
  const byPer = app.claimsByPeriod([['14/01/2026', '', '', '', '450 €'], ['02/02/2026', '', '', '', '1 200 €'], ['20/02/2026', '', '', '', '300 €'], ['Exigence', '', '', '', '']]);
  assert.deepEqual(plain(byPer), { '2026-01': { count: 1, cost: 450 }, '2026-02': { count: 2, cost: 1500 } });
});

test('effectiveness is measured on the month after closure', () => {
  const tool = app.__app.TOOLS_DATA['1.1'];
  Object.assign(tool, demo());
  const [ind] = tool.processes[0].indicators;   // CA, target 50 000
  ind.months[1] = '40 000 €';                     // February below target
  ind.months[2] = '60 000 €';                     // March above target
  const act = { kpiId: ind.id, status: 'effective', closedAt: '20/01/2026' };
  assert.match(app.checkActionEffectiveness(tool, act).label, /Récidive/);   // judged on February
  act.closedAt = '10/02/2026';
  assert.match(app.checkActionEffectiveness(tool, act).label, /Efficacité démontrée/);   // judged on March
  assert.match(app.checkActionEffectiveness(tool, { ...act, status: 'in_progress' }).label, /À mesurer/);
});

test('shared storage: flatten then unflatten keeps values, actions and settings', () => {
  const tool = demo();
  tool.pmeSettings = { margeNettePct: 8 };
  const map = app.flattenKpiTool(tool);
  assert.ok(Object.keys(map).some(k => k.startsWith('value|kpi_ca|2026-')));
  const back = app.unflattenKpiTool(JSON.parse(JSON.stringify(map)));
  assert.deepEqual(plain(back.processes.map(p => p.indicators.map(i => i.months))), plain(tool.processes.map(p => p.indicators.map(i => i.months.map(v => app.isKpiCellFilled(v) ? v : '')))));
  assert.deepEqual(plain(back.actionRegistry.map(a => a.id)), plain(tool.actionRegistry.map(a => a.id)));
  assert.equal(back.pmeSettings.margeNettePct, 8);
});

test('shared storage: confidential values go to the direction folder', () => {
  const tool = demo();
  const conf = tool.processes.flatMap(p => p.indicators).find(i => i.isConfidential);
  const open = tool.processes.flatMap(p => p.indicators).find(i => !i.isConfidential);
  assert.equal(app.bucketOfKey(`value|${conf.id}|2026-01`, tool), 'direction');
  assert.equal(app.bucketOfKey(`value|${open.id}|2026-01`, tool), 'equipe');
  assert.equal(app.bucketOfKey('settings', tool), 'direction');
  assert.equal(app.bucketOfKey(`kpi|${conf.id}`, tool), 'equipe');
});

test('trend: 3-month moving average needs 3 consecutive months', () => {
  const ma = app.kpiMovingAverage(kpi({ months: ['3', '6', '9', '', '12', '15', '18'] }));
  assert.deepEqual(plain(ma), [null, null, 6, null, null, null, 15]);
});

test('trend: none before 6 entered months, direction judged against the goal', () => {
  assert.equal(app.kpiTrend(kpi({ months: ['1', '2', '3', '4', '5'] }), 4), null);
  const up = app.kpiTrend(kpi({ targetVal: 0.5, months: ['100', '100', '100', '110', '120', '130'] }), 5);
  assert.equal(up.dir, 'up');
  assert.equal(up.isGood, true);
  const lower = app.kpiTrend(kpi({ goalDirection: 'lower', targetVal: 1000, months: ['100', '100', '100', '110', '120', '130'] }), 5);
  assert.equal(lower.isGood, false);
});

test('slow drift: compliant KPI whose average worsens 3 months in a row', () => {
  const ind = kpi({ targetVal: 30, months: ['35', '35', '34.5', '34', '33', '32', '31.5', '30.5'] });
  assert.equal(app.kpiTrend(ind, 7).drifting, true);
  // same slope but already below target: it is an alert, not a slow drift
  assert.equal(app.kpiTrend({ ...ind, targetVal: 31 }, 7).drifting, false);
  // a clear rebound lifts the 3-month average and breaks the chain
  assert.equal(app.kpiTrend(kpi({ targetVal: 30, months: ['35', '35', '34.5', '34', '33', '36', '31.5', '30.5'] }), 7).drifting, false);
});
