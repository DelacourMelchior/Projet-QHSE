// One-off extraction of the demo data and job templates (industrie, BTP, services)
// from the previous app (../app/tool_page.html) into src/domain/legacy-templates.json.
// Run: node scripts/extract-templates.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'tool_page.html'), 'utf8');
const main = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).reduce((a, b) => (b.length > a.length ? b : a));
const el = () => new Proxy({ classList: { add() {}, remove() {}, toggle() {} }, style: {}, appendChild() {}, querySelectorAll: () => [], addEventListener() {} }, { get: (t, k) => t[k], set: (t, k, v) => { t[k] = v; return true; } });
const ctx = {
  console, setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame() {}, alert() {}, confirm: () => true,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: { getElementById: () => el(), querySelector: () => null, querySelectorAll: () => [], createElement: el, addEventListener() {}, body: el() },
  navigator: {}, indexedDB: {},
};
ctx.window = Object.assign(ctx, { addEventListener() {}, location: { search: '' }, history: { pushState() {} } });
vm.createContext(ctx);
vm.runInContext(main + '\n;globalThis.__out = { demo: INITIAL_TOOLS_DATA["1.1"], profiles: PME_PROFILES };', ctx);
const { demo, profiles } = ctx.__out;
const strip = procs => procs.map(p => ({ id: p.id, name: p.name, indicators: p.indicators.map(({ months, actionPilot, actionDeadline, actionText, actionDone, ...rest }) => rest) }));
const out = {
  demo: { processes: demo.processes, actionRegistry: demo.actionRegistry },
  profiles: {
    industrie: { name: profiles.industrie.name, processes: strip(demo.processes) },
    btp: { name: profiles.btp.name, processes: strip(profiles.btp.processes) },
    services: { name: profiles.services.name, processes: strip(profiles.services.processes) },
  },
};
fs.writeFileSync(path.join(__dirname, '..', 'src', 'domain', 'legacy-templates.json'), JSON.stringify(out, null, 1));
console.log('demo KPIs', demo.processes.reduce((n, p) => n + p.indicators.length, 0), 'actions', demo.actionRegistry.length,
  '| profiles', Object.entries(out.profiles).map(([k, v]) => `${k}:${v.processes.reduce((n, p) => n + p.indicators.length, 0)}`).join(' '));
