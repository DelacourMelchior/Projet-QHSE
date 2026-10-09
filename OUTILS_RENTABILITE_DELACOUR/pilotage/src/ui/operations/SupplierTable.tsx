// Tool 3.1, the table of suppliers. One grid template per table: the header, the sector bands and every supplier row use the same columns, so each
// figure sits under its title whatever the row holds. From lg up the table has all its columns; below, a row keeps the class, the name, the note and
// the actions, and the role, the sector and the alert go under the name.
import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronRight } from 'lucide-react';
import type { Sector, Supplier, SupplierRating } from '../../domain/types';
import { categoryLabel, isFollowed, nextReview, orgOfSupplier, ratingScore, statusOf, SUPPLIER_STATUS, type SupplierClass, type supplierFacts } from '../../domain/suppliers';
import { activeSwitch, sectorBadge, sectorCover, sectorTarget, type Ranked } from '../../domain/sectors';
import { frDate } from '../../domain/periods';
import { useStore } from '../../store/StoreContext';
import { StatusBadge } from '../common';
import type { Nav } from '../tools';
import { SectorMenu, SectorNotes } from './Secteurs';

export interface LineInfo { x: Supplier; cls: SupplierClass | null; f: ReturnType<typeof supplierFacts>; due: boolean; r: SupplierRating | undefined }
type AppState = NonNullable<ReturnType<typeof useStore>['state']>;

// compact: class, name, note, actions · lg: class, role, name, note, claims, next evaluation, alerts, actions (flat list: the sector instead of the role, no actions)
const COL = {
  sector: 'grid-cols-[1.75rem_minmax(0,1fr)_3.25rem_3.5rem] lg:grid-cols-[1.75rem_5.5rem_minmax(0,1fr)_3.5rem_5.5rem_6rem_10rem_3.5rem]',
  flat: 'grid-cols-[1.75rem_minmax(0,1fr)_3.25rem] lg:grid-cols-[1.75rem_minmax(0,1fr)_14rem_3.5rem_5.5rem_6rem_10rem]',
} as const;
const ROW = 'items-center gap-x-3 px-3';

// A title for the screen readers that still holds its cell of the grid
const Silent = ({ children }: { children: ReactNode }) => <span role="columnheader" className="block h-px w-px overflow-hidden whitespace-nowrap">{children}</span>;
const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => <span role="columnheader" className={right ? 'text-right' : ''}>{children}</span>;

export function ColumnsHeader({ flat = false }: { flat?: boolean }) {
  return (
    <div role="row" className={`hidden ${ROW} ${flat ? COL.flat : COL.sector} !items-end border-b border-slate-300 bg-white pb-1.5 pt-2 text-[11px] font-semibold leading-tight text-slate-600 lg:sticky lg:top-[5.5rem] lg:z-20 lg:grid print:static print:hidden`}>
      <Silent>Classe</Silent>
      {!flat && <Th>Rôle</Th>}
      <Th>Fournisseur</Th>
      {flat && <Th>Secteur</Th>}
      <Th right>Note<br /><span className="font-normal">sur 100</span></Th>
      <Th right>Réclamations<br /><span className="font-normal">12 mois</span></Th>
      <Th>Prochaine<br /><span className="font-normal">évaluation</span></Th>
      <Th>Alertes</Th>
      {!flat && <Silent>Actions</Silent>}
    </div>
  );
}

const CLASS_SQUARE = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'border border-slate-300 bg-white text-slate-800',
  C: 'bg-red-600 text-white',
} as const;

// What asks something from the company on a row, most urgent first: only these are coloured, a sound row has none
export function alertsOf(line: LineInfo, state: AppState): { level: 'ok' | 'warn' | 'alert' | 'pending'; text: string }[] {
  const { x, cls, due, f } = line, st = statusOf(x);
  return [
    cls === 'C' && { level: 'alert' as const, text: 'Classe C' },
    st !== 'listed' && { level: SUPPLIER_STATUS[st].tone, text: SUPPLIER_STATUS[st].label },
    due && { level: 'warn' as const, text: 'À évaluer' },
    f.repeats.length > 0 && { level: 'warn' as const, text: 'Défaut répété' },
    !orgOfSupplier(state, x) && { level: 'warn' as const, text: 'Hors annuaire' },
  ].filter(Boolean) as { level: 'ok' | 'warn' | 'alert' | 'pending'; text: string }[];
}

function Alerts({ list }: { list: { level: 'ok' | 'warn' | 'alert' | 'pending'; text: string }[] }) {
  if (!list.length) return null;
  return (
    <span className="flex items-center gap-1.5">
      <StatusBadge level={list[0].level} text={list[0].text} />
      {list.length > 1 && <span className="text-[11px] text-slate-600" title={list.slice(1).map(a => a.text).join(', ')}>+{list.length - 1}</span>}
    </span>
  );
}

