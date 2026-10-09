// The banner for data of this browser that could not be read: the text is copied apart and can be downloaded; when the browser had no room for a copy,
// the text is still where it was, nothing is written over it, and the banner asks for the download at once (it is what gives the writing back)
import { unreadableText } from '../store/local';
import { useStore } from '../store/StoreContext';
import { downloadFile } from './download';

const bar = 'border-b border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 print:hidden';

export function Unreadable() {
  const { unreadable, uncopied, release } = useStore();
  if (uncopied) return (
    <p role="alert" className={bar}>Les données de ce navigateur n'ont pas pu être lues, et n'ont pas pu être copiées dans le navigateur : télécharger tout de suite. Rien n'est enregistré dans ce navigateur tant que ce n'est pas fait.{' '}
      <button type="button" className="underline" onClick={() => { downloadFile(`pilotage-donnees-illisibles-${new Date().toISOString().slice(0, 10)}.json`, unreadableText() || '', 'application/json'); release(); }}>Télécharger les données</button></p>
  );
  return unreadable ? <p role="alert" className={bar}>Les données de ce navigateur n'ont pas pu être lues. Une copie est gardée. <button type="button" className="underline" onClick={() => downloadFile(`${unreadable}.json`, unreadableText() || '', 'application/json')}>Télécharger la copie</button></p> : null;
}
