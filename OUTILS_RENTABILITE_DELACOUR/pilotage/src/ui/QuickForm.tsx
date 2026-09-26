// Quick entry for the shop floor or the site: 3 fields and a photo, the rest is completed later at the office.
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button, Field, inputCls, Modal } from './common';
import { PhotoBox } from './PhotoBox';

export interface QuickField { key: string; label: string; placeholder?: string; list?: string; required?: boolean }

export function QuickButton({ label, title, fields, photo, onSave }: { label: string; title: string; fields: QuickField[]; photo?: boolean; onSave(v: Record<string, string>, photo: string): void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  const [pic, setPic] = useState('');
  const missing = fields.filter(f => f.required && !(v[f.key] || '').trim());
  const save = () => { onSave(v, pic); setV({}); setPic(''); setOpen(false); };
  return (
    <>
      <Button onClick={() => setOpen(true)} title="Quelques champs et une photo, depuis l'atelier ou le chantier"><Zap size={14} />{label}</Button>
      {open && (
        <Modal title={title} subtitle="Le reste se complète plus tard, au bureau." onClose={() => setOpen(false)}
          footer={<><Button onClick={() => setOpen(false)}>Annuler</Button><Button kind="primary" disabled={missing.length > 0} onClick={save}>Enregistrer</Button></>}>
          <div className="space-y-3">
            {fields.map(f => <Field key={f.key} label={f.label}><input className={`${inputCls} !py-2.5 !text-sm`} value={v[f.key] || ''} list={f.list} placeholder={f.placeholder} onChange={e => setV({ ...v, [f.key]: e.target.value })} /></Field>)}
            {photo && <PhotoBox value={pic} label="Photo" onChange={setPic} />}
          </div>
        </Modal>
      )}
    </>
  );
}