interface RowProps {
  line: LineInfo; state: AppState; mode: 'sector' | 'free' | 'flat'; role?: string; serving?: boolean; sectors?: string;
  onOpen(): void; onMove?: (dir: -1 | 1) => void; canUp?: boolean; canDown?: boolean;
}

// One supplier. The whole row opens the sheet; the name is its button for the keyboard. The arrows (order of recourse) show on hover and focus.
export function SupplierRow({ line, state, mode, role = '', serving, sectors = '', onOpen, onMove, canUp, canDown }: RowProps) {
  const { x, cls, f, r } = line;
  const next = isFollowed(x) ? nextReview(x, state.params) : '';
  const alerts = alertsOf(line, state);
  const rs = [...x.ratings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const delta = rs.length > 1 ? ratingScore(rs[0]) - ratingScore(rs[1]) : 0;
  const detail = [categoryLabel(x.category), x.supplies, f.count ? `${f.count} réclamation${f.count > 1 ? 's' : ''} sur 12 mois${f.open ? `, ${f.open} ouverte${f.open > 1 ? 's' : ''}` : ''}` : '', r ? `noté le ${frDate(r.date)}${delta ? ` (${delta > 0 ? '+' : ''}${delta} point${Math.abs(delta) > 1 ? 's' : ''} depuis la précédente)` : ''}` : ''].filter(Boolean).join(' · ');
  const flat = mode === 'flat';
  return (
    <div role="row" onClick={onOpen} className={`group grid ${ROW} ${flat ? COL.flat : COL.sector} min-h-[2.75rem] cursor-pointer border-t border-slate-100 py-1.5 hover:bg-slate-50`}>
      <div role="cell"><span className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold ${cls ? CLASS_SQUARE[cls] : 'border border-dashed border-slate-400 bg-white text-slate-600'}`}>{cls || '?'}</span></div>
      {!flat && <div role="cell" className="hidden truncate text-xs text-slate-600 lg:block">{role}</div>}
      <div role="cell" className="min-w-0">
        <button type="button" title={detail} onClick={e => { e.stopPropagation(); onOpen(); }} className="block max-w-full rounded text-left text-xs font-semibold text-slate-900 lg:truncate focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-delacour-primary">
          {x.name}{x.strategic && <span className="font-normal text-slate-600"> · critique</span>}{serving && <span className="font-normal text-slate-600"> · en service</span>}
        </button>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600 empty:hidden lg:hidden">
          {(role || (flat && sectors)) && <span>{flat ? sectors : role}</span>}
          <Alerts list={alerts} />
        </span>
      </div>
      {flat && <div role="cell" className="hidden truncate text-xs text-slate-600 lg:block">{sectors || '—'}</div>}
      <div role="cell" className="text-right font-mono text-xs font-semibold tabular-nums text-slate-900">{r ? ratingScore(r) : <span className="font-sans text-[11px] font-normal text-slate-600">Non noté</span>}</div>
      <div role="cell" className="hidden text-right font-mono text-xs tabular-nums text-slate-700 lg:block">{f.count}</div>
      <div role="cell" className="hidden text-xs tabular-nums text-slate-700 lg:block">{next ? frDate(next) : '—'}</div>
      <div role="cell" className="hidden lg:block"><Alerts list={alerts} /></div>
      {!flat && (
        <div role="cell" className="flex items-center justify-end print:hidden [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
          {onMove && <>
            <button type="button" aria-label={`Monter ${x.name}`} disabled={!canUp} onClick={e => { e.stopPropagation(); onMove(-1); }} className="rounded p-1 text-slate-600 hover:bg-slate-200/60 disabled:opacity-30"><ArrowUp size={14} /></button>
            <button type="button" aria-label={`Descendre ${x.name}`} disabled={!canDown} onClick={e => { e.stopPropagation(); onMove(1); }} className="rounded p-1 text-slate-600 hover:bg-slate-200/60 disabled:opacity-30"><ArrowDown size={14} /></button>
          </>}
        </div>
      )}
    </div>
  );
}

const BAND = `grid ${ROW} ${COL.sector} min-h-[2.5rem] border-t border-slate-300 bg-slate-50 py-1.5`;

// A purchasing sector: its band (name, who is main and who is backup, its state, its menu) and its suppliers. Closed, the band keeps the main supplier
// (and the backup in service) in the columns and says how many it hides and what they ask.
export function SectorGroup({ sec, nav, ranking, shown, rows, forceOpen, onOpen, move }: {
  sec: Sector; nav: Nav; ranking: Ranked[]; shown: Ranked[]; rows: Map<string, LineInfo>; forceOpen: boolean; onOpen(x: Supplier): void; move(id: string, dir: -1 | 1): void;
}) {
  const { state } = useStore();
  const [open, setOpen] = useState<boolean | null>(null);
  if (!state) return null;
  const now = new Date(), isOpen = open ?? forceOpen;
  const live = ranking.filter(y => y.role !== 'out'), badge = sectorBadge(state, sec, now), cover = sectorCover(sec), sw = activeSwitch(sec);
  const visible = isOpen ? shown : shown.filter(y => y.role === 'main' || (sw && y.serving));
  const hidden = shown.filter(y => !visible.includes(y));
  const hiddenAlerts = hidden.flatMap(y => alertsOf(rows.get(y.x.id)!, state).slice(0, 1).map(a => a.text));
  const chip = badge.level === 'ok' ? null : <StatusBadge level={badge.level} text={badge.text} />;
  return (
    <div role="rowgroup">
      <div role="row" className={BAND}>
        <div role="cell" className="col-[1/-2] min-w-0 lg:col-[1/-3]">
          <button type="button" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen} className="flex w-full items-start gap-1.5 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-delacour-primary">
            <ChevronRight size={14} aria-hidden className={`mt-0.5 shrink-0 text-slate-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-slate-900 lg:truncate">{sec.name || 'Secteur sans nom'}</span>
              <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-600">
                <span>{live.length} fournisseur{live.length > 1 ? 's' : ''}{cover === 'backup' ? ` sur ${sectorTarget(sec)} souhaité${sectorTarget(sec) > 1 ? 's' : ''}` : ''}</span>
                {badge.level === 'ok' && <span className="inline-flex items-center gap-0.5"><Check size={12} aria-hidden />{badge.text}</span>}
                {isOpen && sec.manual && <span>· ordre fixé par l'entreprise</span>}
                {hidden.length > 0 && <span>· {hidden.length} secours replié{hidden.length > 1 ? 's' : ''}{hiddenAlerts.length > 0 && <span className="text-amber-800"> ({hiddenAlerts.join(', ')})</span>}</span>}
              </span>
            </span>
          </button>
          {chip && <div className="mt-1 pl-5 lg:hidden">{chip}</div>}
        </div>
        <div role="cell" className="hidden lg:block">{chip}</div>
        <div role="cell" className="flex justify-end print:hidden"><SectorMenu sec={sec} nav={nav} /></div>
      </div>
      <SectorNotes sec={sec} open={isOpen} />
      {shown.length === 0 && <div role="row" className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-600"><div role="cell">Aucun fournisseur dans ce secteur : rangez-en un depuis sa fiche.</div></div>}
      {visible.map(y => (
        <SupplierRow key={y.x.id} line={rows.get(y.x.id)!} state={state} mode="sector" role={y.role === 'main' ? 'Principal' : y.role === 'backup' ? `Secours ${y.rank}` : ''} serving={!!sw && y.serving}
          onOpen={() => onOpen(y.x)} onMove={y.role === 'out' ? undefined : dir => move(y.x.id, dir)} canUp={y.rank > 0 && y.role !== 'out'} canDown={y.role !== 'out' && y.rank < live.length - 1} />
      ))}
    </div>
  );
}

// The suppliers of no sector, under the same columns
export function FreeGroup({ list, rows, onOpen }: { list: Supplier[]; rows: Map<string, LineInfo>; onOpen(x: Supplier): void }) {
  const { state } = useStore();
  if (!state) return null;
  return (
    <div role="rowgroup">
      <div role="row" className={BAND}>
        <div role="cell" className="col-[1/-2] min-w-0 lg:col-[1/-3]">
          <span className="block pl-5 text-xs font-bold text-slate-900">Sans secteur</span>
          <span className="block pl-5 text-[11px] text-slate-600">À ranger dans un secteur d'achat depuis la fiche du fournisseur.</span>
        </div>
      </div>
      {list.map(x => <SupplierRow key={x.id} line={rows.get(x.id)!} state={state} mode="free" onOpen={() => onOpen(x)} />)}
    </div>
  );
}

// The flat list: one table, the sector of each supplier in a column
export function FlatTable({ list, rows, sectorsOf, onOpen }: { list: Supplier[]; rows: Map<string, LineInfo>; sectorsOf(x: Supplier): string; onOpen(x: Supplier): void }) {
  const { state } = useStore();
  if (!state) return null;
  return (
    <div role="table" aria-label="Fournisseurs, liste à plat" className="border-b border-slate-200">
      <ColumnsHeader flat />
      {list.map(x => <SupplierRow key={x.id} line={rows.get(x.id)!} state={state} mode="flat" sectors={sectorsOf(x)} onOpen={() => onOpen(x)} />)}
    </div>
  );
}
