export enum Page {
  HOME = 'HOME',
  ABOUT = 'ABOUT',
  SERVICES = 'SERVICES',
  METHOD = 'METHOD',
  CONTACT = 'CONTACT',
  LEGAL = 'LEGAL'
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
  description: string;
  benefits: string[];
  deliverables: string[]; // Added from PDF
  image: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  metric?: string;
}