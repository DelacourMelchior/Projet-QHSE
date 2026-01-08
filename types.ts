

export enum Page {
  HOME = 'HOME',
  ABOUT = 'ABOUT',
  SERVICES = 'SERVICES',
  METHOD = 'METHOD',
  CONTACT = 'CONTACT',
  LEGAL = 'LEGAL',
  OFFER_ISO = 'OFFER_ISO',
  OFFER_EXECUTION = 'OFFER_EXECUTION',
  OFFER_AUDIT = 'OFFER_AUDIT',
  OFFER_ROBUSTESSE = 'OFFER_ROBUSTESSE',
  IMPACT_RISQUE = 'IMPACT_RISQUE',
  IMPACT_SYSTEME = 'IMPACT_SYSTEME',
  IMPACT_DATA = 'IMPACT_DATA'
}

export interface NavItem {
  label: string;
  page: Page;
}

export interface Service {
  id: string;
  title: string;
  subtitle: string; // Short subtitle for cards
  duration: string; // Added from PDF
  description: string; // Used as the Quote/Citation
  benefits: string[];
  deliverables: string[]; // Added from PDF
  image: string;
  link?: Page; // Added for direct navigation
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  metric?: string;
}