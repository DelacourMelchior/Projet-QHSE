// Links to the other tools of the application, shared by a step of a flowchart and the sheet of a process: a tool (opened as a whole) or one of its records (an indicator, a risk,
// an instruction, an equipment, a supplier, a contact, a key function, a skill). A link opens in a new tab; a risk opens its sheet over this page.
import { useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import type { FlowLink } from '../../domain/types';
import { LINK_KINDS, linkItems, linkLabel } from '../../domain/cartography';
import { useStore } from '../../store/StoreContext';
import { TOOLS, type Nav, type ToolId } from '../tools';
import { withLink } from '../../domain/mapSupport';
import { Button, inputCls } from '../common';
import { ColHead } from './MapBits';

export const openLink = (nav: Nav, l: FlowLink) => { if (l.tool === '1.2' && l.id) nav.openRisk(l.id, 2); else nav.open(l.tool as ToolId, l.id); };
export const linkText = (s: Parameters<typeof linkLabel>[0], l: FlowLink) => `${l.tool} ${TOOLS.find(t => t.id === l.tool)?.label ?? l.tool}${l.id ? ` · ${linkLabel(s, l) ?? 'introuvable'}` : ''}`;

// Chooses a link where the person is: first the tool, then (when the tool has records) one of its records or the whole tool, then Add. Nothing is added before a tool is chosen.
export function LinkPicker({ processId, onAdd, onCancel }: { processId?: string; onAdd(l: FlowLink): void; onCancel(): void }) {
  const { state } = useStore();
  const [tool, setTool] = useState(''), [id, setId] = useState('');
  if (!state) return null;
  const items = tool && LINK_KINDS[tool] ? linkItems(state, tool, processId) : [], mine = items.filter(x => x.mine), rest = items.filter(x => !x.mine);
  const option = (x: { id: string; label: string }) => <option key={x.id} value={x.id}>{LINK_KINDS[tool]} : {x.label}</option>;
  return (
    <div role="group" aria-label="Choisir un lien" className="flex w-full flex-wrap items-end gap-2 rounded-lg border border-delacour-golddark/60 bg-amber-50/50 p-2">
      <label className="block min-w-[12rem] flex-1 space-y-0.5"><span className="block text-[11px] font-semibold text-slate-700">1. Vers quel outil ?</span>
        <select className={inputCls} autoFocus value={tool} onChange={e => { setTool(e.target.value); setId(''); }}>
          <option value="">Choisir un outil…</option>{TOOLS.filter(t => t.id !== '1.4').map(t => <option key={t.id} value={t.id}>{t.id} · {t.label} : {t.title}</option>)}
        </select></label>
      {LINK_KINDS[tool] && <label className="block min-w-[12rem] flex-1 space-y-0.5"><span className="block text-[11px] font-semibold text-slate-700">2. Une fiche en particulier ? (facultatif)</span>
        <select className={inputCls} value={id} onChange={e => setId(e.target.value)}>
          <option value="">Tout l'outil</option>{mine.length > 0 ? <><optgroup label="De ce processus">{mine.map(option)}</optgroup>{rest.length > 0 && <optgroup label="Des autres processus">{rest.map(option)}</optgroup>}</> : items.map(option)}
        </select></label>}
      <Button kind="primary" disabled={!tool} onClick={() => onAdd({ tool, ...(id ? { id } : {}) })}>Ajouter le lien</Button>
      <Button onClick={onCancel}>Annuler</Button>
    </div>
  );
}

const LINK_COLS = 'minmax(0,1fr) minmax(0,1fr) 6rem 2.5rem';
export function LinksEditor({ links, onChange, nav, title, hint, add = 'Ajouter un lien', disabled, processId }: { links: FlowLink[]; onChange(v: FlowLink[]): void; nav: Nav; title?: string; hint?: string; add?: string; disabled?: boolean; processId?: string }) {
  const { state } = useStore(), [adding, setAdding] = useState(false);
  if (!state) return null;
  return (
    <div className="space-y-1.5">
      {title && <span className="block text-xs font-semibold text-slate-700">{title}</span>}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {links.length > 0 && <ColHead edge="px-0" gap="gap-x-1.5" cols={LINK_COLS} labels={['Outil', 'Fiche liée', '', '']} />}
      {links.map((l, k) => {
        const items = LINK_KINDS[l.tool] ? linkItems(state, l.tool, processId) : [], mineItems = items.filter(x => x.mine), rest = items.filter(x => !x.mine), option = (x: { id: string; label: string }) => <option key={x.id} value={x.id}>{LINK_KINDS[l.tool]} : {x.label}</option>, upd = (v: FlowLink) => onChange(links.map((x, j) => (j === k ? v : x)));
        return (
          <div key={k} className="grid gap-1.5 md:[grid-template-columns:var(--cols)]" style={{ '--cols': LINK_COLS } as React.CSSProperties}>
            <select className={inputCls} disabled={disabled} aria-label={`Outil du lien ${k + 1}`} value={l.tool} onChange={e => upd({ tool: e.target.value })}>{TOOLS.filter(t => t.id !== '1.4' || l.tool === '1.4').map(t => <option key={t.id} value={t.id}>{t.id} · {t.label}</option>)}</select>
            {LINK_KINDS[l.tool] ? <select className={inputCls} disabled={disabled} aria-label={`Fiche du lien ${k + 1}`} value={l.id || ''} onChange={e => upd({ tool: l.tool, ...(e.target.value ? { id: e.target.value } : {}) })}>
              <option value="">Tout l'outil</option>{l.id && !items.some(x => x.id === l.id) && <option value={l.id}>(introuvable)</option>}{mineItems.length > 0 ? <><optgroup label="De ce processus">{mineItems.map(option)}</optgroup>{rest.length > 0 && <optgroup label="Des autres processus">{rest.map(option)}</optgroup>}</> : items.map(option)}</select> : <span className="self-center text-xs text-slate-500">Tout l'outil</span>}
            <Button onClick={() => openLink(nav, l)}>Ouvrir <ExternalLink size={12} aria-hidden /><span className="sr-only"> (s'ouvre dans un nouvel onglet)</span></Button>
            <Button kind="ghost" disabled={disabled} aria-label={`Retirer le lien ${k + 1}`} onClick={() => onChange(links.filter((_, j) => j !== k))}><Trash2 size={14} /></Button>
          </div>
        );
      })}
      {adding ? <LinkPicker processId={processId} onAdd={l => { onChange(withLink(links, l)); setAdding(false); }} onCancel={() => setAdding(false)} /> : <Button disabled={disabled} onClick={() => setAdding(true)}><Plus size={13} />{add}</Button>}
    </div>
  );
}
