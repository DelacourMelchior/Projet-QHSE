// Test of autonomy at the workstation: the 3 questions are written from the sheet (first step, trap, the operation with its protections), then a
// picture quiz "good or not good ?" made from the pictures of the sheet. When everything is right, the person is allowed to work alone.
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Sop } from '../../domain/types';
import { photoQuiz, testQuestions } from '../../domain/instructions';
import { Button, Field, inputCls, Modal, YesNo } from '../common';
import { Pic } from '../../photo/Pic';

export function SopTest({ s, tutor0, onClose, onPass }: { s: Sop; tutor0: string; onClose(): void; onPass(person: string, tutor: string): void }) {
  const questions = testQuestions(s), quiz = photoQuiz(s);
  const [person, setPerson] = useState(''), [tutor, setTutor] = useState(tutor0);
  const [answers, setAnswers] = useState<(boolean | null)[]>(questions.map(() => null));
  const [seen, setSeen] = useState<(boolean | null)[]>(quiz.map(() => null));   // what the person answered: true = "good"
  const rightAll = quiz.every((q, i) => seen[i] === q.good), answered = seen.every(x => x !== null);
  const passed = answers.every(a => a === true) && answered && rightAll;
  // answers given are not lost by a tap beside the window
  const touched = answers.some(a => a !== null) || seen.some(a => a !== null) || !!person.trim();
  const close = () => { if (touched && !passed && !window.confirm('Fermer le test ? Les réponses données seront perdues.')) return; onClose(); };
  return (
    <Modal wide onClose={close} title="Test d'autonomie au poste" subtitle={`${s.poste} · ${s.operation}`}
      footer={<><Button onClick={close}>Fermer</Button><Button kind="primary" disabled={!passed || !person.trim()} onClick={() => { onPass(person.trim(), tutor.trim()); onClose(); }}><Check size={14} />Habiliter {person.trim() || 'la personne'}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Personne testée"><input className={inputCls} value={person} list="people" onChange={e => setPerson(e.target.value)} /></Field>
          <Field label="Tuteur"><input className={inputCls} value={tutor} list="people" onChange={e => setTutor(e.target.value)} /></Field>
        </div>
        <ol className="space-y-1.5">
          {questions.map((q, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 text-xs text-slate-800"><strong>{i + 1}.</strong> {q}</span>
              <YesNo label={`Question ${i + 1}`} labels={['Validé', 'À revoir']} value={answers[i]} onChange={v => setAnswers(a => a.map((x, j) => (j === i ? v : x)))} />
            </li>
          ))}
        </ol>
        {quiz.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Photos : bon ou pas bon ?</h3>
            <p className="text-[11px] text-slate-500">La personne regarde chaque photo et dit si c'est bon ou pas bon. Le résultat s'affiche tout de suite.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {quiz.map((q, i) => (
                <li key={i} className={`space-y-1.5 rounded-lg border-2 p-2 ${seen[i] === null ? 'border-slate-200' : seen[i] === q.good ? 'border-emerald-500' : 'border-red-500'}`}>
                  <Pic value={q.photo} alt="À juger : bon ou pas bon" size="t" className="h-36 w-full rounded" />
                  <div className="flex items-center gap-1.5">
                    {([[true, 'Bon'], [false, 'Pas bon']] as const).map(([v, l]) => (
                      <button key={l} type="button" aria-pressed={seen[i] === v} onClick={() => setSeen(a => a.map((x, j) => (j === i ? v : x)))}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold max-sm:min-h-[44px] ${seen[i] === v ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{l}</button>
                    ))}
                    {seen[i] !== null && (seen[i] === q.good ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><Check size={14} />Juste : {q.label.toLowerCase()}</span> : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700"><X size={14} />C'était : {q.label.toLowerCase()}</span>)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-[11px] text-slate-600">{passed ? 'Test réussi : la personne peut être habilitée.' : 'Habilitation possible quand les 3 questions sont validées et les photos jugées justes.'}</p>
      </div>
    </Modal>
  );
}
