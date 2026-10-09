// Example records of tool 3.3 "Maintenance" for the fictitious company of the demo (same people, machines and defects as the other tools): nine pieces of
// equipment of every kind that show every state of the tool, the common cabinet of spare parts, and small drawings instead of photos. Equipment: routine done,
// due, late, never made; a point to watch (once, twice in a row); anomalies open, taken in charge, waiting for a part, repaired; two stops, one longer than
// the Plan B tolerates; breakdowns with their cause, impact, hours and cost; checks late, to plan, planned, with remarks to lift, with a report; a calibration
// due; a contract that ends; a piece retired. Cabinet: every level, an order in time and a late one, a part received, a date limit, a part for three machines.
// Dates are relative to today, so the same day always gives the same records and the example stays alive.
import type { Anomaly, CheckDone, CheckLife, Checkpoint, EqCheck, EqHelper, Equipment, Every, Inspection, MaintSettings, Nc, Params, PointResult, Spare, SpareMove } from './types';
import { addDays, daysBetween, fillEmptyCollections, nowLocal } from './base';
import { isoDate } from './periods';
import { norm } from './instructions';
import { sopExampleParams } from './instructionsExamples';

// ---- drawings (ASCII only, written in base 64 like those of tool 3.2): what a point in order looks like, the parts, the equipment, the reports
const GREEN = '#16a34a', RED = '#dc2626';
const MARK = {
  '': '',
  ok: `<circle cx="352" cy="250" r="26" fill="${GREEN}"/><path d="M340 250l9 10 17-20" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ko: `<circle cx="352" cy="250" r="26" fill="${RED}"/><path d="M341 239l22 22M363 239l-22 22" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
};
const art = (body: string, mark: keyof typeof MARK = '') => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eef2f1"/><rect y="240" width="400" height="60" fill="#dbe3e1"/>${body}${MARK[mark]}</svg>`)))}`;
const say = (x: number, y: number, t: string, size = 22, fill = '#0f172a') => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" font-family="sans-serif" fill="${fill}">${t}</text>`;
const at = (r: number, a: number) => `${Math.round(200 + r * Math.cos(a * Math.PI / 180))} ${Math.round(140 + r * Math.sin(a * Math.PI / 180))}`;
const band = (a0: number, a1: number, c: string) => `<path d="M${at(78, a0)}A78 78 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${at(78, a1)}" stroke="${c}" stroke-width="16" fill="none"/>`;
// A pressure dial: the green zone is up, the needle says where the reading stands
const dial = (a: number, t: string, mark: keyof typeof MARK = 'ok') => art(`<circle cx="200" cy="140" r="100" fill="#f8fafc" stroke="#475569" stroke-width="8"/>${band(135, 215, RED)}${band(215, 325, GREEN)}${band(325, 405, RED)}<path d="M200 140L${at(62, a)}" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/><circle cx="200" cy="140" r="9" fill="#0f172a"/>${say(200, 208, t)}`, mark);
const press = (c: string) => art(`<rect x="80" y="40" width="44" height="200" fill="${c}"/><rect x="276" y="40" width="44" height="200" fill="${c}"/><rect x="80" y="40" width="240" height="44" fill="${c}"/><rect x="170" y="84" width="60" height="76" fill="#94a3b8"/><polygon points="180,160 220,160 200,190" fill="#334155"/><rect x="80" y="205" width="240" height="35" fill="#334155"/><path d="M110 200L200 196L290 200" stroke="#b45309" stroke-width="8" fill="none" stroke-linecap="round"/>`);
const wrench = (extra = '', mark: keyof typeof MARK = 'ok') => art(`<path d="M70 215L260 100" stroke="#64748b" stroke-width="22" stroke-linecap="round"/><path d="M70 215L150 167" stroke="#0f172a" stroke-width="26" stroke-linecap="round"/><circle cx="285" cy="85" r="30" fill="#475569"/><circle cx="285" cy="85" r="12" fill="#cbd5e1"/><rect x="160" y="153" width="70" height="16" transform="rotate(-31 195 161)" fill="#fff" stroke="#94a3b8" stroke-width="2"/>${extra}`, mark);
// A sheet of paper: a report, a certificate, a cover of manual
const sheet = (title: string, stamp: string, col: string, mark: keyof typeof MARK = '') => art(`<rect x="110" y="30" width="180" height="215" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="4"/>${say(200, 66, title, 17)}<path d="M130 86h140M130 106h140M130 126h110M130 146h140M130 166h90" stroke="#cbd5e1" stroke-width="6"/>${stamp ? `<rect x="124" y="188" width="152" height="38" rx="6" fill="none" stroke="${col}" stroke-width="5" transform="rotate(-6 200 207)"/>${say(200, 213, stamp, 15, col)}` : ''}`, mark);
const plate = (lines: string[]) => art(`<rect x="50" y="50" width="300" height="170" rx="10" fill="#94a3b8" stroke="#475569" stroke-width="5"/><circle cx="72" cy="72" r="6" fill="#475569"/><circle cx="328" cy="72" r="6" fill="#475569"/><circle cx="72" cy="198" r="6" fill="#475569"/><circle cx="328" cy="198" r="6" fill="#475569"/>${lines.map((t, i) => `<text x="76" y="${96 + i * 30}" font-size="${i ? 19 : 22}" font-family="monospace" font-weight="${i ? 400 : 700}" fill="#0f172a">${t}</text>`).join('')}`);
const drawer = (n: number) => art(`<rect x="90" y="30" width="220" height="210" rx="6" fill="#64748b"/>${[0, 1, 2, 3].map(i => `<rect x="100" y="${40 + i * 49}" width="200" height="41" rx="4" fill="${i === n - 1 ? '#fbbf24' : '#cbd5e1'}"/><rect x="180" y="${54 + i * 49}" width="40" height="8" rx="3" fill="#475569"/>`).join('')}${say(200, 280, `TIROIR ${n}`, 20)}`);

