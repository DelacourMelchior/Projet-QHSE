// The texts of 3.4 carry the narrow no-break spaces of `nb()` (before : ; ? ! % », inside "9 h 05"): a test reads them as plain spaces, on both sides of a comparison.
export const plain = (s: string): string => s.replace(/[  ]/g, ' ');
