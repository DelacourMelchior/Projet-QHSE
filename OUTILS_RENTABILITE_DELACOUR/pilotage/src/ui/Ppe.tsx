// Pictograms of the protective equipment (simplified, blue disc as the mandatory signs), for workers who read little French.
const ICON: Record<string, string> = {
  lunettes: 'M5 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0M13 13a3 3 0 1 0 6 0a3 3 0 1 0-6 0M11 13h2M3 12l2 1M21 12l-2 1',
  chaussures: 'M4 8v9h16v-2c0-2-3-3-6-3l-3-4H7V8z',
  gants: 'M8 20v-8M8 12V5M11 12V4M14 12V5M17 13V8M8 20h8l1-7',
  auditives: 'M5 13a2 2 0 0 0 4 0v-2a3 3 0 0 1 6 0v2a2 2 0 0 0 4 0M12 5v3',
  masque: 'M5 10c3-3 11-3 14 0v4c-3 4-11 4-14 0zM3 10h2M19 10h2',
  blouse: 'M8 4l4 3l4-3l4 4l-3 3v9H7v-9L4 8z',
};
const keyOf = (label: string) => { const l = label.toLowerCase(); return l.includes('lunette') ? 'lunettes' : l.includes('chaussure') ? 'chaussures' : l.includes('gant') ? 'gants' : l.includes('audit') ? 'auditives' : l.includes('masque') ? 'masque' : l.includes('blouse') || l.includes('tablier') ? 'blouse' : ''; };

export function PpeIcon({ label, size = 22 }: { label: string; size?: number }) {
  const d = ICON[keyOf(label)];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1d4ed8" />
      {d ? <path d={d} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(2.4 2.4) scale(0.8)" /> : <text x="12" y="16" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">!</text>}
    </svg>
  );
}
