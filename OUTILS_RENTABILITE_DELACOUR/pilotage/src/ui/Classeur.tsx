// Crisis binder: every reflex card and the emergency numbers in one PDF, saved in the shared folder
// (to keep on the phone, available offline) and printed for the red binder.
import { useState } from 'react';
import { FileDown, FolderSync } from 'lucide-react';
import { binderHash } from '../domain/binder';
import { binderPdf } from '../domain/binderPdf';
import { useStore } from '../store/StoreContext';
import { Button, Modal } from './common';
import { downloadFile } from './download';

export const BINDER_FILE = 'Classeur-de-crise.pdf';

export function Classeur({ onClose }: { onClose(): void }) {
  const { state, update, author, folder, writeFolderFile } = useStore();
  const [msg, setMsg] = useState('');
  if (!state) return null;
  const meta = state.binder;
  const fresh = !!meta && meta.hash === binderHash(state);
  const make = () => binderPdf(state, { company: state.settings.companyName, by: author, date: new Date() });
  const stamp = () => update(d => { d.binder = { hash: binderHash(d), at: new Date().toISOString(), by: author }; });

  const toFolder = async () => {
    if (await writeFolderFile(BINDER_FILE, make())) { stamp(); setMsg(`Enregistré dans « ${folder.name}/${BINDER_FILE} ».`); }
    else setMsg("Écriture impossible dans le dossier partagé : reconnectez-le, ou téléchargez le PDF.");
  };
  const download = () => { downloadFile(BINDER_FILE, make(), 'application/pdf'); stamp(); setMsg('PDF téléchargé.'); };

  return (
    <Modal title="Classeur de crise" subtitle={`${Object.keys(state.risks).length} fiche(s) réflexe(s) et ${Object.keys(state.contacts).length} numéro(s) d'urgence`} onClose={onClose}
      footer={<Button onClick={onClose}>Fermer</Button>}>
      <div className="space-y-3 text-xs text-slate-700">
        <p>Le jour d'une panne, l'ordinateur peut être inaccessible. Le classeur réunit les fiches réflexes, précédées des numéros d'urgence et d'un sommaire.</p>
        <p className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${!meta ? 'bg-amber-50 text-amber-900' : fresh ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>
          {!meta ? 'Jamais enregistré.' : `${fresh ? 'À jour' : 'Des fiches ont changé depuis'} : dernier enregistrement le ${new Date(meta.at).toLocaleDateString('fr-FR')}${meta.by ? ` par ${meta.by}` : ''}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {folder.status === 'connected' && <Button kind="primary" onClick={toFolder}><FolderSync size={14} />Enregistrer dans le dossier partagé</Button>}
          <Button kind={folder.status === 'connected' ? 'secondary' : 'primary'} onClick={download}><FileDown size={14} />Télécharger le PDF</Button>
        </div>
        {msg && <p role="status" className="text-[11px] font-semibold text-emerald-800">{msg}</p>}
        <ol className="list-decimal space-y-1 pl-4 text-[11px] text-slate-600">
          <li><strong>Téléphone</strong> : {folder.status === 'connected' ? `dans l'application OneDrive, ouvrez « ${folder.name}/${BINDER_FILE} »` : "déposez le PDF dans OneDrive, ouvrez-le dans l'application OneDrive du téléphone"}, puis choisissez « Rendre disponible hors connexion ».</li>
          <li><strong>Papier</strong> : imprimez-le et rangez-le dans un classeur rouge à l'accueil et près des postes concernés.</li>
          <li><strong>Après chaque modification ou chaque test</strong>, enregistrez-le de nouveau : la cartographie vous le rappelle.</li>
        </ol>
      </div>
    </Modal>
  );
}
