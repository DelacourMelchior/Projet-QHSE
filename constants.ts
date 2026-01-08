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
    title: 'AUDIT DE ROBUSTESSE',
    subtitle: 'DIAGNOSTIC FLASH',
    duration: '48 heures',
    description: "L'intervention chirurgicale pour stopper vos pertes invisibles.",
    benefits: [
      "Détection des pertes d'argent invisibles",
      "Vision claire de vos zones de fragilité",
      "Tri immédiat entre l'urgent et l'accessoire"
    ],
    deliverables: [
      "La liste des \"Points Rouges\" (Risques majeurs)",
      "Repérage des freins qui ralentissent vos équipes",
      "Plan de bataille : Quoi faire, Quand et le Budget"
    ],
    image: 'https://image.pollinations.ai/prompt/macro%20shot%20luxury%20wrist%20watch%20mechanism%20on%20dark%20desk%20white%20thin%20technical%20circle%20overlay%20trigonometry%20golden%20ratio%20dark%20cinematic%20lighting%20photorealistic?nologo=true',
    link: Page.OFFER_ROBUSTESSE
  },
  {
    id: 'accompagnement-mensuel',
    title: "PROGRAMME DE\nSTRUCTURATION\n& PERFORMANCE",
    subtitle: 'MISE EN PLACE SMQ',
    duration: 'Forfait mensuel',
    description: "Transformez votre artisanat en industrie. Structurez pour durer.",
    benefits: [
      "Fin du chaos quotidien (Fluidité)",
      "Votre savoir-faire ne dépend plus des hommes",
      "On arrête de réinventer la roue chaque matin"
    ],
    deliverables: [
      "Les \"Règles du Jeu\" écrites (Processus clairs)",
      "Boîte à outils documentaire (Zéro paperasse inutile)",
      "Tableaux de bord pour piloter sans aveuglement"
    ],
    image: 'https://image.pollinations.ai/prompt/antique%20nautical%20compass%20on%20dark%20table%20white%20navigation%20geometry%20lines%20overlay%20golden%20spiral%20overlay%20cinematic%20dark%20green%20mood?nologo=true',
    link: Page.OFFER_EXECUTION
  },
  {
    id: 'iso-9001',
    title: 'ARCHITECTURE & CERTIFICATION',
    subtitle: 'ISO 9001',
    duration: '6 à 9 mois',
    description: "Le sésame pour changer de ligue. Devenez un fournisseur de rang 1.",
    benefits: [
      "Accès aux marchés réservés aux \"Gros\"",
      "Garantie de résultat (100% de réussite)",
      "Valorisation immédiate de l'entreprise (Capital)"
    ],
    deliverables: [
      "Système Qualité clé en main (Manuel & Procédures)",
      "Présence \"Bouclier\" le jour de l'audit officiel",
      "Le Certificat ISO 9001 affiché au mur"
    ],
    image: 'https://image.pollinations.ai/prompt/wax%20seal%20stamp%20certificate%20document%20dark%20mood%20lighting%20white%20grid%20proportions%20overlay%20technical%20drawing%20style%20macro%20photography?nologo=true',
    link: Page.OFFER_ISO
  },
  {
    id: 'suivi-amelioration',
    title: 'AUDIT BLANC ISO 9001',
    subtitle: 'PRÉ-VALIDATION (2-5 JOURS)',
    duration: '2 à 5 jours',
    description: "Ne jouez pas votre certification aux dés. Testez, corrigez, réussissez.",
    benefits: [
      "Suppression du stress (Zéro surprise)",
      "Élimination des \"Non-Conformités Majeures\"",
      "Vos équipes sont entraînées à répondre"
    ],
    deliverables: [
      "Simulation d'audit ISO 9001 en conditions réelles",
      "Liste des écarts normatifs (Pièges)",
      "Plan de bataille immédiat (Actions Correctives)"
    ],
    image: 'https://image.pollinations.ai/prompt/abstract%20spiral%20staircase%20architecture%20infinite%20loop%20symbol%20fibonacci%20sequence%20overlay%20dark%20moody%20photography%20high%20contrast?nologo=true',
    link: Page.OFFER_AUDIT
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

// Les 3 Piliers de la Performance (Coût de l'inaction)
export const VALUES = [
  {
    id: "01",
    title: "IDENTIFICATION DES RISQUES",
    text: "Le risque n'est pas que technique. C'est l'accumulation du **coût du retravail** (non-qualité), du **manque à gagner commercial** par défiance, et du **temps de direction perdu**. L'audit chiffre ces 3 fuites pour les stopper.",
    verdictTitle: "1 110 000 € / AN",
    verdictSubtitle: "Perte estimée pour une PME de 5M€ de CA",
    verdictText: "",
    link: Page.IMPACT_RISQUE,
    color: "text-[#8A1C1C]", // Red Accent
    buttonText: "VOIR L'ANALYSE DÉTAILLÉE →"
  },
  {
    id: "02",
    title: "STRUCTURATION DES PROCESSUS",
    text: "L'absence de règles écrites coûte cher. Additionnez la **perte de productivité** (friction), le **coût de remplacement des experts** (savoir tribal) et le **CA refusé** faute de capacité (plafond de verre).",
    verdictTitle: "890 000 € / AN",
    verdictSubtitle: "Manque à gagner estimé pour une PME de 5M€ de CA",
    verdictText: "",
    link: Page.IMPACT_SYSTEME,
    color: "text-[#8A1C1C]", // Red Accent
    buttonText: "VOIR L'ANALYSE DÉTAILLÉE →"
  },
  {
    id: "03",
    title: "PILOTAGE PAR LA DATA",
    text: "Piloter au feeling est un luxe. Entre les **salaires gaspillés** en reporting inutile, les **marges négatives** sur contrats toxiques et le **coût de l'inertie** : l'aveuglement détruit votre trésorerie.",
    verdictTitle: "190 000 € / AN",
    verdictSubtitle: "Perte sèche estimée pour une PME de 5M€ de CA",
    verdictText: "",
    link: Page.IMPACT_DATA,
    color: "text-[#8A1C1C]", // Red Accent
    buttonText: "VOIR L'ANALYSE DÉTAILLÉE →"
  }
];