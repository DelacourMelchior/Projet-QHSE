// Prints one document of the page (a work instruction, the naming charter…) instead of the whole screen, in A4 portrait.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function usePrintOne(): [ReactNode, (content: ReactNode) => void] {
  const [content, setContent] = useState<ReactNode>(null);
  useEffect(() => {
    if (!content) return;
    document.body.classList.add('printing-one');
    const done = () => { document.body.classList.remove('printing-one'); setContent(null); };
    window.addEventListener('afterprint', done, { once: true });
    const t = window.setTimeout(() => window.print(), 50);   // let the images of the document load
    return () => { window.clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [content]);
  const node = content ? createPortal(<div className="print-one bg-white text-slate-900"><style>{'@page { size: A4 portrait; margin: 12mm; }'}</style>{content}</div>, document.body) : null;
  return [node, setContent];
}