// Everything is drawn once, when the example is asked for
let drawn: ReturnType<typeof draw> | undefined;
const pics = () => (drawn ||= draw());
function draw() {
  // what a point in order looks like (the reference photo of a point)
  const ref = {
    level: art('<rect x="150" y="50" width="100" height="190" rx="10" fill="#e2e8f0" stroke="#475569" stroke-width="6"/><rect x="158" y="130" width="84" height="102" rx="4" fill="#f59e0b"/><path d="M150 100h-34M150 200h-34" stroke="#0f172a" stroke-width="4"/><text x="40" y="106" font-size="20" font-family="sans-serif" fill="#0f172a">MAXI</text><text x="40" y="206" font-size="20" font-family="sans-serif" fill="#0f172a">MINI</text><path d="M300 130H268M268 130l12-9M268 130l12 9" stroke="#16a34a" stroke-width="8" stroke-linecap="round" fill="none"/>', 'ok'),
    dial: dial(270, '6.5 bar'),
    dialPa: dial(270, '30 Pa'),
    leak: art('<rect x="50" y="110" width="300" height="36" rx="6" fill="#64748b"/><rect x="176" y="98" width="48" height="60" rx="5" fill="#334155"/><rect x="150" y="190" width="100" height="40" rx="4" fill="#fff" stroke="#94a3b8" stroke-width="4"/>', 'ok'),
    noise: art('<rect x="80" y="110" width="150" height="90" rx="12" fill="#475569"/><circle cx="262" cy="155" r="30" fill="#94a3b8"/><circle cx="262" cy="155" r="10" fill="#475569"/><path d="M305 125a40 40 0 0 1 0 60M325 105a62 62 0 0 1 0 100" stroke="#16a34a" stroke-width="6" fill="none" stroke-linecap="round"/>', 'ok'),
    clean: art('<rect x="100" y="140" width="130" height="100" rx="6" fill="#64748b"/><rect x="90" y="128" width="150" height="18" rx="4" fill="#475569"/><path d="M270 150l14-14M286 176h20M270 202l14 14" stroke="#16a34a" stroke-width="7" stroke-linecap="round"/>', 'ok'),
    estop: art(`<rect x="125" y="40" width="150" height="180" rx="10" fill="#fbbf24" stroke="#92400e" stroke-width="5"/><circle cx="200" cy="110" r="45" fill="#b91c1c" stroke="#7f1d1d" stroke-width="6"/>${say(200, 200, 'STOP', 26)}`, 'ok'),
    guard: art('<rect x="60" y="50" width="200" height="190" rx="6" fill="#cbd5e1" stroke="#64748b" stroke-width="5"/><rect x="85" y="75" width="150" height="140" fill="#bae6fd" fill-opacity=".6" stroke="#475569" stroke-width="4"/><rect x="278" y="120" width="44" height="56" rx="5" fill="#334155"/><circle cx="300" cy="140" r="9" fill="#22c55e"/>', 'ok'),
    beams: art('<rect x="90" y="40" width="22" height="200" rx="4" fill="#334155"/><rect x="288" y="40" width="22" height="200" rx="4" fill="#334155"/><path d="M112 80h176M112 120h176M112 160h176M112 200h176" stroke="#ef4444" stroke-width="4" stroke-dasharray="14 8"/>', 'ok'),
    filter: art(`<rect x="90" y="50" width="220" height="180" rx="6" fill="#fef3c7" stroke="#92400e" stroke-width="6"/><path d="${Array.from({ length: 12 }, (_, i) => `M${108 + i * 17} 62v156`).join('')}" stroke="#d6b36a" stroke-width="5"/>`, 'ok'),
    thermo: art(`<rect x="185" y="30" width="30" height="170" rx="15" fill="#e2e8f0" stroke="#475569" stroke-width="5"/><circle cx="200" cy="205" r="28" fill="#dc2626"/><rect x="194" y="100" width="12" height="100" fill="#dc2626"/><path d="M228 90h44M228 120h44M228 150h44" stroke="#16a34a" stroke-width="6"/>${say(120, 120, '180 C', 22)}`, 'ok'),
    tire: art('<circle cx="190" cy="140" r="95" fill="#1f2937"/><circle cx="190" cy="140" r="55" fill="#94a3b8"/><circle cx="190" cy="140" r="14" fill="#475569"/><path d="M190 140L190 90M190 140L233 165M190 140L147 165" stroke="#475569" stroke-width="8"/><rect x="300" y="110" width="50" height="50" rx="6" fill="#f8fafc" stroke="#475569" stroke-width="4"/>', 'ok'),
    brake: art('<circle cx="180" cy="140" r="90" fill="#94a3b8" stroke="#475569" stroke-width="6"/><circle cx="180" cy="140" r="30" fill="#e2e8f0" stroke="#475569" stroke-width="4"/><circle cx="180" cy="80" r="8" fill="#eef2f1"/><circle cx="232" cy="170" r="8" fill="#eef2f1"/><circle cx="128" cy="170" r="8" fill="#eef2f1"/><rect x="250" y="95" width="60" height="90" rx="8" fill="#dc2626"/>', 'ok'),
    lights: art('<path d="M70 150a90 90 0 0 1 90-70h50v140h-50a90 90 0 0 1-90-70z" fill="#f1f5f9" stroke="#64748b" stroke-width="6"/><circle cx="150" cy="150" r="30" fill="#fde68a"/><path d="M230 100h90M230 150h100M230 200h90" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>', 'ok'),
    aid: art('<rect x="70" y="80" width="140" height="120" rx="10" fill="#fff" stroke="#16a34a" stroke-width="6"/><path d="M140 100v80M100 140h80" stroke="#16a34a" stroke-width="20"/><rect x="250" y="80" width="56" height="140" rx="24" fill="#dc2626"/><rect x="266" y="56" width="24" height="30" fill="#334155"/>', 'ok'),
    leds: art(`<path d="${[0, 1, 2, 3].map(i => `M60 ${50 + i * 46}h280v36h-280z`).join('')}" fill="#1f2937"/>${[0, 1, 2, 3].map(i => `<circle cx="310" cy="${68 + i * 46}" r="8" fill="#22c55e"/><rect x="80" y="${60 + i * 46}" width="150" height="16" rx="3" fill="#334155"/>`).join('')}`, 'ok'),
    ups: art(`<rect x="90" y="60" width="220" height="150" rx="10" fill="#1f2937"/><rect x="112" y="84" width="120" height="44" fill="#0f172a"/><rect x="120" y="94" width="24" height="24" fill="#22c55e"/><rect x="150" y="94" width="24" height="24" fill="#22c55e"/><rect x="180" y="94" width="24" height="24" fill="#22c55e"/><circle cx="270" cy="106" r="12" fill="#22c55e"/>${say(200, 180, '25 MIN', 22, '#e2e8f0')}`, 'ok'),
    drain: art('<rect x="90" y="40" width="170" height="110" rx="14" fill="#2563eb"/><rect x="160" y="150" width="30" height="40" fill="#475569"/><path d="M175 205c-8 12-10 16-10 22a10 10 0 0 0 20 0c0-6-2-10-10-22z" fill="#38bdf8"/><path d="M290 130h-16m16 0l-8-6m8 6l-8 6" stroke="#16a34a" stroke-width="6" fill="none"/>', 'ok'),
    fork: art('<rect x="250" y="30" width="22" height="200" fill="#334155"/><rect x="70" y="212" width="200" height="14" rx="4" fill="#475569"/><path d="M272 60h36v150h-36" stroke="#64748b" stroke-width="8" stroke-dasharray="9 6" fill="none"/>', 'ok'),
    label: art(`<rect x="90" y="70" width="220" height="130" rx="6" fill="#fff" stroke="#16a34a" stroke-width="6"/>${say(200, 120, 'ETALONNE', 28)}${say(200, 160, 'N 0417', 24)}<path d="M110 180h180" stroke="#cbd5e1" stroke-width="6"/>`, 'ok'),
    backup: sheet('SAUVEGARDE', 'TERMINEE', GREEN, 'ok'),
    torque: wrench(),
    click: wrench(`<text x="330" y="60" font-size="26" font-family="sans-serif" font-weight="700" fill="${GREEN}">CLIC</text>`),
  };
  // the part and its place in the cabinet
  const part = {
    belt: art('<ellipse cx="200" cy="140" rx="130" ry="62" fill="none" stroke="#1f2937" stroke-width="24"/><ellipse cx="200" cy="140" rx="116" ry="50" fill="none" stroke="#64748b" stroke-width="8" stroke-dasharray="7 9"/>'),
    beltBroken: art('<path d="M70 140a130 62 0 0 1 130-62" fill="none" stroke="#1f2937" stroke-width="24"/><path d="M330 140a130 62 0 0 1-130 62" fill="none" stroke="#1f2937" stroke-width="24"/><path d="M200 78l18 14l-8 10M200 202l-14-14l10-8" stroke="#1f2937" stroke-width="10" fill="none"/>', 'ko'),
    valve: art('<rect x="120" y="120" width="160" height="62" rx="8" fill="#94a3b8"/><rect x="170" y="70" width="60" height="56" rx="6" fill="#1f2937"/><circle cx="200" cy="98" r="9" fill="#fbbf24"/><rect x="84" y="140" width="40" height="22" fill="#64748b"/><rect x="276" y="140" width="40" height="22" fill="#64748b"/><path d="M230 90h40v-30" stroke="#dc2626" stroke-width="5" fill="none"/>'),
    seals: art('<circle cx="150" cy="150" r="48" fill="none" stroke="#1f2937" stroke-width="18"/><circle cx="250" cy="120" r="34" fill="none" stroke="#1f2937" stroke-width="16"/><circle cx="305" cy="185" r="26" fill="none" stroke="#1f2937" stroke-width="14"/>'),
    bush: art('<circle cx="200" cy="140" r="78" fill="#94a3b8" stroke="#475569" stroke-width="6"/><circle cx="200" cy="140" r="36" fill="#eef2f1" stroke="#475569" stroke-width="6"/><rect x="192" y="96" width="16" height="14" fill="#eef2f1"/>'),
    cartridge: art(`<rect x="140" y="50" width="120" height="170" rx="14" fill="#fde68a" stroke="#92400e" stroke-width="6"/><path d="${Array.from({ length: 6 }, (_, i) => `M${160 + i * 16} 62v146`).join('')}" stroke="#d6b36a" stroke-width="5"/><rect x="140" y="50" width="120" height="14" rx="6" fill="#92400e"/>`),
    hose: art('<path d="M60 215C130 215 120 110 200 110S290 60 340 60" stroke="#1f2937" stroke-width="28" fill="none" stroke-linecap="round"/><rect x="46" y="198" width="34" height="34" rx="4" fill="#94a3b8"/><rect x="324" y="44" width="34" height="34" rx="4" fill="#94a3b8"/>'),
    disk: art(`<rect x="100" y="60" width="200" height="140" rx="8" fill="#94a3b8" stroke="#475569" stroke-width="6"/><rect x="122" y="84" width="110" height="64" fill="#fff"/>${say(177, 126, '4 TO', 24)}<circle cx="268" cy="176" r="10" fill="#475569"/>`),
    battery: art(`<rect x="90" y="90" width="220" height="120" rx="8" fill="#1f2937"/><rect x="120" y="68" width="34" height="26" fill="#dc2626"/><rect x="246" y="68" width="34" height="26" fill="#334155"/>${say(200, 164, '12 V', 28, '#e2e8f0')}`),
    fuses: art('<rect x="90" y="110" width="40" height="100" rx="8" fill="#fef3c7" stroke="#92400e" stroke-width="5"/><rect x="146" y="110" width="40" height="100" rx="8" fill="#fef3c7" stroke="#92400e" stroke-width="5"/><rect x="202" y="110" width="40" height="100" rx="8" fill="#fef3c7" stroke="#92400e" stroke-width="5"/><circle cx="305" cy="160" r="34" fill="#fef9c3" stroke="#a16207" stroke-width="5"/>'),
    drawer1: drawer(1), drawer2: drawer(2), drawer3: drawer(3), drawer4: drawer(4),
    rack: art(`<rect x="60" y="60" width="280" height="14" fill="#475569"/><rect x="60" y="150" width="280" height="14" fill="#475569"/><rect x="60" y="60" width="14" height="180" fill="#475569"/><rect x="326" y="60" width="14" height="180" fill="#475569"/><rect x="110" y="88" width="70" height="62" rx="4" fill="#cbd5e1"/><rect x="200" y="100" width="70" height="50" rx="4" fill="#fbbf24"/>${say(200, 200, 'ETAGERE INFO', 20)}`),
  };
  // the equipment
  const eq = {
    cnc: art('<rect x="50" y="60" width="240" height="180" rx="8" fill="#cbd5e1" stroke="#64748b" stroke-width="5"/><rect x="75" y="85" width="160" height="120" rx="4" fill="#bae6fd" fill-opacity=".7" stroke="#475569" stroke-width="5"/><rect x="146" y="95" width="28" height="50" fill="#475569"/><rect x="152" y="145" width="16" height="22" fill="#94a3b8"/><rect x="95" y="185" width="120" height="12" fill="#334155"/><rect x="250" y="85" width="30" height="64" rx="3" fill="#1f2937"/><circle cx="265" cy="100" r="5" fill="#22c55e"/><circle cx="265" cy="118" r="5" fill="#f59e0b"/><rect x="300" y="130" width="64" height="110" rx="4" fill="#94a3b8"/>'),
    press: press('#64748b'),
    oldPress: press('#78350f'),
    compressor: art('<rect x="60" y="150" width="240" height="72" rx="36" fill="#2563eb"/><rect x="100" y="218" width="16" height="22" fill="#334155"/><rect x="244" y="218" width="16" height="22" fill="#334155"/><rect x="100" y="92" width="110" height="60" rx="6" fill="#64748b"/><rect x="120" y="70" width="70" height="26" rx="4" fill="#94a3b8"/><circle cx="250" cy="110" r="28" fill="#f8fafc" stroke="#334155" stroke-width="6"/><path d="M250 110l14-14" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/><path d="M210 125h14M210 140h14" stroke="#334155" stroke-width="5"/>'),
    forklift: art('<rect x="96" y="40" width="14" height="200" fill="#475569"/><rect x="40" y="214" width="76" height="12" rx="3" fill="#334155"/><rect x="130" y="130" width="160" height="76" rx="10" fill="#f59e0b"/><path d="M150 130v-62h96v62" stroke="#334155" stroke-width="8" fill="none"/><rect x="262" y="140" width="48" height="66" rx="8" fill="#d97706"/><circle cx="170" cy="214" r="26" fill="#1f2937"/><circle cx="268" cy="214" r="22" fill="#1f2937"/><circle cx="170" cy="214" r="9" fill="#94a3b8"/><circle cx="268" cy="214" r="8" fill="#94a3b8"/><rect x="172" y="100" width="40" height="30" rx="4" fill="#0f172a"/>'),
    booth: art('<rect x="40" y="50" width="320" height="190" rx="6" fill="#e2e8f0" stroke="#64748b" stroke-width="5"/><rect x="140" y="26" width="90" height="26" fill="#94a3b8"/><rect x="62" y="80" width="170" height="160" fill="#94a3b8"/><path d="M120 80v40" stroke="#334155" stroke-width="5"/><rect x="104" y="120" width="32" height="76" rx="4" fill="#0f766e"/><rect x="262" y="80" width="80" height="160" rx="4" fill="#b45309"/><circle cx="302" cy="115" r="10" fill="#fde68a"/><rect x="278" y="150" width="48" height="10" fill="#fde68a" fill-opacity=".5"/>'),
    van: art('<rect x="50" y="90" width="210" height="120" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="4"/><path d="M260 130h50l34 45v35h-84z" fill="#0f766e"/><path d="M276 140h30l20 28h-50z" fill="#bae6fd"/><rect x="50" y="150" width="210" height="14" fill="#0f766e"/><circle cx="105" cy="214" r="26" fill="#1f2937"/><circle cx="305" cy="214" r="26" fill="#1f2937"/><circle cx="105" cy="214" r="10" fill="#94a3b8"/><circle cx="305" cy="214" r="10" fill="#94a3b8"/>'),
    server: art(`<rect x="130" y="30" width="140" height="210" rx="6" fill="#1f2937"/>${[0, 1, 2, 3, 4].map(i => `<rect x="140" y="${42 + i * 38}" width="120" height="30" rx="3" fill="#334155"/><circle cx="246" cy="${57 + i * 38}" r="5" fill="#22c55e"/><rect x="152" y="${52 + i * 38}" width="60" height="10" rx="2" fill="#475569"/>`).join('')}`),
    wrench: wrench('', ''),
  };
  // anomalies and breakdowns: what was seen
  const seen = {
    pressure: dial(205, '5.8 bar', 'ko'),
    cylinder: art('<rect x="70" y="100" width="260" height="56" rx="8" fill="#64748b"/><rect x="170" y="90" width="40" height="76" rx="4" fill="#334155"/><path d="M180 166c-4 10-6 14-6 20a6 6 0 0 0 12 0c0-6-2-10-6-20z" fill="#b45309"/><ellipse cx="190" cy="228" rx="40" ry="8" fill="#b45309" fill-opacity=".5"/>', 'ko'),
    airLeak: art('<rect x="90" y="120" width="190" height="40" rx="8" fill="#64748b"/><rect x="190" y="160" width="26" height="56" fill="#334155"/><path d="M230 200c14-4 30-4 44 0M232 220c16-4 34-4 50 0M226 180c12-4 24-4 36 0" stroke="#38bdf8" stroke-width="6" fill="none" stroke-linecap="round"/>', 'ko'),
    oilPuddle: art('<rect x="60" y="40" width="30" height="200" fill="#475569"/><rect x="30" y="214" width="110" height="12" fill="#334155"/><path d="M75 150c-6 14-8 20-8 28a8 8 0 0 0 16 0c0-8-2-14-8-28z" fill="#b45309"/><ellipse cx="190" cy="236" rx="110" ry="14" fill="#92400e" fill-opacity=".6"/>', 'ko'),
    doorSwitch: art('<rect x="70" y="50" width="190" height="190" rx="6" fill="#cbd5e1" stroke="#64748b" stroke-width="5"/><rect x="278" y="120" width="44" height="56" rx="5" fill="#334155"/><circle cx="300" cy="140" r="9" fill="#dc2626"/><path d="M270 110l-16-26M270 176l-16 26" stroke="#dc2626" stroke-width="6" stroke-linecap="round"/>', 'ko'),
    serverRed: art(`<rect x="130" y="30" width="140" height="210" rx="6" fill="#1f2937"/>${[0, 1, 2, 3, 4].map(i => `<rect x="140" y="${42 + i * 38}" width="120" height="30" rx="3" fill="#334155"/><circle cx="246" cy="${57 + i * 38}" r="5" fill="${i === 2 || i === 3 ? '#dc2626' : '#22c55e'}"/>`).join('')}`, 'ko'),
  };
  // what the plates and the documents look like
  const doc = {
    plateCnc: plate(['CONSTRUCTEUR X', 'MODELE CNC-5X 800', 'N SERIE 2019-0417', '400 V - 22 kW']),
    platePress: plate(['CONSTRUCTEUR Y', 'MODELE PP-300', 'N SERIE 18-2250', '300 TONNES']),
    plateComp: plate(['AIR SERVICE', 'MODELE VS-7.5', 'N SERIE 20-8841', '8 BAR - 7.5 kW']),
    plateLift: plate(['MANUTENTION M', 'MODELE E25', 'N SERIE 17-3092', '2500 KG']),
    plateBooth: plate(['CABINES R', 'MODELE CP-4', 'N SERIE 21-0073', '400 V - 35 kW']),
    plateVan: plate(['IMMAT. EX-123-AB', 'MARQUE F', 'PTAC 3500 KG', 'MISE EN CIRC. EXEMPLE']),
    plateServer: plate(['SERVEUR S', 'MODELE R450', 'N SERIE 22-5517', '2 X 4 TO RAID']),
    plateTool: plate(['CLE DYNAMO 2.5 NM', 'N IDENT. CD-0417', 'ECHELLE 0.5-5 NM', 'ETALONNEE ANNUELLE']),
    manual: (t: string) => sheet(t, '', GREEN),
    reportOk: sheet('RAPPORT', 'CONFORME', GREEN),
    reportRemarks: sheet('RAPPORT', 'OBSERVATIONS', '#b45309'),
    certificate: sheet('CERTIFICAT', 'ETALONNE', GREEN),
    registration: sheet('CARTE GRISE', '', GREEN),
  };
  return { ref, part, eq, seen, doc };
}

