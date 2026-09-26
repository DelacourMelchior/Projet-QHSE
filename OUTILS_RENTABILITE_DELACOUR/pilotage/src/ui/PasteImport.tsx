// Import from Excel or from the company software: copy the cells (with their header line), paste, check, import.
import { useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { Button, Modal } from './common';

export interface Column { key: string; label: string; aliases: string[] }
// Tab (Excel) or semicolon (CSV) separated text -> rows keyed by column, matched on the header names
export function parseTable(text: string, cols: Column[]): Record<string, string>[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes('\t') ? '\t' : ';';
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const head = lines[0].split(sep).map(norm);
  const idx = cols.map(c => head.findIndex(h => [c.label, ...c.aliases].map(norm).some(a => h === a || (a.length > 3 && h.includes(a)))));
  return lines.slice(1).map(l => { const cells = l.split(sep).map(x => x.trim().replace(/^"|"$/g, '')); return Object.fromEntries(cols.map((c, i) => [c.key, idx[i] >= 0 ? cells[idx[i]] || '' : ''])); });
}

export function PasteImport({ title, cols, onImport, label = 'Importer' }: { title: string; cols: Column[]; onImport(rows: Record<string, string>[]): number; label?: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const rows = parseTable(text, cols);
  return (
    <>
      <Button kind="ghost" onClick={() => setOpen(true)}><ClipboardPaste size={14} />{label}</Button>
      {open && (
        <Modal wide title={title} subtitle="Copiez les cellules dans Excel ou votre logiciel (avec la ligne des titres), puis collez-les ici." onClose={() => setOpen(false)}
          footer={<>{msg && <span className="mr-auto text-[11px] font-semibold text-emerald-700">{msg}</span>}<Button onClick={() => setOpen(false)}>Fermer</Button><Button kind="primary" disabled={!rows.length} onClick={() => { const n = onImport(rows); setMsg(`${n} ligne(s) importée(s).`); setText(''); }}>Importer {rows.length || ''} ligne(s)</Button></>}>
          <div className="space-y-3">
            <p className="text-[11px] text-slate-600">Colonnes reconnues : {cols.map(c => c.label).join(', ')}. Les colonnes absentes restent vides.</p>
            <textarea className="min-h-[140px] w-full rounded-lg border border-slate-300 p-2 font-mono text-[11px]" value={text} onChange={e => { setText(e.target.value); setMsg(''); }} aria-label="Cellules collées" placeholder={cols.map(c => c.label).join('\t')} />
            {rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead><tr>{cols.map(c => <th key={c.key} className="border-b border-slate-200 px-1.5 py-1 font-semibold text-slate-500">{c.label}</th>)}</tr></thead>
                  <tbody>{rows.slice(0, 8).map((r, i) => <tr key={i}>{cols.map(c => <td key={c.key} className="border-b border-slate-100 px-1.5 py-1">{r[c.key]}</td>)}</tr>)}</tbody>
                </table>
                {rows.length > 8 && <p className="text-[11px] text-slate-500">et {rows.length - 8} autre(s) ligne(s)</p>}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
