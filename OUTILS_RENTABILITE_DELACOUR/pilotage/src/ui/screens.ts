// Screen of each tool of processes 2 to 5 (tools 1.1 to 1.3 are drawn by the shell).
import type { ComponentType } from 'react';
import type { Nav, ToolId } from './tools';
import { Devis } from './commercial/Devis';
import { Avenants } from './commercial/Avenants';
import { Reclamations } from './commercial/Reclamations';
import { BilanFin } from './commercial/BilanFin';
import { BacRouge } from './quality/BacRouge';
import { NonQualite } from './quality/NonQualite';
import { Ateliers } from './quality/Ateliers';
import { Detrompeurs } from './quality/Detrompeurs';

export interface ScreenProps { nav: Nav; focus: string; clearFocus(): void }

export const SCREENS: Partial<Record<ToolId, ComponentType<ScreenProps>>> = {
  '2.1': Devis,
  '2.2': Avenants,
  '2.3': Reclamations,
  '2.4': BilanFin,
  '5.1': BacRouge,
  '5.2': NonQualite,
  '5.3': Ateliers,
  '5.4': Detrompeurs,
};
