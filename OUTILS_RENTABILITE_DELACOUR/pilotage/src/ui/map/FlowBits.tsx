// Pieces shared by the flowchart page and the panel of a step (tool 1.4): the words of each kind of step, the choice of the role, the small chips.
import { useState, type ReactNode } from 'react';
import type { Skill, StepKind } from '../../domain/types';
import { ChevronRight } from 'lucide-react';
import { STEP_KINDS } from '../../domain/cartography';
import { inputCls } from '../common';

// A fold that is open or shut once, from what it holds when it appears; typing in it never shuts it (an `open` bound to the data would)
export function Fold({ open: first = false, summary, className = 'rounded-lg border border-slate-200 bg-white', summaryClass = 'text-xs font-semibold text-delacour-primary', children }: { open?: boolean; summary: ReactNode; className?: string; summaryClass?: string; children: ReactNode }) {
  const [open, setOpen] = useState(first);
  return (
    <details open={open} onToggle={e => setOpen(e.currentTarget.open)} className={`group ${className}`}>
      <summary className={`flex min-h-[28px] cursor-pointer list-none items-center gap-1.5 px-3 py-2 hover:bg-slate-50 ${summaryClass}`}><ChevronRight size={12} aria-hidden className="shrink-0 transition group-open:rotate-90" />{summary}</summary>
      {children}
    </details>
  );
}

export const kindLabel = (k: StepKind) => STEP_KINDS.find(x => x.key === k)!.label;
const NEW_ROLE = '__new';

// What each kind of step means and how it works, in full in the legend (KIND_HELP); one or two sentences on the step that is open (KIND_SHORT)
export const KIND_HELP: Record<StepKind, string> = {
  start: "Là où le processus commence : ce qui le déclenche (une demande de prix reçue, un défaut constaté). Il y en a un seul, en haut.",
  action: "Une chose à faire, par une personne ou un rôle. Commencer par un verbe : chiffrer, valider, envoyer. Idéalement une seule chose par étape : si on dit « et », ce sont souvent deux étapes.",
  decision: "Une question qui a plusieurs réponses possibles. Le plus souvent oui ou non (« Marge suffisante ? »), mais on peut en mettre autant qu'on veut, avec les mots qu'on veut (« Retenu », « À revoir », « Refusé »). Une flèche sort pour chaque réponse : vers l'étape suivante, une autre étape, un retour en arrière pour recommencer, ou une fin. On choisit où va chaque réponse dans les détails de l'étape.",
  document: "À choisir quand l'étape consiste à produire ou à signer un document (faire signer le procès-verbal). Pour une action qui s'appuie sur un document (chiffrer le devis), garder « Action » et remplir « Document produit ou lu » dans ses détails.",
  subprocess: "Une étape qui renvoie vers un autre logigramme, utile quand ce travail est déjà décrit ailleurs ou qu'il est lui-même toute une suite d'étapes : on le suit, puis on reprend ici. Exemple : l'étape « Isoler la pièce et décider » renvoie vers le logigramme « Traiter une pièce non conforme ». On choisit le logigramme appelé dans les détails de l'étape. Dans le schéma, la barre violette « ↳ nom » de l'étape ouvre ce logigramme ; le logigramme appelé dit en haut d'où il est appelé.",
  end: "Là où le processus s'arrête. Il peut y avoir plusieurs fins : commande signée, offre abandonnée.",
};

