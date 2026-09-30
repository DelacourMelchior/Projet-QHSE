// A draft edited in place, saved when a field is left or when the screen closes: typing does not write the whole state at every key.
import { useEffect, useRef, useState } from 'react';

export function useDraft<T>(initial: T, saved: T | undefined, save: (draft: T) => void, enabled = true) {
  const [draft, setDraft] = useState(initial);
  const commit = () => { if (enabled && JSON.stringify(draft) !== JSON.stringify(saved)) save(draft); };
  const latest = useRef(commit);
  latest.current = commit;
  useEffect(() => () => latest.current(), []);
  return [draft, setDraft, commit] as const;
}