// ---- the example
const rt = (s: string): PointResult[] => [...s].map(c => (c === 'w' ? 'watch' : c === 'k' ? 'ko' : 'ok'));   // o = in order, w = to watch, k = anomaly
const daysOf = (e: Every) => Math.round(e.value * { j: 1, sem: 7, mois: 30.4375, an: 365.25 }[e.unit]);
const pad = (n: number) => String(n).padStart(2, '0');

export function maintenanceExamples(today = new Date()): { equipments: Record<string, Equipment>; spares: Record<string, Spare> } {
  const { ref, part, eq: photo, seen, doc } = pics();
  const d0 = (n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
  const ago = (n: number) => isoDate(d0(n)), ahead = (n: number) => ago(-n), now = isoDate(today);
  const rel = (years: number, months: number, days: number) => isoDate(new Date(today.getFullYear() + years, today.getMonth() + months, today.getDate() + days));
  const hoursAgo = (h: number) => nowLocal(new Date(today.getTime() - h * 3600000));
  const upTo = (iso: string) => (iso > now ? now : iso);   // a routine is never dated after today
  const stamp = (iso: string, h = 8, m = 30) => `${iso}T${pad(h)}:${pad(m)}`;
  // dates of the routines, inside the period that holds them: the k-th period before today, `off` days after its first day
  const wk = (dow: number, k: number, off = 0) => upTo(ago((today.getDay() - dow + 7) % 7 + 7 * k - off));
  const mo = (k: number, day: number) => upTo(isoDate(new Date(today.getFullYear(), today.getMonth() - k, day)));
  const fnStart = addDays('2024-01-01', 14 * Math.floor((daysBetween('2024-01-01', today) ?? 0) / 14));
  const fn = (k: number, off = 0) => upTo(addDays(fnStart, off - 14 * k));
  const workday = (n: number) => { let t = d0(0), c = 0; while (c < n) { t = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1); if (t.getDay() % 6) c++; } return isoDate(t); };

  const points = (rows: [label: string, criterion: string, photo: string, extra?: Partial<Checkpoint>][]): Checkpoint[] => rows.map(([label, criterion, p, extra], i) => ({ id: `cp${i}`, label, criterion, photo: p, ...extra }));
  type Row = [date: string, by: string, results: string, note?: string, values?: (number | null)[]] | null;
  const runs = (n: number, rows: Row[]): Inspection[] => rows.flatMap(r => (r ? [{ date: r[0], by: r[1], results: rt(r[2]), note: r[3] ?? '', ids: Array.from({ length: n }, (_, i) => `cp${i}`), ...(r[4] ? { values: r[4] } : {}) }] : []));
  const equipment = (p: Partial<Equipment> & Pick<Equipment, 'id' | 'name' | 'checkpoints'>): Equipment => ({ location: '', operator: '', manager: '', riskId: '', inspections: [], parts: [], ...p });
  const helper = (id: string, role: string, p: Partial<EqHelper> = {}): EqHelper => ({ id: `hp_demo_${id}`, role, ...p });
  const check = (id: string, label: string, every: Every, p: Partial<EqCheck> = {}): EqCheck => ({ id: `tk_demo_${id}`, label, every, everyDays: daysOf(every), lastDone: '', legal: false, ...p });
  const done = (date: string, by: string, result: CheckDone['result'] = 'ok', p: Partial<CheckDone> = {}): CheckDone => ({ date, by, result, note: '', ...p });
  // the life of the checks: the history, oldest first, and the last date of the check follows it
  const life = (tasks: EqCheck[], lives: Record<string, CheckLife>): Pick<Equipment, 'tasks' | 'checkLife'> => ({
    tasks: tasks.map(t => { const l = lives[t.id]; return l?.history.length ? { ...t, lastDone: l.history.map(h => h.date).sort().at(-1)! } : t; }),
    checkLife: lives,
  });
  const anomaly = (id: string, p: Partial<Anomaly> & Pick<Anomaly, 'label' | 'date'>): Anomaly => ({ id: `an_demo_${id}`, note: '', closedAt: '', ...p });

  // ---------------------------------------------------------------- 1. the CNC machining centre (Plan B "Casse broche"), routine done
  const cnc = equipment({
    id: 'eq_demo_cnc', name: "Centre d'usinage CNC 5 axes", kind: 'machine', location: 'Atelier principal', group: 'Atelier usinage', operator: 'Julien P.', deputy: 'Marc M.', manager: 'David K.', riskId: 'risk_demo_cnc',
    photo: photo.cnc, maker: 'Constructeur X', model: 'CNC-5X 800', serial: 'SN-2019-0417', since: '2019', plate: doc.plateCnc, pin: { x: 0.52, y: 0.64 },
    contactId: 'ct_demo_maint', manual: "Armoire du bureau d'atelier, classeur bleu", lastRevision: ago(300),
    docs: [{ label: "Notice d'utilisation et schémas électriques", photo: doc.manual('NOTICE CNC') }, { label: 'Programmes FAO et post-processeur', url: 'https://exemple.fr/cnc/programmes' }],
    contacts: [
      helper('cnc1', 'Service après-vente du constructeur', { contactId: 'ct_demo_maint' }), helper('cnc2', 'Hotline, diagnostic à distance', { contactId: 'ct_demo_maint_hot' }),
      helper('cnc3', 'Électricien de dépannage', { contactId: 'ct_demo_elec' }), helper('cnc4', 'Maintenance interne', { contactId: 'ct_demo_rachid' }),
    ],
    safety: ["Consigner l'alimentation électrique avant d'ouvrir le carter", 'Ne jamais intervenir broche en rotation', "Habilitation électrique pour l'armoire de commande"],
    contract: { provider: 'Constructeur X', contactId: 'ct_demo_maint', until: ahead(45), response: 'Intervention sous 48 h ouvrées', note: 'Contrat n° M-5520, visite préventive annuelle comprise' },
    checkpoints: points([
      ["Niveau d'huile ou de fluide", 'Entre le mini et le maxi de la jauge', ref.level], ['Pression ou alimentation', 'Manomètre stable à 6,5 bars (entre 6 et 7)', ref.dial, { min: 6, max: 7, unit: 'bar' }],
      ['Bruit et vibrations', 'Rotation silencieuse, aucun sifflement', ref.noise], ['Fuites et propreté', 'Bacs vidés, aucun suintement', ref.clean], ["Arrêts d'urgence et protections", "Coupure immédiate à l'ouverture de la porte", ref.estop],
    ]),
    // the pressure came back to the same point three times in 12 weeks; this week the pressure is low again and a noise on the spindle is to watch
    inspections: runs(5, [
      [wk(1, 0), 'Julien P.', 'okwoo', 'Manomètre à 5,8 bars, léger bruit à la broche', [null, 5.8, null, null, null]], [wk(1, 1), 'Julien P.', 'ooooo', '', [null, 6.4, null, null, null]],
      [wk(1, 2, 1), 'Marc M.', 'ooooo', '', [null, 6.5, null, null, null]], [wk(1, 3), 'Julien P.', 'ooooo', 'Pression revenue à la normale après réglage', [null, 6.5, null, null, null]],
      [wk(1, 4), 'Julien P.', 'okooo', 'Pression basse, remontée au détendeur', [null, 5.9, null, null, null]], null,
      [wk(1, 6), 'Julien P.', 'ooooo', '', [null, 6.4, null, null, null]], [wk(1, 7), 'Julien P.', 'ooooo', 'Pression revenue à la normale', [null, 6.5, null, null, null]],
      [wk(1, 8, 1), 'Julien P.', 'okooo', 'Manomètre à 5,7 bars', [null, 5.7, null, null, null]], [wk(1, 9), 'Julien P.', 'ooooo', '', [null, 6.5, null, null, null]],
      [wk(1, 10), 'Julien P.', 'ooooo', '', [null, 6.4, null, null, null]], [wk(1, 11), 'Marc M.', 'ooooo', '', [null, 6.5, null, null, null]],
    ]),
    anomalies: [
      anomaly('cnc', { label: 'Pression pneumatique', date: wk(1, 0), note: "Manomètre à 5,8 bars : l'électrovanne de l'axe Z ne tient pas la pression", pointId: 'cp1', photo: seen.pressure, severity: 'degraded', nature: 'Fonctionnement', by: 'Julien P.', handler: 'David K.', dueAt: ahead(3), waitingFor: 'Pièce', spareId: 'sp_demo_electrovanne' }),
      anomaly('cnc_2', { label: 'Pression pneumatique', date: wk(1, 4), note: 'Manomètre à 5,9 bars', pointId: 'cp1', severity: 'degraded', nature: 'Fonctionnement', by: 'Julien P.', handler: 'David K.', repairedAt: wk(1, 4, 1), closedAt: wk(1, 3) }),
      anomaly('cnc_1', { label: 'Pression pneumatique', date: wk(1, 8, 1), note: 'Manomètre à 5,7 bars', pointId: 'cp1', severity: 'degraded', nature: 'Fonctionnement', by: 'Julien P.', handler: 'David K.', repairedAt: wk(1, 8, 3), closedAt: wk(1, 7) }),
    ],
    breakdowns: [{
      id: 'bd_demo_1', date: ago(120), startedAt: stamp(ago(120), 7, 40), endedAt: stamp(ago(120), 23, 40), hours: 16, cost: 2400, cause: "Casse d'une pièce", note: "Courroie crantée de l'axe Z cassée, remplacée et tension contrôlée",
      impact: 'stopped', deliveryIds: ['dl_demo_5'], planB: false, repairBy: 'maker', repairWho: 'Technicien du constructeur', contactId: 'ct_demo_maint', fix: 'definitive', photo: part.beltBroken,
    }],
    ...life([
      check('1', 'Vérification périodique des installations électriques', { value: 1, unit: 'an' }, { legal: true, kind: 'periodic', by: 'provider', who: 'Électricité Martin', contactId: 'ct_demo_elec' }),
      check('2', 'Vidange et graissage de la broche', { value: 3, unit: 'mois' }, { kind: 'preventive', by: 'internal', who: 'Rachid H.' }),
    ], {
      tk_demo_1: { history: [done(rel(-2, 0, 20), 'Électricité Martin', 'ok', { report: doc.reportOk }), done(rel(-1, 0, 20), 'Électricité Martin', 'ok', { report: doc.reportOk, note: 'Aucune observation' })] },
      tk_demo_2: { history: [done(ago(130), 'Rachid H.', 'ok', { note: 'Huile et graisse remplacées' }), done(ago(40), 'Rachid H.', 'ok', { note: 'Huile et graisse remplacées' })] },
    }),
  });

  // ---------------------------------------------------------------- 2. the press brake, routine to do, a point to watch twice in a row (no Plan B, no instruction posted)
  const pressBrake = equipment({
    id: 'eq_demo_plieuse', name: 'Presse plieuse 300 t', kind: 'machine', location: 'Atelier tôlerie', group: 'Atelier tôlerie', operator: 'Karim T.', deputy: 'Nicolas R.', manager: 'David K.', riskId: '', sopId: 'sop_demo_2',
    photo: photo.press, maker: 'Constructeur Y', model: 'PP-300', serial: 'SN-18-2250', since: '2018', plate: doc.platePress, pin: { x: 0.64, y: 0.37 },
    docs: [{ label: 'Notice et schéma hydraulique', photo: doc.manual('NOTICE PRESSE') }],
    contacts: [helper('pl1', 'Service après-vente du constructeur', { contactId: 'ct_demo_maint_sav' }), helper('pl2', 'Électricien de dépannage', { contactId: 'ct_demo_elec' }), helper('pl3', 'Maintenance interne', { contactId: 'ct_demo_rachid' })],
    safety: ['Consignation avant toute intervention', 'Coulisseau bloqué mécaniquement avant toute intervention dans la zone'],
    checkpoints: points([
      ["Niveau d'huile hydraulique", 'Entre le mini et le maxi', ref.level], ['Fuites sur les vérins', 'Aucun suintement', ref.leak], ['Barrières immatérielles', "Arrêt immédiat quand la main passe", ref.beams], ['Bruit de la pompe', 'Régulier, sans claquement', ref.noise],
    ]),
    inspections: runs(4, [
      [wk(1, 1, 1), 'Karim T.', 'owoo', 'Un peu d\'huile sur le vérin gauche'], [wk(1, 2, 1), 'Karim T.', 'owoo', 'Léger suintement au vérin gauche'], [wk(1, 3), 'Nicolas R.', 'oooo'], [wk(1, 4, 1), 'Karim T.', 'oooo'],
      [wk(1, 5), 'Karim T.', 'oooo'], null, [wk(1, 7, 1), 'Karim T.', 'oooo'], [wk(1, 8), 'Karim T.', 'oooo'], [wk(1, 9, 1), 'Nicolas R.', 'oooo'], [wk(1, 10), 'Karim T.', 'oooo'],
    ]),
    anomalies: [anomaly('plieuse', { label: 'Fuites sur les vérins', date: wk(1, 1, 1), note: 'À surveiller deux routines de suite', pointId: 'cp1', photo: seen.cylinder, severity: 'degraded', nature: 'Fuite', by: 'Karim T.' })],
    routineDraft: { date: now, by: 'Karim T.', results: { cp0: 'ok', cp1: 'watch' }, values: {}, note: '' },
    ...life([check('3', 'Vérification des protections et barrières immatérielles', { value: 6, unit: 'mois' }, { legal: true, kind: 'periodic', by: 'agreed', who: 'Organisme de contrôle agréé' })], {
      tk_demo_3: { history: [done(ago(290), 'Organisme de contrôle agréé', 'ok', { report: doc.reportOk }), done(ago(110), 'Organisme de contrôle agréé', 'ok', { report: doc.reportOk })] },
    }),
  });

  // ---------------------------------------------------------------- 3. the air compressor, routine done on Fridays, an anomaly repaired and to verify, a check planned, a cause that comes back
  const compressor = equipment({
    id: 'eq_demo_compresseur', name: "Compresseur d'air à vis 7,5 kW", kind: 'machine', location: 'Local technique', group: 'Services généraux', operator: 'Rachid H.', deputy: 'Julien P.', manager: 'Rachid H.', bottleneck: false, routine: { every: 'week', day: 5 },
    photo: photo.compressor, maker: 'Air Service', model: 'VS-7.5', serial: 'SN-20-8841', since: '2020', plate: doc.plateComp, pin: { x: 0.46, y: 0.84 },
    docs: [{ label: 'Notice et carnet de suivi', photo: doc.manual('CARNET SUIVI') }],
    contacts: [helper('co1', 'Maintenance interne', { contactId: 'ct_demo_rachid' }), helper('co2', 'Organisme de contrôle agréé', { name: 'Bureau de contrôle des équipements sous pression', phone: '04 00 00 04 10', hours: 'lun-ven 8 h-17 h' })],
    safety: ['Réservoir sous pression : purge et consignation avant toute intervention'],
    checkpoints: points([
      ["Niveau d'huile du compresseur", 'Entre le mini et le maxi du voyant', ref.level], ['Pression du réseau', 'Entre 6,5 et 7,5 bars en charge', ref.dial, { min: 6.5, max: 7.5, unit: 'bar' }],
      ['Purge des condensats', 'Eau évacuée, purgeur sans fuite', ref.drain], ['Bruit et vibrations', 'Régulier, sans claquement', ref.noise], ['Température de sortie', 'Moins de 90 °C', ref.thermo, { max: 90, unit: '°C' }],
    ]),
    inspections: runs(5, [
      [wk(5, 0), 'Rachid H.', 'ookoo', "Le purgeur laisse échapper de l'air en continu", [null, 7.0, null, null, 82]], [wk(5, 1), 'Rachid H.', 'ooooo', '', [null, 7.1, null, null, 80]], [wk(5, 2), 'Rachid H.', 'ooooo', '', [null, 7.0, null, null, 81]],
      [wk(5, 3), 'Julien P.', 'ooooo', '', [null, 7.2, null, null, 79]], [wk(5, 4), 'Rachid H.', 'ooooo', '', [null, 7.1, null, null, 80]], [wk(5, 5), 'Rachid H.', 'ooowo', 'Bruit un peu plus fort', [null, 7.0, null, null, 83]],
      [wk(5, 6), 'Rachid H.', 'ooooo', '', [null, 7.1, null, null, 84]], [wk(5, 7), 'Rachid H.', 'ooooo', '', [null, 7.0, null, null, 81]], null, [wk(5, 9), 'Rachid H.', 'ooooo', '', [null, 7.1, null, null, 80]],
      [wk(5, 10), 'Rachid H.', 'ooooo', '', [null, 7.2, null, null, 80]], [wk(5, 11), 'Julien P.', 'ooooo', '', [null, 7.0, null, null, 79]],
    ]),
    anomalies: [anomaly('compresseur', { label: 'Purge des condensats', date: wk(5, 0), note: "Le purgeur laisse échapper de l'air en continu", pointId: 'cp2', photo: seen.airLeak, severity: 'degraded', nature: 'Fuite', by: 'Rachid H.', handler: 'Rachid H.', repairedAt: wk(5, 0, 1) })],
    breakdowns: [
      { id: 'bd_demo_comp1', date: ago(230), startedAt: stamp(ago(230), 9, 15), endedAt: stamp(ago(230), 14, 45), hours: 5.5, cost: 420, cause: "Casse d'une pièce", note: "Courroie d'entraînement cassée", impact: 'slowed', planB: false, repairBy: 'internal', repairWho: 'Rachid H.', contactId: 'ct_demo_rachid', fix: 'definitive' },
      { id: 'bd_demo_comp2', date: ago(35), startedAt: stamp(ago(35), 10, 0), endedAt: stamp(ago(35), 13, 0), hours: 3, cost: 260, cause: "Casse d'une pièce", note: "Électrovanne de purge bloquée ouverte : perte de pression sur tout l'atelier", impact: 'stopped', planB: false, repairBy: 'internal', repairWho: 'Rachid H.', contactId: 'ct_demo_rachid', fix: 'temporary' },
    ],
    ...life([check('4', 'Inspection des équipements sous pression', { value: 1, unit: 'an' }, { legal: true, kind: 'periodic', by: 'agreed', who: 'Bureau de contrôle des équipements sous pression' })], {
      tk_demo_4: { plannedAt: ahead(12), plannedWith: 'Bureau de contrôle des équipements sous pression', history: [done(rel(-2, 0, 25), 'Bureau de contrôle', 'ok', { report: doc.reportOk }), done(rel(-1, 0, 25), 'Bureau de contrôle', 'ok', { report: doc.reportOk })] },
    }),
  });

  // ---------------------------------------------------------------- 4. the forklift, stopped for a few hours, daily routine suspended, a check late (marked mandatory) and one never started
  const stop5 = new Date(today.getTime() - 5 * 3600000);
  const forklift = equipment({
    id: 'eq_demo_chariot', name: "Chariot élévateur 2,5 t (quai d'expédition)", kind: 'vehicle', location: "Quai d'expédition", group: 'Expédition', operator: 'Samuel G.', deputy: 'Fabien T.', manager: 'Rachid H.', bottleneck: false, sopId: 'sop_demo_5', routine: { every: 'day' },
    photo: photo.forklift, maker: 'Manutention M', model: 'E25', serial: 'SN-17-3092', since: '2017', plate: doc.plateLift, pin: { x: 0.84, y: 0.9 },
    docs: [{ label: 'Carnet de maintenance', url: 'https://exemple.fr/chariot/carnet' }],
    contacts: [helper('ch1', 'Concessionnaire (service après-vente)', { name: 'Manutention Services', phone: '04 00 00 04 11', hours: 'lun-ven 7 h 30-17 h, dépannage sous 4 h' }), helper('ch2', 'Maintenance interne', { contactId: 'ct_demo_rachid' })],
    safety: ['Conduite réservée aux personnes autorisées', "Fourches posées au sol avant de quitter l'engin"],
    stoppedSince: hoursAgo(5),
    checkpoints: points([
      ["Niveau d'huile hydraulique", 'Entre le mini et le maxi de la jauge', ref.level], ['Fourches, chaînes et mât', 'Sans fissure, déformation ni jeu', ref.fork], ['Pneus et freins', 'Sans coupure, freinage franc', ref.tire],
      ['Avertisseur, feux et gyrophare', 'Tous en état de marche', ref.lights], ["Arrêt d'urgence et ceinture", "Coupure à l'appui, ceinture en état", ref.estop],
    ]),
    inspections: runs(5, [
      [workday(1), 'Samuel G.', 'woooo', "Niveau d'huile un peu bas"], [workday(2), 'Samuel G.', 'ooooo'], [workday(3), 'Fabien T.', 'ooooo'], [workday(4), 'Samuel G.', 'ooooo'], [workday(5), 'Samuel G.', 'ooooo'],
      null, [workday(7), 'Samuel G.', 'ooooo'], [workday(8), 'Samuel G.', 'ooooo'], [workday(9), 'Fabien T.', 'ooooo'], [workday(10), 'Samuel G.', 'ooooo'], [workday(11), 'Samuel G.', 'ooooo'], [workday(12), 'Samuel G.', 'ooooo'],
    ]),
    anomalies: [anomaly('chariot', {
      label: "Fuite d'huile hydraulique sous le mât", date: isoDate(stop5), note: "Flaque sous le mât au démarrage ; le chariot est consigné au quai", pointId: 'cp0', photo: seen.oilPuddle, severity: 'stopped', nature: 'Fuite',
      by: 'Samuel G.', handler: 'Rachid H.', dueAt: ahead(1),
    })],
    breakdowns: [{ id: 'bd_demo_chariot', date: isoDate(stop5), startedAt: hoursAgo(5), hours: null, cost: null, cause: '', anomalyId: 'an_demo_chariot' }],
    ...life([
      check('5', 'Vérification générale périodique des appareils de levage', { value: 6, unit: 'mois' }, { legal: true, kind: 'periodic', by: 'agreed', who: 'Organisme de contrôle agréé' }),
      check('6', 'Graissage du mât et des chaînes', { value: 3, unit: 'mois' }, { kind: 'preventive', by: 'internal', who: 'Rachid H.' }),
    ], {
      tk_demo_5: { history: [done(ago(390), 'Organisme de contrôle agréé', 'ok', { report: doc.reportOk }), done(ago(210), 'Organisme de contrôle agréé', 'ok', { report: doc.reportOk })] },
    }),
  });

  // ---------------------------------------------------------------- 5. the paint booth and oven, routine late, a danger reported, remarks to lift (one late), instruction posted is the old one
  const booth = equipment({
    id: 'eq_demo_cabine', name: 'Cabine de peinture et four de cuisson', kind: 'installation', location: 'Atelier peinture', group: 'Atelier peinture', operator: 'Julien P.', deputy: 'Karim T.', manager: 'David K.', bottleneck: false, sopId: 'sop_demo_4',
    photo: photo.booth, maker: 'Cabines R', model: 'CP-4', serial: 'SN-21-0073', since: '2021', plate: doc.plateBooth, pin: { x: 0.74, y: 0.68 },
    docs: [{ label: 'Notice de la cabine et du four', photo: doc.manual('NOTICE CABINE') }],
    contacts: [helper('ca1', 'Installateur de la cabine', { name: 'Cabines et Fours du Rhône', phone: '04 00 00 04 12' }), helper('ca2', 'Électricien de dépannage', { contactId: 'ct_demo_elec' })],
    safety: ["Atmosphère inflammable : aucune source d'ignition", 'Ventilation en marche avant toute intervention'],
    checkpoints: points([
      ['Dépression de la cabine', 'Entre 20 et 40 Pa au manomètre', ref.dialPa, { min: 20, max: 40, unit: 'Pa' }], ['État des filtres', 'Propres, non colmatés', ref.filter], ['Température du four', 'Affichage à 180 °C, plus ou moins 5', ref.thermo, { min: 175, max: 185, unit: '°C' }],
      ['Propreté de la grille et du sol', 'Aucun dépôt de peinture', ref.clean], ['Verrouillage de la porte du four', "Le brûleur s'arrête à l'ouverture", ref.guard],
    ]),
    inspections: runs(5, [
      [wk(1, 3, 1), 'Julien P.', 'owooo', 'Filtres un peu chargés', [30, null, 181, null, null]], [wk(1, 4), 'Julien P.', 'ooooo', '', [32, null, 180, null, null]], [wk(1, 5, 1), 'Julien P.', 'ooooo', '', [31, null, 180, null, null]], null, null,
      [wk(1, 8), 'Karim T.', 'ooooo', '', [29, null, 179, null, null]], [wk(1, 9, 1), 'Julien P.', 'ooooo', '', [30, null, 180, null, null]], [wk(1, 10), 'Julien P.', 'ooooo', '', [31, null, 181, null, null]], [wk(1, 11, 1), 'Julien P.', 'ooooo', '', [30, null, 180, null, null]],
    ]),
    anomalies: [anomaly('cabine', {
      label: 'Verrouillage de la porte du four', date: ago(1), note: "Le micro-contact de la porte reste collé : le brûleur ne coupe pas à l'ouverture. Four consigné par cadenas en attendant la réparation",
      pointId: 'cp4', photo: seen.doorSwitch, severity: 'danger', nature: 'Sécurité', by: 'Julien P.', handler: 'David K.', dueAt: ahead(1),
    })],
    ...life([
      check('7', 'Ventilation et aspiration de la cabine', { value: 1, unit: 'an' }, { legal: true, kind: 'periodic', by: 'agreed', who: 'Organisme de contrôle agréé' }),
      check('12', 'Étalonnage du manomètre de dépression', { value: 1, unit: 'an' }, { kind: 'instrument', by: 'provider', who: 'Métrologie Rhône-Alpes', first: ahead(150) }),
    ], {
      tk_demo_7: {
        history: [done(ago(460), 'Organisme de contrôle agréé', 'ok', { report: doc.reportOk }), done(ago(95), 'Organisme de contrôle agréé', 'remarks', { report: doc.reportRemarks, note: 'Deux observations à lever' })],
        reserves: [
          { id: 'rs_demo_0', text: 'Reprendre le serrage du collier de la gaine', due: ago(60), liftedAt: ago(70) },
          { id: 'rs_demo_1', text: "Remplacer les filtres de la gaine d'extraction (colmatage)", due: ago(12), liftedAt: '' },
          { id: 'rs_demo_2', text: "Rétablir l'étiquette de débit nominal sur le ventilateur", due: ahead(25), liftedAt: '' },
        ],
      },
    }),
  });

  // ---------------------------------------------------------------- 6. the delivery van, routine never made (monthly), a check done with its report, a service planned later; no deputy yet
  const van = equipment({
    id: 'eq_demo_fourgon', name: "Fourgon d'expédition 3,5 t", kind: 'vehicle', location: 'Cour, devant le quai', group: 'Expédition', operator: 'Fabien T.', manager: 'Rachid H.', bottleneck: false, routine: { every: 'month' },
    photo: photo.van, maker: 'Marque F', model: 'Fourgon 3,5 t', serial: 'VF-EX-123-AB', since: '2022', plate: doc.plateVan,
    docs: [{ label: 'Carte grise', photo: doc.registration }],
    contacts: [helper('fo1', 'Garage partenaire', { name: 'Garage de la Gare', phone: '04 00 00 04 13', hours: 'lun-sam 8 h-18 h' }), helper('fo2', 'Assistance dépannage', { name: 'Assistance routière (contrat flotte)', phone: '0 800 00 04 00' })],
    checkpoints: points([
      ['Niveaux (huile, refroidissement, lave-glace)', 'Entre le mini et le maxi', ref.level], ['Pression des pneus', 'Conforme à la valeur indiquée sur le véhicule', ref.tire, { min: 2.3, max: 2.7, unit: 'bar' }], ['Freins et direction', 'Pédale ferme, aucun bruit anormal', ref.brake],
      ['Éclairage et signalisation', 'Tous les feux fonctionnent', ref.lights], ['Trousse de secours et extincteur', 'Présents et en état', ref.aid],
    ]),
    ...life([
      check('8', 'Contrôle technique du véhicule', { value: 2, unit: 'an' }, { legal: true, kind: 'periodic', by: 'provider', who: 'Centre de contrôle technique' }),
      check('9', 'Révision du constructeur', { value: 1, unit: 'an' }, { kind: 'preventive', by: 'provider', who: 'Garage de la Gare' }),
    ], {
      tk_demo_8: { history: [done(ago(980), 'Centre de contrôle technique', 'ok', { report: doc.reportOk }), done(ago(250), 'Centre de contrôle technique', 'ok', { report: doc.reportOk, note: 'Aucune contre-visite' })] },
      tk_demo_9: { history: [done(ago(200), 'Garage de la Gare', 'ok', { note: 'Vidange, filtres et plaquettes' })] },
    }),
  });

  // ---------------------------------------------------------------- 7. the file and ERP server (Plan B "Cyberattaque"), stopped for longer than the Plan B tolerates, waiting for a part
  const stop30 = new Date(today.getTime() - 30 * 3600000);
  const server = equipment({
    id: 'eq_demo_serveur', name: 'Serveur de fichiers et ERP', kind: 'it', location: 'Salle informatique, bureau', group: 'Bureau', operator: 'Thomas M.', deputy: 'Hélène R.', manager: 'Thomas M.', riskId: 'risk_demo_cyber', routine: { every: 'fortnight' },
    photo: photo.server, maker: 'Serveur S', model: 'R450', serial: 'SN-22-5517', since: '2022', plate: doc.plateServer,
    stoppedSince: hoursAgo(30),
    docs: [{ label: 'Procédure de restauration', url: 'https://exemple.fr/informatique/restauration' }],
    contacts: [helper('se1', 'Prestataire informatique', { contactId: 'ct_demo_it' }), helper('se2', 'Gérant, si la hotline ne répond pas', { contactId: 'ct_demo_itboss' }), helper('se3', 'Technicien réseau', { contactId: 'ct_demo_it_net' })],
    contract: { provider: 'Prestataire IT', contactId: 'ct_demo_it', until: ahead(200), response: 'Intervention sous 4 h', note: "Contrat d'infogérance n° IT-2291" },
    checkpoints: points([
      ['Voyants des disques', 'Tous verts', ref.leds], ['Température de la baie', 'Au plus 28 °C', ref.thermo, { max: 28, unit: '°C' }], ['Sauvegarde de la nuit', 'Terminée sans erreur', ref.backup], ['Onduleur', 'Autonomie affichée d\'au moins 10 minutes', ref.ups],
    ]),
    inspections: runs(4, [
      [fn(1, 2), 'Thomas M.', 'wooo', 'Voyant orange sur le disque 3', [null, 24, null, null]], [fn(2, 1), 'Thomas M.', 'oooo', '', [null, 24, null, null]], [fn(3, 2), 'Hélène R.', 'oooo', '', [null, 25, null, null]],
      [fn(4, 1), 'Thomas M.', 'oooo', '', [null, 23, null, null]], [fn(5, 2), 'Thomas M.', 'oooo', '', [null, 24, null, null]], [fn(6, 1), 'Thomas M.', 'oooo', '', [null, 24, null, null]],
    ]),
    anomalies: [anomaly('serveur', {
      label: 'Voyants des disques', date: isoDate(stop30), note: 'Deuxième disque en défaut, le volume ne se monte plus. Bascule sur le tableur miroir hors réseau', pointId: 'cp0', photo: seen.serverRed, severity: 'stopped', nature: 'Fonctionnement',
      by: 'Thomas M.', handler: 'Thomas M.', dueAt: ahead(1), waitingFor: 'Pièce', spareId: 'sp_demo_disque',
    })],
    breakdowns: [{ id: 'bd_demo_serveur', date: isoDate(stop30), startedAt: hoursAgo(30), hours: null, cost: null, cause: '', impact: 'slowed', planB: true, anomalyId: 'an_demo_serveur' }],
    ...life([check('10', 'Test de restauration de la sauvegarde', { value: 6, unit: 'mois' }, { kind: 'periodic', by: 'internal', who: 'Thomas M.' })], {
      tk_demo_10: { history: [done(ago(220), 'Thomas M.', 'ok'), done(ago(40), 'Thomas M.', 'ok', { report: 'https://exemple.fr/sauvegarde/compte-rendu', note: 'Restauration complète' })] },
    }),
  });

  // ---------------------------------------------------------------- 8. the torque wrench (measuring instrument), monthly routine to do (holder away: the deputy), calibration falling due
  const wrenchEq = equipment({
    id: 'eq_demo_cle', name: 'Clé dynamométrique 2,5 Nm', kind: 'instrument', location: 'Atelier montage', group: 'Atelier montage', operator: 'Lucie B.', deputy: 'Nicolas R.', manager: 'Antoine P.', bottleneck: false, routine: { every: 'month' }, sopId: 'sop_demo_1',
    photo: photo.wrench, maker: 'Outillage O', model: 'CD 0.5-5 Nm', serial: 'CD-0417', since: '2023', plate: doc.plateTool, pin: { x: 0.3, y: 0.8 },
    contacts: [helper('cl1', "Laboratoire d'étalonnage", { name: 'Métrologie Rhône-Alpes', phone: '04 00 00 04 14', hours: 'lun-ven 8 h-17 h' })],
    checkpoints: points([
      ['État physique et propreté', 'Aucun choc, échelle lisible', ref.torque], ['Déclenchement net au couple réglé', 'Un « clic » franc, sans à-coup', ref.click], ["Étiquette d'étalonnage", 'Lisible et à jour', ref.label],
    ]),
    inspections: runs(3, [[mo(1, 12), 'Lucie B.', 'ooo'], [mo(2, 10), 'Lucie B.', 'ooo'], [mo(3, 14), 'Nicolas R.', 'ooo'], [mo(4, 11), 'Lucie B.', 'ooo'], [mo(5, 12), 'Lucie B.', 'ooo']]),
    ...life([check('11', "Étalonnage de la clé dynamométrique", { value: 1, unit: 'an' }, { kind: 'instrument', by: 'provider', who: 'Métrologie Rhône-Alpes' })], {
      tk_demo_11: { history: [done(rel(-2, 0, 18), 'Métrologie Rhône-Alpes', 'ok', { report: doc.certificate }), done(rel(-1, 0, 18), 'Métrologie Rhône-Alpes', 'ok', { report: doc.certificate, note: 'Écart de 0,02 Nm, dans la tolérance' })] },
    }),
  });

  // ---------------------------------------------------------------- 9. the old press, retired: its history stays, no routine, no check
  const oldPress = equipment({
    id: 'eq_demo_ancienne', name: 'Ancienne presse plieuse manuelle 80 t', kind: 'machine', location: 'Atelier tôlerie', group: 'Atelier tôlerie', operator: 'Karim T.', manager: 'David K.', bottleneck: false,
    photo: photo.oldPress, maker: 'Constructeur Z', model: 'PM-80', serial: 'SN-04-1180', since: '2004',
    retiredAt: ago(120), retiredNote: 'Remplacée par la presse plieuse 300 t, vendue à un confrère',
    checkpoints: points([["Niveau d'huile", 'Entre le mini et le maxi', ref.level], ['Fuites', 'Aucun suintement', ref.leak], ['Bruit de la pompe', 'Régulier, sans claquement', ref.noise]]),
    inspections: runs(3, [[ago(130), 'Karim T.', 'ooo'], [ago(137), 'Karim T.', 'ooo'], [ago(144), 'Karim T.', 'ooo'], [ago(151), 'Nicolas R.', 'ooo']]),
    breakdowns: [{ id: 'bd_demo_ancienne', date: ago(520), startedAt: stamp(ago(520), 8, 0), endedAt: stamp(ago(519), 16, 0), hours: 32, cost: 1800, cause: "Casse d'une pièce", note: "Vérin d'angle remplacé", impact: 'stopped', repairBy: 'provider', fix: 'definitive' }],
  });

  // ---------------------------------------------------------------- the common cabinet: one stock per part, each part says which equipment it serves
  let n = 0;
  const move = (at: string, by: string, delta: number, why: SpareMove['why'], p: Partial<SpareMove> = {}): SpareMove => ({ id: `mv_demo_${++n}`, at: stamp(at), by, delta, why, ...p });
  const count = { countedAt: ago(12), countedBy: 'David K.' };
  const spare = (id: string, p: Pick<Spare, 'name' | 'ref' | 'equipmentIds' | 'min' | 'stock'> & Partial<Spare>): Spare => ({ id: `sp_demo_${id}`, supplier: '', leadDays: null, critical: true, why: [], ...count, ...p });
  const cabinet = (drawerNo: number) => `Armoire de survie, tiroir ${drawerNo}`;
  const spares: Spare[] = [
    spare('courroie', {
      name: 'Courroie crantée axe Z', ref: 'CR-8840-HD', equipmentIds: ['eq_demo_cnc'], supplier: 'Constructeur X', leadDays: 21, min: 2, stock: 2, why: ['stops', 'hard'], place: cabinet(2), photo: part.belt, placePhoto: part.drawer2,
      refs2: 'Équivalent : courroie HTD 8M, 1 120 mm, largeur 30 mm',
      moves: [move(ago(380), 'David K.', 3, 'start', { note: 'Stock de départ' }), move(ago(120), 'David K.', -1, 'use', { equipmentId: 'eq_demo_cnc', breakdownId: 'bd_demo_1', note: "Courroie cassée de l'axe Z" })],
    }),
    spare('electrovanne', {
      name: 'Électrovanne pneumatique 24 V', ref: 'EV-24V', equipmentIds: ['eq_demo_cnc', 'eq_demo_compresseur', 'eq_demo_cabine'], supplier: 'Constructeur X', leadDays: 10, min: 1, stock: 0, why: ['stops', 'hard'],
      place: cabinet(1), photo: part.valve, placePhoto: part.drawer1, refs2: 'Compatible : électrovanne 5/2, 24 V, raccord G1/4', order: { qty: 2, at: ago(21), expectedAt: ago(9) },
      moves: [
        move(ago(380), 'David K.', 2, 'start', { note: 'Stock de départ' }), move(ago(160), 'Julien P.', -1, 'use', { equipmentId: 'eq_demo_cabine', note: 'Électrovanne du pistolet remplacée' }),
        move(ago(35), 'Rachid H.', -1, 'use', { equipmentId: 'eq_demo_compresseur', breakdownId: 'bd_demo_comp2', note: 'Électrovanne de purge remplacée' }),
      ],
    }),
    spare('joints', {
      name: 'Jeu de joints racleurs', ref: 'JR-5520', equipmentIds: ['eq_demo_cnc'], supplier: 'Constructeur X', leadDays: 14, min: 2, stock: 3, place: cabinet(2), photo: part.seals, placePhoto: part.drawer2, expiresAt: ahead(200),
      moves: [move(ago(380), 'David K.', 4, 'start', { note: 'Stock de départ' }), move(ago(12), 'David K.', -1, 'count', { note: 'Compté 3 pour 4 en stock' })],
    }),
    spare('kit_hydr', {
      name: 'Kit de joints hydrauliques', ref: 'KJ-300', equipmentIds: ['eq_demo_plieuse'], supplier: 'Constructeur Y', leadDays: 7, min: 1, stock: 1, why: ['stops'], place: cabinet(3), photo: part.seals, placePhoto: part.drawer3,
      moves: [move(ago(380), 'David K.', 1, 'start', { note: 'Stock de départ' })],
    }),
    spare('bague', {
      name: 'Bague de butée usinée sur plan', ref: 'BB-300-X', equipmentIds: ['eq_demo_plieuse'], supplier: 'Confrère Usinage X', supplierId: 'sup_demo_usinage', leadDays: 28, min: 2, stock: 1, why: ['stops', 'hard', 'single'],
      place: cabinet(3), photo: part.bush, placePhoto: part.drawer3, refs2: 'Plan sur le serveur, dossier Maintenance',
      moves: [move(ago(300), 'David K.', 2, 'start', { note: 'Stock de départ' }), move(ago(75), 'Karim T.', -1, 'use', { equipmentId: 'eq_demo_plieuse', note: 'Butée remplacée après un filetage arraché' })],
    }),
    spare('filtre_air', {
      name: "Cartouche de filtre à air", ref: 'FA-75', equipmentIds: ['eq_demo_compresseur'], supplier: 'Distributeur industriel', leadDays: 5, min: 2, stock: 3, place: cabinet(4), photo: part.cartridge, placePhoto: part.drawer4,
      moves: [move(ago(380), 'Rachid H.', 3, 'start', { note: 'Stock de départ' })],
    }),
    spare('courroie_comp', {
      name: "Courroie d'entraînement du compresseur", ref: 'CE-B52', equipmentIds: ['eq_demo_compresseur'], supplier: 'Air Service', leadDays: 5, min: 1, stock: 2, why: ['stops'], place: cabinet(1), photo: part.belt, placePhoto: part.drawer1,
      moves: [
        move(ago(380), 'Rachid H.', 2, 'start', { note: 'Stock de départ' }), move(ago(230), 'Rachid H.', -1, 'use', { equipmentId: 'eq_demo_compresseur', breakdownId: 'bd_demo_comp1' }),
        move(ago(6), 'Rachid H.', 1, 'received', { note: 'Commande reçue' }),
      ],
    }),
    spare('flexible', {
      name: 'Flexible hydraulique du mât', ref: 'FH-2500', equipmentIds: ['eq_demo_chariot'], supplier: 'Manutention Services', leadDays: 3, min: 1, stock: 1, why: ['stops', 'hard'], place: cabinet(4), photo: part.hose, placePhoto: part.drawer4,
      moves: [move(ago(380), 'Rachid H.', 1, 'start', { note: 'Stock de départ' })],
    }),
    spare('disque', {
      name: 'Disque dur 4 To pour serveur', ref: 'HD-4T-S', equipmentIds: ['eq_demo_serveur'], supplier: 'Prestataire IT', supplierId: 'sup_demo_it', leadDays: 3, min: 1, stock: 0, why: ['stops', 'single'],
      place: 'Salle informatique, étagère du bas', photo: part.disk, placePhoto: part.rack, order: { qty: 2, at: ago(1), expectedAt: ahead(1) },
      moves: [move(ago(300), 'Thomas M.', 1, 'start', { note: 'Stock de départ' }), move(ago(9), 'Thomas M.', -1, 'use', { equipmentId: 'eq_demo_serveur', note: 'Premier disque en défaut remplacé' })],
    }),
    spare('batterie', {
      name: "Batterie d'onduleur 12 V", ref: 'BAT-12-9', equipmentIds: ['eq_demo_serveur'], supplier: 'Prestataire IT', supplierId: 'sup_demo_it', leadDays: 7, min: 2, stock: 2, place: 'Salle informatique, étagère du bas', photo: part.battery, placePhoto: part.rack,
      expiresAt: ahead(25), moves: [move(ago(380), 'Thomas M.', 2, 'start', { note: 'Stock de départ' })],
    }),
    spare('filtre_cabine', {
      name: 'Filtres de la cabine de peinture', ref: 'FC-2X3', equipmentIds: ['eq_demo_cabine'], supplier: 'Cabines R', leadDays: 10, min: 2, stock: 2, place: cabinet(4), photo: part.cartridge, placePhoto: part.drawer4,
      moves: [move(ago(380), 'Julien P.', 4, 'start', { note: 'Stock de départ' }), move(ago(100), 'Julien P.', -2, 'use', { equipmentId: 'eq_demo_cabine', note: 'Filtres de la cabine changés' })],
    }),
    spare('fusibles', {
      name: "Lot de fusibles et d'ampoules", ref: '', equipmentIds: ['eq_demo_fourgon', 'eq_demo_chariot'], critical: false, min: 2, stock: 4, place: cabinet(1),
      moves: [move(ago(380), 'Rachid H.', 4, 'start', { note: 'Stock de départ' })],
    }),
  ];

  const byId = <T extends { id: string }>(xs: T[]) => Object.fromEntries(xs.map(x => [x.id, x]));
  return { equipments: byId([cnc, pressBrake, compressor, forklift, booth, van, server, wrenchEq, oldPress]), spares: byId(spares) };
}