// The role of a step: one of the roles already used (so a typing mistake does not make a new column), a skill of tool 4.2 or a person of the staff list (the lane then carries its name
// and the step says who can do it), or a new role typed beside
export function RoleCell({ value, refKey, roles, skills, people, label, onPick }: { value: string; refKey: string; roles: string[]; skills: Skill[]; people: { id: string; name: string }[]; label: string; onPick(role: string, ref?: { kind: 'skill' | 'person'; id: string }): void }) {
  const [typing, setTyping] = useState(false), known = roles.includes(value), custom = !refKey && (typing || (!!value && !known));
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <select className={`${inputCls} !w-full`} aria-label={label} value={refKey || (custom ? NEW_ROLE : value)} onChange={e => {
        const v = e.target.value;
        if (v === NEW_ROLE) { setTyping(true); if (known || refKey) onPick(''); return; }
        setTyping(false);
        if (v.startsWith('__sk:')) onPick(skills.find(k => k.id === v.slice(5))?.name || '', { kind: 'skill', id: v.slice(5) });
        else if (v.startsWith('__pp:')) onPick(people.find(p => p.id === v.slice(5))?.name || '', { kind: 'person', id: v.slice(5) });
        else onPick(v);
      }}>
        <option value="">Qui ?</option>
        {roles.length > 0 && <optgroup label="Rôles">{roles.map(r => <option key={r} value={r}>{r}</option>)}</optgroup>}
        {skills.length > 0 && <optgroup label="Compétences (outil 4.2)">{skills.map(k => <option key={k.id} value={`__sk:${k.id}`}>{k.name}</option>)}</optgroup>}
        {people.length > 0 && <optgroup label="Personnes">{people.map(p => <option key={p.id} value={`__pp:${p.id}`}>{p.name}</option>)}</optgroup>}
        <option value={NEW_ROLE}>Nouveau rôle…</option>
      </select>
      {custom && <input className={`${inputCls} !w-full`} aria-label={`${label} (nom du nouveau rôle)`} autoFocus={typing && !value} value={value} placeholder="Nom du rôle" onChange={e => onPick(e.target.value)} onBlur={() => { if (value.trim() && roles.includes(value.trim())) setTyping(false); }} />}
    </span>
  );
}

export const KIND_SHORT: Record<StepKind, string> = {
  start: 'Ce qui déclenche le processus. Un seul, en haut.',
  action: 'Une chose à faire, par une personne ou un rôle. Commencer par un verbe.',
  decision: 'Une question avec plusieurs réponses (oui, non, ou les mots que l’on veut). Chaque réponse dit où l’on va ensuite.',
  document: 'Produire ou signer un document.',
  subprocess: 'Renvoie vers un autre logigramme, que l’on suit puis on reprend ici.',
  end: 'Là où le processus s’arrête. Il peut y en avoir plusieurs.',
};
export const stepPlaceholder = (k: StepKind) => (k === 'decision' ? 'Une question (la marge est-elle suffisante ?)' : k === 'start' ? 'Ce qui déclenche…' : k === 'end' ? 'Résultat obtenu…' : 'Un verbe (chiffrer, valider…)');

export const Chip = ({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'no' | 'yes' | 'ctl' }) => (
  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${{ plain: 'border-slate-400 bg-white text-slate-900', no: 'border-red-200 bg-red-50 text-red-800', yes: 'border-emerald-200 bg-emerald-50 text-emerald-800', ctl: 'border-red-300 bg-white text-red-800' }[tone]}`}>{children}</span>
);

export const ChipButton = ({ children, onClick, title, onRemove, removeLabel }: { children: React.ReactNode; onClick(): void; title: string; onRemove?(): void; removeLabel?: string }) => (
  <span className="inline-flex items-stretch overflow-hidden rounded-full border border-sky-300 bg-sky-50 text-[11px] font-semibold text-sky-900">
    <button type="button" onClick={onClick} title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark ${onRemove ? 'pr-1.5' : ''}`}>{children}</button>
    {onRemove && <button type="button" onClick={onRemove} aria-label={removeLabel || 'Retirer ce lien'} title="Retirer ce lien" className="border-l border-sky-300 px-1.5 text-sky-900 hover:bg-red-50 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-delacour-golddark max-sm:min-w-[44px]">×</button>}
  </span>
);
export const branchTone = (label: string) => (label.trim().toLowerCase() === 'oui' ? 'yes' : label.trim().toLowerCase() === 'non' ? 'no' : 'plain') as 'yes' | 'no' | 'plain';
export const branchColor = (label: string) => ({ yes: '#047857', no: '#b91c1c', plain: '#1d4ed8' })[branchTone(label)];
