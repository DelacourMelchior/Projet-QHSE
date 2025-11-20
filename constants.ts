import { Page, Service, Testimonial } from './types';
import { CheckCircle, BarChart3, ShieldCheck, FileSearch, Users, TrendingUp } from 'lucide-react';

export const NAV_ITEMS = [
  { label: 'Accueil', page: Page.HOME },
  { label: 'À Propos', page: Page.ABOUT },
  { label: 'Prestations', page: Page.SERVICES },
  { label: 'Méthode', page: Page.METHOD },
  { label: 'Contact', page: Page.CONTACT },
];

export const SERVICES: Service[] = [
  {
    id: 'audit-essentiel',
    title: 'Audit Qualité Essentiel',
    subtitle: 'Diagnostic & Impact',
    duration: '1 journée',
    description: 'Un audit ciblé et optimisé, concentré sur les points stratégiques de votre système qualité pour maximiser l’impact en une seule journée.',
    benefits: [
      'Vision claire et immédiate de l’essentiel',
      'Action efficace sur ce qui compte vraiment',
      'Gain de temps opérationnel'
    ],
    deliverables: [
      'Analyse des leviers de performance prioritaires',
      'Synthèse claire et hiérarchisée',
      'Plan d’actions opérationnel rapide à déployer'
    ],
    image: 'https://picsum.photos/id/445/800/600'
  },
  {
    id: 'atelier-sensibilisation',
    title: 'Atelier de Sensibilisation',
    subtitle: 'Culture & Engagement',
    duration: '1/2 journée',
    description: 'Un atelier court, dynamique et engageant pour ancrer la culture qualité et impliquer vos équipes dans la démarche d’amélioration continue.',
    benefits: [
      'Collaborateurs mobilisés',
      'Conscience du rôle de chacun',
      'Acteurs de la performance collective'
    ],
    deliverables: [
      'Animation interactive et pédagogique',
      'Supports pratiques et livret de synthèse',
      'Messages adaptés à votre contexte terrain'
    ],
    image: 'https://picsum.photos/id/318/800/600'
  },
  {
    id: 'accompagnement-mensuel',
    title: 'Accompagnement Mensuel',
    subtitle: 'Pilotage & Structure',
    duration: 'Forfait mensuel',
    description: 'Un accompagnement continu, combinant pilotage stratégique, soutien opérationnel et suivi d’indicateurs pour structurer et faire vivre votre SMQ.',
    benefits: [
      'Démarche maîtrisée et durable',
      'Conformité garantie',
      'Performance du système qualité'
    ],
    deliverables: [
      'Suivi régulier des plans d’action',
      'Accompagnement aux audits internes et externes',
      'Analyse et ajustement des indicateurs clés'
    ],
    image: 'https://picsum.photos/id/5/800/600'
  },
  {
    id: 'iso-9001',
    title: 'Audit Complet & Certification',
    subtitle: 'Excellence & ISO 9001',
    duration: 'Sur mesure',
    description: 'Un accompagnement global, de l’audit initial à la certification, avec une approche rigoureuse et personnalisée selon votre environnement.',
    benefits: [
      'Certification maîtrisée',
      'Système qualité solide',
      'Service de la performance de l’entreprise'
    ],
    deliverables: [
      'Diagnostic complet du SMQ',
      'Plan de mise en conformité détaillé',
      'Suivi jusqu’à l’obtention de la certification'
    ],
    image: 'https://picsum.photos/id/60/800/600'
  },
  {
    id: 'suivi-amelioration',
    title: 'Suivi & Amélioration Continue',
    subtitle: 'Pérennité & Performance',
    duration: 'Forfait annuel',
    description: 'Un pilotage durable pour maintenir l’efficacité et la dynamique de votre système qualité dans le temps.',
    benefits: [
      'Amélioration continue mesurable',
      'Ancrage des bonnes pratiques',
      'Pérennité du système'
    ],
    deliverables: [
      'Animation des revues de direction',
      'Suivi des indicateurs et non-conformités',
      'Accompagnement actions correctives et préventives'
    ],
    image: 'https://picsum.photos/id/436/800/600'
  },
  {
    id: 'sur-mesure',
    title: 'Prestations Sur Mesure',
    subtitle: 'Agilité & Adaptation',
    duration: 'À définir',
    description: 'Des interventions personnalisées selon vos besoins spécifiques, qu’il s’agisse d’audits internes, de formations ou d’ajustements documentaires.',
    benefits: [
      'Réponse agile',
      'Solution sur mesure',
      'Alignement sur priorités opérationnelles'
    ],
    deliverables: [
      'Contenu et format adaptés à vos enjeux',
      'Intervention sur site ou à distance',
      'Livrables concrets et exploitables immédiatement'
    ],
    image: 'https://picsum.photos/id/180/800/600'
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    quote: "Une approche qui a transformé notre vision de la qualité. Ce n'est plus une contrainte, mais un moteur de croissance.",
    author: "Marc Dubreuil",
    role: "Directeur Industriel",
    metric: "-30% de non-conformités"
  },
  {
    id: '2',
    quote: "L'audit flash nous a permis de sauver notre certification. Une expertise chirurgicale et humaine.",
    author: "Sophie Valette",
    role: "Responsable QSE",
    metric: "Certification renouvelée"
  }
];

export const VALUES = [
  {
    icon: ShieldCheck,
    title: "Exigence",
    text: "La qualité ne tolère pas l'à-peu-près. Nous visons l'excellence dans chaque détail."
  },
  {
    icon: Users,
    title: "Humain",
    text: "Les processus sont portés par des hommes et des femmes. Nous plaçons l'équipe au cœur de la démarche."
  },
  {
    icon: TrendingUp,
    title: "Performance",
    text: "La conformité doit servir la rentabilité et l'efficacité opérationnelle de votre structure."
  }
];