// The people and places of the example: who holds the key of the cabinet and where it hangs
export const maintExampleParams = (): MaintSettings => ({ keyHolder: 'David K.', keyDeputy: 'Julien P.', keyPlace: "Armoire de survie du local technique ; la clé est au tableau du bureau d'atelier" });

// The defects of the example (tool 5.1) that happened on a piece of equipment
export const NC_EQ_LINKS: Record<string, string> = { nc_demo_1: 'eq_demo_plieuse', nc_demo_7: 'eq_demo_plieuse', nc_demo_5: 'eq_demo_cabine' };

// ---- a fictitious company saved before this version
const isEmpty = (x: unknown) => x === undefined || x === null || x === '' || (Array.isArray(x) && !x.length);
const spareKey = (x: { ref: string; name: string }) => norm(x.ref) || norm(x.name);
// What was typed stays: a field is filled only when it is empty; the records of a list (points, anomalies, breakdowns, checks) are matched by their id,
// those of the example that the company does not hold are added; the life that exists (routines, history of the checks) is kept
function fillById<T extends { id?: string }>(old: T[] | undefined, fresh: T[] | undefined, fill: (o: T, f: T) => T): T[] | undefined {
  if (isEmpty(old)) return fresh;
  const kept = old!.map(o => { const f = fresh?.find(x => x.id !== undefined && x.id === o.id); return f ? fill(o, f) : o; });
  return [...kept, ...(fresh || []).filter(f => !old!.some(o => o.id === f.id))];
}
const fillFields = <T extends object>(old: T, fresh: T): T => ({ ...fresh, ...Object.fromEntries(Object.entries(old).filter(([k, v]) => !isEmpty(v) || isEmpty((fresh as Record<string, unknown>)[k]))) }) as T;
function fillEquipment(old: Equipment, fresh: Equipment): Equipment {
  const out = fillFields(old, fresh);
  // the points keep what was typed and take the photo and the bounds of the example, found by their id
  out.checkpoints = old.checkpoints.map(c => { const f = fresh.checkpoints.find(x => x.id === c.id); return f ? { ...c, photo: c.photo || f.photo, min: c.min ?? f.min, max: c.max ?? f.max, unit: c.unit || f.unit } : c; });
  out.anomalies = fillById(old.anomalies, fresh.anomalies, fillFields);
  out.breakdowns = fillById(old.breakdowns, fresh.breakdowns, fillFields);
  out.tasks = fillById(old.tasks, fresh.tasks, fillFields);
  out.checkLife = { ...fresh.checkLife, ...old.checkLife };
  // a "Fait" typed before the upgrade (the old single date) is not hidden by the history of the example: it joins it when it is more recent
  (old.tasks ?? []).forEach(c => {
    const own = old.checkLife?.[c.id]?.history ?? [], ex = fresh.checkLife?.[c.id]?.history ?? [];
    if (!c.lastDone || own.length || !ex.length || c.lastDone <= ex.reduce((m, h) => (h.date > m ? h.date : m), '')) return;
    out.checkLife![c.id] = { ...fresh.checkLife![c.id], history: [...ex, { date: c.lastDone, by: '', result: 'ok', note: '' }] };
  });
  out.inspections = isEmpty(old.inspections) ? fresh.inspections : old.inspections;
  return out;
}
// A part the company already holds (same reference, else same name) gets the example's missing fields and the equipment it serves; it keeps its id, stock and moves
function fillSpare(old: Spare, fresh: Spare): Spare {
  const out = fillFields(old, fresh);
  out.equipmentIds = [...new Set([...old.equipmentIds, ...fresh.equipmentIds])];
  return out;
}

