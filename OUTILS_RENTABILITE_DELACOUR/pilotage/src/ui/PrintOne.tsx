// Prints one document of the page (a work instruction, the naming charter…) instead of the whole screen. A4 portrait unless the page says otherwise
// ("A3 landscape", "A5 portrait"…). While the pictures of the document are read from the photo store a message says so ("Préparation de l'impression…");
// past 20 seconds the document is printed with what is ready, the missing pictures drawn as a frame "Photo non reçue", and the message says it. A second tap on "Imprimer" while
// the first is still waiting adds no wait (the pictures are not waited for again from the start): it is left aside; once the dialog was asked for, a new tap prints again (F-8).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { photosReady } from '../photo/store';

const LIMIT = 20000;   // ms to wait for the pictures
const photos = (n: number) => `${n} photo${n > 1 ? 's' : ''}`;
// A picture still loading is a `div[role=img]` with nothing in it (Pic.tsx): past the limit it says why it is empty
const LATE = '.print-late div[role="img"]:empty::after { content: "Photo non reçue"; font-size: 9pt; }';

export function usePrintOne(): [ReactNode, (content: ReactNode, page?: string) => void] {
  const [job, setJob] = useState<{ content: ReactNode; page: string } | null>(null);
  const [wait, setWait] = useState<{ left: number; late: boolean } | null>(null);   // the pictures still on their way; late: the limit passed
  const waiting = useRef(false);   // a print is waiting for its pictures
  useEffect(() => {
    if (!job) return;
    waiting.current = true;
    document.body.classList.add('printing-one');
    const done = () => { waiting.current = false; document.body.classList.remove('printing-one'); setWait(null); setJob(null); };
    window.addEventListener('afterprint', done, { once: true });
    let live = true;
    const root = () => document.querySelector<HTMLElement>('.print-one');
    const left = () => root()?.querySelectorAll('div[role="img"]:empty').length ?? 0;
    setWait({ left: 0, late: false });
    // the pictures of the document are read from the photo store: print once they are all there and drawn, or at the limit
    const t = window.setTimeout(async () => {
      const poll = window.setInterval(() => { if (live) setWait({ left: left(), late: false }); }, 300);
      setWait({ left: left(), late: false });
      const late = await Promise.race([photosReady().then(() => false), new Promise<boolean>(r => window.setTimeout(() => r(true), LIMIT))]);
      window.clearInterval(poll);
      if (late) { root()?.classList.add('print-late'); if (live) setWait({ left: left(), late: true }); }
      await new Promise(r => window.setTimeout(r, 250));
      waiting.current = false;
      if (live) window.print();
    }, 50);
    return () => { live = false; waiting.current = false; window.clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [job]);
  const node = job ? createPortal(
    <>
      <div className="print-one bg-white text-slate-900"><style>{`@page { size: ${job.page}; margin: 10mm; } ${LATE}`}</style>{job.content}</div>
      {wait && <div role="status" className="fixed inset-x-0 bottom-24 z-[200] mx-auto w-fit max-w-[92vw] rounded-lg border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-lg">
        {wait.late ? `Impression lancée sans ${photos(wait.left)} pas encore reçue${wait.left > 1 ? 's' : ''}.` : `Préparation de l'impression…${wait.left ? ` (${photos(wait.left)})` : ''}`}
      </div>}
    </>, document.body) : null;
  return [node, (content, page = 'A4 portrait') => { if (waiting.current) return; waiting.current = true; setJob({ content, page }); }];
}
