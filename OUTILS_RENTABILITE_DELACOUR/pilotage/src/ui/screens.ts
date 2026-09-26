// Screen of each tool of processes 2 to 5 (tools 1.1 to 1.3 are drawn by the shell).
import type { ComponentType } from 'react';
import type { Nav, ToolId } from './tools';
import { BacRouge } from './quality/BacRouge';
import { NonQualite } from './quality/NonQualite';
import { Ateliers } from './quality/Ateliers';
import { Detrompeurs } from './quality/Detrompeurs';

export interface ScreenProps { nav: Nav; focus: string; clearFocus(): void }

export const SCREENS: Partial<Record<ToolId, ComponentType<ScreenProps>>> = {
  '5.1': BacRouge,
  '5.2': NonQualite,
  '5.3': Ateliers,
  '5.4': Detrompeurs,
};
