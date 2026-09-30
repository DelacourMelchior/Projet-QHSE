// Screen of each tool of processes 2 to 5, and of 1.4 and 1.5 (tools 1.1 to 1.3 are drawn by the shell).
import type { ComponentType } from 'react';
import type { Nav, ToolId } from './tools';
import { Rentabilite } from './Rentabilite';
import { CoutsHoraires } from './CoutsHoraires';
import { Charte } from './Charte';
import { Devis } from './commercial/Devis';
import { Avenants } from './commercial/Avenants';
import { Reclamations } from './commercial/Reclamations';
import { BilanFin } from './commercial/BilanFin';
import { Fournisseurs } from './operations/Fournisseurs';
import { Instructions } from './operations/Instructions';
import { Maintenance } from './operations/Maintenance';
import { Receptions } from './operations/Receptions';
import { Suppleances } from './team/Suppleances';
import { Polyvalence } from './team/Polyvalence';
import { Accueil } from './team/Accueil';
import { Classement } from './team/Classement';
import { BacRouge } from './quality/BacRouge';
import { NonQualite } from './quality/NonQualite';
import { Ateliers } from './quality/Ateliers';
import { Detrompeurs } from './quality/Detrompeurs';

export interface ScreenProps { nav: Nav; focus: string; clearFocus(): void }

export const SCREENS: Partial<Record<ToolId, ComponentType<ScreenProps>>> = {
  '1.4': Rentabilite,
  '1.5': CoutsHoraires,
  '1.6': Charte,
  '2.1': Devis,
  '2.2': Avenants,
  '2.3': Reclamations,
  '2.4': BilanFin,
  '3.1': Fournisseurs,
  '3.2': Instructions,
  '3.3': Maintenance,
  '3.4': Receptions,
  '4.1': Suppleances,
  '4.2': Polyvalence,
  '4.3': Accueil,
  '4.4': Classement,
  '5.1': BacRouge,
  '5.2': NonQualite,
  '5.3': Ateliers,
  '5.4': Detrompeurs,
};