// A fictitious company saved before the tool 3.3 was rebuilt gets the equipment and the cabinet of the current example, once: the equipment it holds is completed
// (photos, identity, anomalies, checks) without touching what was typed, the missing ones are added, the parts it already holds (same reference or name) are
// completed instead of doubled, and the defects are linked to their equipment. A real company gets nothing.
export function completeMaintenanceExamples<T extends { equipments: Record<string, Equipment>; spares: Record<string, Spare>; ncs: Record<string, Nc>; params: Params }>(s: T, today = new Date()): T {
  const demo = Object.keys(s.equipments).some(id => id.startsWith('eq_demo_'));
  if (!demo || (s.params.maintExampleLevel ?? 0) >= 1) return s;
  const ex = maintenanceExamples(today);
  // the parts of the example the cabinet already holds keep the id they have: the anomalies that wait for them follow
  const spares = { ...(s.spares || {}) }, idOf: Record<string, string> = {}, keys = new Map(Object.values(spares).map(x => [spareKey(x), x.id]));
  Object.values(ex.spares).forEach(x => {
    const id = keys.get(spareKey(x));
    idOf[x.id] = id || x.id;
    spares[idOf[x.id]] = id ? fillSpare(spares[id], x) : x;
  });
  const equipments = { ...s.equipments };
  Object.values(ex.equipments).forEach(x => {
    const f = x.anomalies ? { ...x, anomalies: x.anomalies.map(a => (a.spareId ? { ...a, spareId: idOf[a.spareId] || a.spareId } : a)) } : x;
    equipments[x.id] = equipments[x.id] ? fillEquipment(equipments[x.id], f) : f;
  });
  const ncs = { ...s.ncs };
  Object.entries(NC_EQ_LINKS).forEach(([id, eq]) => { if (ncs[id]) ncs[id] = { ...ncs[id], equipmentId: ncs[id].equipmentId ?? eq }; });
  const sop = { ...(s.params.sop || {}) };
  sop.plan ||= sopExampleParams().plan;
  const maint = { ...maintExampleParams(), ...Object.fromEntries(Object.entries(s.params.maint || {}).filter(([, v]) => !isEmpty(v))) };
  return { ...s, equipments, spares, ncs, params: { ...s.params, sop, maint, maintExampleLevel: 1 } };
}

// The button "Voir un exemple traité" of tool 3.3: the equipment and the cabinet above, in a company that has none yet (a collection that holds records is never touched);
// the defects already declared are linked, the plan of the workshop and the key of the cabinet are given when the example came in
export function applyMaintenanceExample(d: { equipments: Record<string, Equipment>; spares: Record<string, Spare>; ncs: Record<string, Nc>; params: Params }, today = new Date()) {
  if (!Object.keys(d.equipments).length) fillEmptyCollections(d, maintenanceExamples(today));   // the cabinet only comes with the equipment it serves
  if (Object.keys(d.equipments).some(id => id.startsWith('eq_demo_'))) {
    Object.entries(NC_EQ_LINKS).forEach(([id, eq]) => { const nc = d.ncs[id]; if (nc && d.equipments[eq]) nc.equipmentId ??= eq; });
    d.params.sop = { ...(d.params.sop || {}) };
    d.params.sop.plan ||= sopExampleParams().plan;
    d.params.maint = { ...maintExampleParams(), ...Object.fromEntries(Object.entries(d.params.maint || {}).filter(([, v]) => !isEmpty(v))) };
  }
  d.params.maintExampleLevel = 1;
}
