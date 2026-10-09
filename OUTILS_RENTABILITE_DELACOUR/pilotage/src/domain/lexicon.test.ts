// Tool 3.4: one word for one notion (lot 8, A-5, A-13, A-15). The sources of the tool (the domain `receptions*.ts`, the screens `Rc*.tsx` and `Receptions.tsx`) are read as code: only the texts that
// can reach the screen, the paper or the file are looked at (the strings, the pieces of the template strings and the text of the JSX), never a comment nor a regular expression.
// The words that are forbidden: "(s)" in a label (the number is read in the tile and on the PV, "avec réserve" is a category), the "présentation" of a delivery (it is a "livraison"), "rétablir"
// (it is "restaurer"), "affaire" (it is a "commande"), "Autre…" (it is "Autre, précisez"), "Voir le défaut" (it is "Ouvrir"), "Valeur attendue entre" (it is "plage attendue"), and two words that claim
// a quality the tool does not check ("contradictoire", "réceptionnaire habilité").
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const FORBIDDEN: [string, RegExp][] = [
  ['(s)', /\(s\)/], ['présentée', /présentée/i], ['représent', /représent/i], ['Rétablir', /rétablir/i], ['rétablie', /rétablie/i], ['affaire', /affaire/i], ['Autre…', /Autre(…|\.\.\.)/],
  ['Voir le défaut', /Voir le défaut/i], ['Valeur attendue entre', /Valeur attendue entre/i], ['contradictoire', /contradictoire/i], ['réceptionnaire habilité', /réceptionnaire habilité/i],
];

// The texts of a source, with their line: the strings, the pieces of the template strings, the text of the JSX
function textsOf(name: string, source: string): { line: number; text: string }[] {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS), out: { line: number; text: string }[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) out.push({ line: file.getLineAndCharacterOfPosition(n.getStart()).line + 1, text: n.text });
    ts.forEachChild(n, visit);
  };
  visit(file);
  return out;
}
const forbiddenIn = (name: string, source: string): string[] => textsOf(name, source).flatMap(t => FORBIDDEN.filter(([, re]) => re.test(t.text)).map(([word]) => `${name}:${t.line}: « ${word} » dans « ${t.text.slice(0, 80)} »`));

const DOMAIN = new URL('./', import.meta.url), SCREENS = new URL('../ui/operations/', import.meta.url);
const sources = [
  ...readdirSync(DOMAIN).filter(f => /^receptions.*\.ts$/.test(f) && !/\.test\./.test(f)).map(f => ({ name: `src/domain/${f}`, url: new URL(f, DOMAIN) })),
  ...readdirSync(SCREENS).filter(f => /^(Rc.*|Receptions)\.tsx$/.test(f) && !/\.test\./.test(f)).map(f => ({ name: `src/ui/operations/${f}`, url: new URL(f, SCREENS) })),
];

describe('3.4 lexicon: one word for one notion', () => {
  it('reads the texts of a source, and not the comments nor the regular expressions', () => {
    const src = ["// Avec réserve(s) : a comment", "const re = /réserve\\(s\\)|affaire/;", "const a = 'Avec réserve(s)', b = `Livraison ${n} présentée`, c = \"Voir le défaut\";", "const el = <p title=\"Autre…\">Rétablir la commande</p>;"].join('\n');
    expect(forbiddenIn('x.tsx', src)).toEqual([
      "x.tsx:3: « (s) » dans « Avec réserve(s) »", expect.stringContaining('« présentée » dans'), "x.tsx:3: « Voir le défaut » dans « Voir le défaut »", "x.tsx:4: « Autre… » dans « Autre… »", "x.tsx:4: « Rétablir » dans « Rétablir la commande »",
    ]);
    expect(forbiddenIn('y.ts', "export const ok = 'Avec réserve', other = `${1} réserves`; // (s) in a comment")).toEqual([]);
  });
  it('finds the sources of the tool, and the texts in them', () => {
    expect(sources.length).toBeGreaterThan(20);
    ['src/domain/receptions.ts', 'src/domain/receptionsAll.ts', 'src/domain/receptionsPdf.ts', 'src/ui/operations/Receptions.tsx', 'src/ui/operations/RcCards.tsx'].forEach(n => expect(sources.map(x => x.name), n).toContain(n));
    const all = sources.flatMap(x => textsOf(x.name, readFileSync(x.url, 'utf8')));
    expect(all.length).toBeGreaterThan(1500);
    expect(all.some(t => t.text === 'Réception refusée')).toBe(true);
  });
  it('has no forbidden word in a text of the tool', () => {
    const found = sources.flatMap(x => forbiddenIn(x.name, readFileSync(x.url, 'utf8')));
    expect(found).toEqual([]);
  });
});
