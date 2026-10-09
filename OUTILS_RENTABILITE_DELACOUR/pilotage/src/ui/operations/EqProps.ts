// What the tabs of the sheet of a piece of equipment (tool 3.3) receive from the sheet. The sheet (EqSheet) owns the saving: a draft is written as typed,
// the life of the equipment (readings, anomalies, breakdowns, checks done) is written at once by `act`, never through the typed copy.
import type { Equipment, State } from '../../domain/types';
import type { Nav } from '../tools';

export type EqTab = 'routine' | 'issues' | 'cabinet' | 'checks' | 'sheet';

export interface EqTabProps {
  e: Equipment;                       // typed content of the sheet, with the life of the saved record merged in
  saved?: Equipment;                  // the saved record; undefined while the equipment is new
  state: State;
  by: string;                         // who is typing (author of the device, 'anonyme' by default)
  set(x: Partial<Equipment>, life?: (e: Equipment, by: string) => Equipment): void;   // typed content (identity, points, checks): the sheet writes the draft and offers "Annuler" when something is removed; `life`: a move of the life done with it (undone with it)
  act(f: (e: Equipment, by: string) => Equipment): void;   // a move of the life: applied at once to the saved record (to the local copy while it is new)
  nav: Nav;
  openStation(): void;                // opens the full-screen routine of this equipment
}
