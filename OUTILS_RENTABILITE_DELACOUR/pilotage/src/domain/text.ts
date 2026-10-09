// A text compared as people read it: without its accents, its case or the spaces round it. 3.4 reads its own copy: the instructions of 3.2 are written by another session.
export const norm = (t: string | undefined | null) => (t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
