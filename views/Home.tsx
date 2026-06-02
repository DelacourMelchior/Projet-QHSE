import React, { useState } from 'react';
import { SERVICES } from '../constants';
import { Page } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Flame,
  ShieldAlert,
  Target,
  FileText,
  CheckCircle2,
  Check,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Sliders,
  ArrowUpRight,
  Users,
  LayoutDashboard,
  Database,
  EyeOff,
  Hourglass,
  Factory,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const QUICK_TURNOVERS = [
  { label: '1 M€', value: 1000000 },
  { label: '2 M€', value: 2000000 },
  { label: '5 M€', value: 5000000 },
  { label: '10 M€', value: 10000000 },
  { label: '15 M€', value: 15000000 },
];

const PILLARS_DATA = [
  {
    id: "01",
    title: "L'Autonomie des équipes",
    question: "« Que se passe-t-il si votre meilleur collaborateur est en arrêt demain matin ? »",
    reality: "Le savoir est bloqué dans la tête de vos trois meilleurs gars. Si votre chef d'équipe ou votre secrétaire s'absente, tout s'arrête. Vos salariés passent la moitié de la journée à vous chercher pour vous demander où est rangé ce bon ou comment faire cette procédure. Vous passez votre temps à faire le standardiste pour des évidences.",
    hemorragie: "Vous perdez 25% de temps productif. Sur 10 salariés, c’est comme si vous payiez 2 personnes à temps plein pour brasser du vent.",
    icon: FileText
  },
  {
    id: "02",
    title: "Le Stop au double travail",
    question: "« Payez-vous vos équipes pour faire, ou pour refaire ? »",
    reality: "Entre un rapport de chantier incomplet, une mauvaise référence saisie sur Excel et une facture qui part avec une erreur, vos équipes passent leur temps à écoper l'eau au lieu de couper le robinet. Des clients râlent, les gars font des allers-retours inutiles, et vous payez des heures de bureau uniquement pour corriger des boulettes.",
    hemorragie: "15% de votre chiffre d'affaires est consumé par ce SAV interne. Sur 30 salariés, 5 ne bossent que sur les erreurs des autres.",
    icon: Target
  },
  {
    id: "03",
    title: "L'Écran de contrôle",
    question: "« Prenez-vous vos décisions sur des sensations ou sur des faits ? »",
    reality: "Si je vous demande votre marge nette réelle à cet instant précis, vous devez fouiller dans trois tableaux Excel différents, demander un rapport par mail ou caler une réunion de deux heures. Vous pilotez à l'aveugle et vous découvrez votre vraie marge à la fin du mois, quand le comptable vous donne le bilan. Il est déjà trop tard.",
    hemorragie: "Vous perdez 40% de votre temps de dirigeant dans ce micro-management de crise au lieu de piloter la stratégie.",
    icon: LayoutDashboard
  }
];

interface ImpactDetailItem {
  title: string;
  loss: string;
  lossLabel: string;
  description: string;
  calculationLabel: string;
  calculationDetails: string;
  sourceLabel: string;
  sourceDetails: string;
  icon: React.ComponentType<any>;
}

const IMPACT_DETAILS: Record<string, ImpactDetailItem[]> = {
  "01": [
    {
      title: "La Friction Opérationnelle",
      loss: "-300 000 €",
      lossLabel: "Par an / salaires à fonds perdus",
      description: "Dans une PME réalisant 5M€ de CA par an, l'informel ne suffit plus. Vos collaborateurs passent leur temps à chercher l'information, attendre des validations ou compenser l'absence de standards. Le travail se fait, mais au prix d'une énergie démesurée. C'est du sable dans les engrenages. Vous payez 100% des salaires, mais à cause de ces frottements, vous ne récupérez que 75% de temps productif.",
      calculationLabel: "Gaspillage de Masse Salariale",
      calculationDetails: "Sur une masse salariale opérationnelle d'environ 1,2M€, l'absence de processus optimisés génère 25% de temps improductif (recherche, attente, flou).",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Études IDC sur la productivité (\"The High Cost of Not Finding Information\") et méthodologie standard Lean Office.",
      icon: TrendingDown
    },
    {
      title: "La Fuite des Capitaux",
      loss: "-90 000 €",
      lossLabel: "Par départ d'un collaborateur clé",
      description: "Votre entreprise repose-t-elle sur des processus écrits ou sur la mémoire de quelques 'historiques' ? C'est le danger du savoir tribal : des pans entiers de l'activité sont détenus par une poignée d'individus. Cette connaissance n'est pas un actif de l'entreprise, elle est seulement 'louée' à vos salariés. Le départ d'un expert est un crash industriel.",
      calculationLabel: "Perte Sèche par Démission",
      calculationDetails: "Remplacer un expert (60k€/an) coûte 150% de son salaire (Recrutement + Formation + Perte de productivité de 6 à 9 mois).",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Données SHRM (Society for Human Resource Management) évaluant le coût de remplacement d'un expert entre 150% et 200% du salaire annuel.",
      icon: Users
    },
    {
      title: "Le Plafond de Verre (Saturation)",
      loss: "-500 000 €",
      lossLabel: "De CA laissé sur la table par an",
      description: "C'est le paradoxe de la croissance : plus vous vendez, plus vous souffrez. Votre organisation 'artisanale' n'est pas conçue pour le volume. Chaque nouveau client ajoute une complexité exponentielle. Vous arrivez à saturation : vos équipes sont sous l'eau, non par manque de volonté, mais par saturation structurelle.",
      calculationLabel: "Manque à gagner (refus de charge)",
      calculationDetails: "Sur un CA de 5M€, vous laissez échapper 10% de croissance par incapacité à absorber la charge de travail supplémentaire.",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Modèle de la 'Courbe de Greiner' (Crise d'Autonomie) et analyse du 'Paradoxe de la Croissance' (Bain & Co).",
      icon: Layers
    }
  ],
  "02": [
    {
      title: "Le Coût du Retravail",
      loss: "-15% du CA",
      lossLabel: "Soit 750 000 € / an évaporés",
      description: "Que vous vendiez des produits ou des services, observez vos équipes : combien de temps passent-elles à produire et combien à corriger ? Dossiers incomplets, bugs, urgences... Vos collaborateurs écopent l'eau, mais personne ne coupe le robinet. Sur 30 personnes, vous payez 4 à 5 salaires uniquement pour gérer ce 'SAV interne'. La récidive est perpétuelle tant que la cause racine n'est pas éliminée.",
      calculationLabel: "Perte Annuelle Récurrente",
      calculationDetails: "15% du CA consommé par la non-qualité (rebuts, temps de reprise, avoirs, gestion des litiges, correctifs urgents).",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Estimation conservatrice basée sur le modèle de P. Crosby (\"Quality is Free\") et les référentiels AFNOR sur les coûts de non-qualité.",
      icon: Factory
    },
    {
      title: "Le Prix de la Défiance",
      loss: "-200 000 €",
      lossLabel: "Marge directe perdue sur 3 ans",
      description: "La confiance ne se décrète pas, elle se prouve. Si votre organisation manque de transparence, vos clients vous imposent des mécanismes de défense coûteux : pénalités, stocks de sécurité, audits inopinés. Faute de garantir une fiabilité absolue, vous êtes écarté des appels d'offres Premium ou forcé de baisser vos prix.",
      calculationLabel: "Disqualification Appel d'Offres",
      calculationDetails: "Perte d'un client stratégique (ou disqualification sur un appel d'offres Top 5) due à une note de fiabilité opérationnelle insuffisante.",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Application du principe de 'Taxe de la Défiance' (S.M.R. Covey) et des critères standards de disqualification Achats (Norme ISO 19011).",
      icon: Briefcase
    },
    {
      title: "Le Coût d'Opportunité",
      loss: "40% du temps",
      lossLabel: "De la Direction perdu en micro-management",
      description: "C'est la conséquence directe du 'Retravail' : quand l'opérationnel sature, l'onde de choc remonte jusqu'à vous. Faute de processus clairs, vous devenez l'arbitre de chaque exception. Vous compensez par votre disponibilité les manques du système. Tant que votre énergie est siphonnée par le quotidien, vous ne préparez pas l'avenir.",
      calculationLabel: "Gaspillage de Temps Stratégique",
      calculationDetails: "40% du temps de la Direction (sur une masse salariale de direction chargée de ~400k€) absorbé par la gestion quotidienne des crises.",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Corrélation basée sur les études HBR (\"How CEOs Manage Time\") et Bain & Company sur la surcharge organisationnelle.",
      icon: Clock
    }
  ],
  "03": [
    {
      title: "L'Obésité Informationnelle",
      loss: "-40 000 €",
      lossLabel: "Par an gaspillés en reporting inutile",
      description: "Dans une PME de 5M€, les indicateurs s'accumulent souvent par strates historiques. Chaque service crée ses tableaux pour se rassurer, sans cohérence globale. Vos managers se retrouvent à maintenir des fichiers 'pour information', remplis de données qui ne sont ni connectées à la stratégie, ni utilisées pour piloter l'action.",
      calculationLabel: "Gaspillage de Temps de Reporting",
      calculationDetails: "Base 4 Responsables (~400€/jour) x 0,5j perdu/semaine à remplir des tableaux manuels inutiles = 2 jours perdus/mois x 12 mois.",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Application du 'Principe de Parcimonie' (Kaplan & Norton, Balanced Scorecard) et Loi de Pareto appliquée au reporting.",
      icon: Database
    },
    {
      title: "La Cécité sur la Rentabilité",
      loss: "-50% de Marge",
      lossLabel: "Évaporée sur les contrats supposés sains",
      description: "Vos tableaux de bord affichent des moyennes par famille de produits. Mais la moyenne masque les disparités. Vous voyez la Marge Brute théorique d'un contrat, sans imputer les coûts réels qu'il génère (logistique spécifique, Bureau d'Études, SAV). Sans le savoir, vos clients sains paient pour les toxiques.",
      calculationLabel: "Analyse Contrat Réel (500 000 €)",
      calculationDetails: "Gain théorique attendu de 100k€ (20%) réduit de 50k€ de coûts réels cachés (BE, logistique, SAV, support administratif).",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Méthodologie ABC (Activity-Based Costing) et analyse de la 'Whale Curve' de rentabilité (Robert S. Kaplan).",
      icon: EyeOff
    },
    {
      title: "L'Inertie Corrective (Le Retard)",
      loss: "-25 000 €",
      lossLabel: "Perte irrécupérable par trimestre",
      description: "La plupart des PME pilotent au rétroviseur : vous attendez le bilan pour savoir si vous avez gagné de l'argent. Si une dérive opérationnelle (baisse de cadence, dérapage intérim) survient et que l'information remonte 45 jours plus tard, vous êtes simple spectateur de votre perte.",
      calculationLabel: "Coût de Réactivité en Latence",
      calculationDetails: "Dérive mineure de 2% sur les coûts opérationnels (matière/main d'œuvre) restée invisible pendant 3 mois sur une base de 3M€ de coûts.",
      sourceLabel: "Source & Méthode",
      sourceDetails: "Distinction 'Lagging vs Leading Indicators' (HBR) et principe du 'Short Interval Control' (Lean Management).",
      icon: Hourglass
    }
  ]
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.45
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 3.0,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [turnover, setTurnover] = useState<number>(5000000);
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const annualLeak = turnover * 0.15;
  const monthlyLeak = annualLeak / 12;
  const dailyLeak = annualLeak / 220; // 220 jours ouvrés

  const renderCockpit = (pillarId: string, isMobile: boolean) => {
    const pillarData = PILLARS_DATA.find(p => p.id === pillarId);
    if (!pillarData) return null;

    return (
      <div className={`bg-[#F5F2EA]/40 border border-[#E3DCCC]/60 backdrop-blur-md rounded-[2px] relative text-left ${isMobile ? 'p-5 md:p-6' : 'p-6 md:p-10'
        }`}>

        {/* Entête du Cockpit de Gisement */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#E3DCCC]/60 pb-6 mb-8 gap-4">
          <div>
            <span className="text-[#C5A065] font-sans font-bold text-[9px] md:text-[10px] uppercase tracking-math-wide block mb-1">
              Cockpit de Simulation de Pertes & ROI
            </span>
            <h4 className="font-serif text-lg md:text-2xl font-bold text-sb-green-dark uppercase tracking-tight">
              Gisements financiers du Pilier {pillarId} : {pillarData.title}
            </h4>
          </div>
          <div className="bg-sb-green-dark text-[#C5A065] px-4 py-2 border border-[#C5A065]/20 rounded-[2px] font-sans text-xs font-bold uppercase tracking-widest">
            CA PME de référence : 5 000 000 € / an
          </div>
        </div>

        {/* Grille des 3 sous-cartes d'impact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {IMPACT_DETAILS[pillarId] && IMPACT_DETAILS[pillarId].map((detail, idx) => {
            const SubIcon = detail.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.05, duration: 0.4 } }}
                className="bg-white border border-sb-green-dark/5 p-5 md:p-6 rounded-[2px] shadow-md flex flex-col justify-start space-y-6 relative group hover:border-[#C5A065]/30 hover:shadow-lg transition-all duration-300 h-full"
              >
                {/* En-tête (Icone + Titre) */}
                <div className="flex items-center gap-3 lg:min-h-[64px]">
                  <div className="p-2 bg-sb-cream text-[#C5A065] rounded-[2px] border border-[#C5A065]/5">
                    <SubIcon size={18} strokeWidth={1.5} />
                  </div>
                  <h5 className="font-serif text-sm font-bold text-sb-green-dark uppercase tracking-tight leading-snug">
                    {detail.title}
                  </h5>
                </div>

                {/* Le Chiffre de perte marquant */}
                <div className="text-center py-4 border-y border-sb-green-dark/5 bg-[#F6F4EE]/30 rounded-[2px] lg:min-h-[96px] flex flex-col justify-center">
                  <p className="text-sb-green-dark font-serif text-3xl font-extrabold tracking-tight">
                    {detail.loss}
                  </p>
                  <p className="text-[10px] text-[#C5A065] font-sans font-bold uppercase tracking-wider mt-0.5">
                    {detail.lossLabel}
                  </p>
                </div>

                {/* Calculateur précis */}
                <div className="bg-[#F5F2EA]/50 border border-[#E2DCCC]/30 p-4 md:p-4.5 rounded-[2px] lg:min-h-[160px] flex flex-col justify-start">
                  <span className="text-[10px] font-sans font-bold text-sb-green-dark/60 uppercase tracking-widest block mb-1.5">
                    {detail.calculationLabel}
                  </span>
                  <p className="text-xs md:text-sm text-sb-green-dark/95 font-sans leading-relaxed">
                    {detail.calculationDetails}
                  </p>
                </div>

                {/* Source scientifique */}
                <div className="pt-3 border-t border-sb-green-dark/5 flex items-start gap-2 lg:min-h-[120px] mt-auto">
                  <BookOpen size={14} className="text-[#C5A065] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] font-sans font-bold text-[#C5A065] uppercase tracking-wider block">
                      Méthodologie Validée
                    </span>
                    <p className="text-xs text-sb-green-dark/80 font-sans leading-snug">
                      {detail.sourceDetails}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* SECTION HERO - CONFRONTER L'ILLUSION DU MOUVEMENT */}
      <section className="relative min-h-screen flex items-center justify-center bg-sb-green-dark overflow-hidden">
        {/* Background sophistiqué */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://image.pollinations.ai/prompt/luxury%20executive%20office%20desk%20dark%20green%20aesthetic%20cinematic%20lighting%20golden%20ratio%20symmetry%20intricate%20details%20photorealistic%208k%20oxford%20green%20wall?nologo=true"
            alt="Cabinet Delacour - Conseil de direction"
            className="w-full h-full object-cover opacity-20 scale-105"
          />
          <div className="absolute inset-0 bg-sb-green-dark/90 mix-blend-multiply"></div>

          {/* Lignes fines dorées - Trame architecturale */}
          <div className="absolute inset-0 opacity-15 flex items-center justify-center pointer-events-none">
            <div className="w-[1000px] h-[1000px] border border-[#C5A065]/40 rounded-full absolute animate-[spin_240s_linear_infinite]"></div>
            <div className="w-[600px] h-[600px] border border-[#C5A065]/30 rounded-full absolute"></div>
            <div className="w-px h-full bg-gradient-to-b from-transparent via-[#C5A065]/50 to-transparent absolute left-1/4"></div>
            <div className="w-px h-full bg-gradient-to-b from-transparent via-[#C5A065]/50 to-transparent absolute right-1/4"></div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C5A065]/30 to-transparent absolute top-1/3"></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-sb-green-dark to-transparent"></div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="container mx-auto px-6 relative z-10 flex flex-col items-center justify-center text-center pt-36 md:pt-48 pb-24"
        >
          {/* Titre Principal : Raccourci psychologique fort */}
          <motion.h1
            variants={cardVariants}
            className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-math-tight mb-8 uppercase font-normal max-w-5xl"
          >
            Récupérez <span className="text-[#C5A065] relative inline-block">
              15% de votre CA
              <span className="absolute bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A065]/40 to-transparent"></span>
            </span><br />
            <span className="text-3xl sm:text-4xl md:text-5xl block mt-4 text-white/90 normal-case">
              qui s'évapore chaque jour sur le terrain.
            </span>
          </motion.h1>

          {/* Subtitle ultra-ciseleur */}
          <motion.p
            variants={cardVariants}
            className="text-base md:text-lg text-white/90 leading-relaxed max-w-3xl font-medium mb-12 tracking-wide font-sans mx-auto"
          >
            J'implante les méthodes opérationnelles des grands groupes dans votre PME pour stopper le gaspillage, <strong className="text-[#C5A065]">sans embaucher le moindre salarié supplémentaire</strong>.
          </motion.p>

          {/* Unique Bouton de Prise de RDV Strategic d'Exception */}
          <motion.div variants={cardVariants} className="mt-10">
            <button
              onClick={() => onNavigate(Page.CONTACT)}
              className="group relative inline-flex items-center justify-center px-16 py-6 bg-transparent text-[#C5A065] font-sans font-bold uppercase tracking-[0.2em] text-xs transition-all duration-500 overflow-hidden border border-[#C5A065]/60 rounded-[2px] shadow-lg hover:shadow-[0_12px_45px_rgba(197,160,101,0.25)] hover:border-white hover:text-sb-green-dark hover:-translate-y-1"
            >
              <span className="absolute inset-0 bg-[#C5A065] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1] z-0"></span>
              <span className="relative z-10 flex items-center gap-3">
                <span>Chiffrer ce que je peux récupérer</span>
                <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-500" />
              </span>
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION INTRO - POUR LE PATRON PRESSÉ */}
      <section className="bg-white py-20 border-b border-sb-green-dark/5 relative">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8 text-left"
          >
            <p className="text-base md:text-lg text-sb-green-dark/95 leading-relaxed font-sans">
              Les <strong>grands groupes</strong> ont des services entiers dédiés à la chasse au gaspillage. En tant que dirigeant de PME, vous n'avez <strong>ni ce temps, ni le budget</strong> pour embaucher trois ingénieurs sur plusieurs années.
            </p>
            
            <div className="border-l-2 border-[#C5A065] pl-6 my-8 space-y-4">
              <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark uppercase tracking-tight">
                Notre métier, c'est de régler les <span className="text-[#C5A065]">micro-problèmes du quotidien</span> qui vous coûtent une fortune en silence :
              </h3>
              
              <ul className="space-y-4 mt-6">
                <li className="flex items-start gap-4 text-sm md:text-base text-sb-green-dark/90 font-sans leading-relaxed">
                  <div className="p-1 bg-[#F5F2EA] text-[#C5A065] rounded-[2px] mt-1 flex-shrink-0">
                    <ShieldAlert size={16} strokeWidth={1.5} />
                  </div>
                  <span>Les <strong>fiches d'intervention papier</strong> que vos équipes doivent ressaisir manuellement sur ordinateur.</span>
                </li>
                <li className="flex items-start gap-4 text-sm md:text-base text-sb-green-dark/90 font-sans leading-relaxed">
                  <div className="p-1 bg-[#F5F2EA] text-[#C5A065] rounded-[2px] mt-1 flex-shrink-0">
                    <ShieldAlert size={16} strokeWidth={1.5} />
                  </div>
                  <span>Les <strong>erreurs de préparation ou de livraison</strong> qui vous obligent à refaire le travail deux fois à vos frais.</span>
                </li>
                <li className="flex items-start gap-4 text-sm md:text-base text-sb-green-dark/90 font-sans leading-relaxed">
                  <div className="p-1 bg-[#F5F2EA] text-[#C5A065] rounded-[2px] mt-1 flex-shrink-0">
                    <ShieldAlert size={16} strokeWidth={1.5} />
                  </div>
                  <span>Le <strong>savoir-faire critique</strong> stocké uniquement dans la tête de vos collaborateurs historiques et qui disparaît avec eux.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-6 pt-4 text-base md:text-lg text-sb-green-dark/95 leading-relaxed font-sans">
              <p>
                Vous bénéficiez de la puissance de ces méthodes, <strong>sans la charge salariale</strong>. J'interviens directement dans votre structure pour implanter ces systèmes en une seule fois.
              </p>
              
              <div className="bg-[#F5F2EA] border-l-4 border-[#C5A065] p-5 rounded-[2px] mt-6 shadow-sm">
                <p className="font-serif text-lg md:text-xl text-sb-green-dark font-semibold leading-relaxed">
                  « Une bascule <span className="text-[#C5A065]">fluide, indolore</span>, et sans aucune charge de gestion pour vous. »
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2 : L'AUTO-DIAGNOSTIC DU DIRIGEANT */}
      <section className="bg-sb-cream py-20 md:py-fib-144 border-b border-sb-green-dark/5 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 3.0, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-4xl mx-auto mb-[89px]"
          >
            <span className="text-[#C5A065] font-sans font-bold text-[10px] md:text-xs uppercase tracking-math-wide block mb-3">
              Diagnostic de Terrain
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-[40px] xl:text-[42px] font-bold text-sb-green-dark uppercase leading-tight tracking-math-tight mb-6">
              Sur le terrain, où s'évapore votre rentabilité ?
            </h2>
            <div className="w-20 h-px bg-sb-green-dark/20 mx-auto mb-8"></div>
            <p className="text-base md:text-lg text-sb-green-dark/80 font-medium leading-relaxed font-sans max-w-3xl mx-auto">
              Posez-vous ces 3 questions simples sur votre quotidien :
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          >
            {PILLARS_DATA.map((pillar) => {
              const IconComponent = pillar.icon;
              const isExpanded = expandedPillar === pillar.id;
              const isAnyExpanded = expandedPillar !== null;
              return (
                <React.Fragment key={pillar.id}>
                  <motion.div
                    variants={cardVariants}
                    className={`bg-white border rounded-[2px] shadow-xl p-8 relative flex flex-col justify-start group overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#C5A065]/5 cursor-pointer ${isExpanded
                        ? 'border-[#C5A065] ring-1 ring-[#C5A065]/20 shadow-2xl shadow-[#C5A065]/5 translate-y-[-6px] opacity-100'
                        : isAnyExpanded
                          ? 'border-sb-green-dark/5 opacity-60 hover:opacity-95'
                          : 'border-sb-green-dark/5 opacity-100'
                      }`}
                    onClick={() => setExpandedPillar(isExpanded ? null : pillar.id)}
                  >
                    <div className="flex-grow flex flex-col justify-start">
                      {/* En-tête de la carte */}
                      <div className="flex items-center gap-4 mb-6 lg:min-h-[90px]">
                        <div className="p-3 bg-sb-cream border border-sb-green-dark/5 rounded-[2px] text-[#C5A065] group-hover:bg-[#11201B]/5 group-hover:text-[#C5A065] transition-colors duration-500">
                          <IconComponent size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                          <span className="text-xs md:text-sm font-sans font-bold text-[#C5A065] uppercase tracking-[0.2em] block mb-1">
                            Pilier {pillar.id}
                          </span>
                          <h3 className="font-serif text-xl md:text-2xl font-bold text-sb-green-dark uppercase tracking-tight leading-snug">
                            {pillar.title}
                          </h3>
                        </div>
                      </div>

                      {/* Le Choc / La Question */}
                      <div className="mb-6 lg:min-h-[80px]">
                        <p className="font-sans text-sm md:text-base font-semibold text-sb-green-dark leading-relaxed">
                          {pillar.question}
                        </p>
                      </div>

                      {/* Constat / Réalité (Prestigieux Beige sans rouge) */}
                      <div className="bg-[#F6F4EE]/60 border border-[#E2DCCC]/40 p-4.5 rounded-[2px] mb-6 transition-colors duration-500 group-hover:bg-[#F6F4EE]/90 lg:min-h-[220px] flex flex-col justify-start">
                        <span className="text-[9px] font-sans font-bold text-[#C5A065] uppercase tracking-widest block mb-1.5">
                          La Réalité
                        </span>
                        <p className="text-xs md:text-sm text-sb-green-dark/85 font-sans leading-relaxed">
                          {pillar.reality}
                        </p>
                      </div>

                      {/* L'Hémorragie */}
                      <div className="pt-6 border-t border-sb-green-dark/5 lg:min-h-[110px]">
                        <div className="flex items-start gap-2.5 bg-sb-cream/40 p-4 rounded-[2px] border border-sb-green-dark/[0.02] flex flex-col justify-start">
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingDown size={15} className="text-[#C86B5C] shrink-0" />
                            <span className="text-[9px] font-sans font-bold text-[#C86B5C] uppercase tracking-widest block">
                              L'Hémorragie
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-sb-green-dark/95 font-sans font-semibold leading-relaxed">
                            {pillar.hemorragie}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bouton interactif pour déploiement des pertes */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPillar(isExpanded ? null : pillar.id);
                      }}
                      className="mt-auto w-full flex items-center justify-center gap-2 py-4 bg-transparent border-2 border-[#C5A065]/70 hover:border-[#C5A065] text-sb-green-dark font-sans font-extrabold uppercase tracking-widest text-[11px] rounded-[2px] shadow-sm hover:bg-[#C5A065]/5 transition-all duration-300"
                    >
                      <span>
                        {isExpanded ? "Masquer l'analyse" : "Révéler l'étude & l'impact (Voir plus)"}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-[#C5A065] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </motion.div>

                  {/* MOBILE COCKPIT: Rendered inline directly below the card on mobile only */}
                  <AnimatePresence mode="wait">
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          marginTop: 20,
                          transition: {
                            height: { duration: 0.35, ease: "easeOut" },
                            opacity: { duration: 0.22, delay: 0.08 }
                          }
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          marginTop: 0,
                          transition: {
                            opacity: { duration: 0.15 },
                            height: { duration: 0.25, ease: "easeIn" }
                          }
                        }}
                        className="lg:hidden overflow-hidden w-full col-span-1"
                      >
                        {renderCockpit(pillar.id, true)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </motion.div>

          {/* DESKTOP COCKPIT: Rendered below the columns on desktop only */}
          <AnimatePresence mode="wait">
            {expandedPillar && (
              <motion.div
                key={expandedPillar}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{
                  opacity: 1,
                  height: "auto",
                  marginTop: 55, // Golden Ratio spacing
                  transition: {
                    height: { duration: 0.75, ease: "easeOut" },
                    opacity: { duration: 0.45, delay: 0.15 }
                  }
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  marginTop: 0,
                  transition: {
                    opacity: { duration: 0.3 },
                    height: { duration: 0.6, ease: "easeIn" }
                  }
                }}
                className="hidden lg:block overflow-hidden w-full max-w-6xl mx-auto"
              >
                {renderCockpit(expandedPillar, false)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton Final - Diagnostic */}
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <p className="text-sb-green-dark font-serif text-lg md:text-xl font-bold uppercase tracking-tight mb-4">
              Arrêtez de tolérer ces fuites de rentabilité.
            </p>
            <button
              onClick={() => onNavigate(Page.CONTACT)}
              className="group relative inline-flex items-center justify-center px-16 py-6 bg-sb-green-dark text-[#C5A065] font-sans font-extrabold uppercase tracking-[0.2em] text-xs transition-all duration-500 overflow-hidden border border-sb-green-dark rounded-[2px] shadow-lg hover:shadow-[0_12px_45px_rgba(197,160,101,0.25)] hover:bg-[#C5A065] hover:text-sb-green-dark hover:-translate-y-1"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>Chiffrer mes pertes réelles</span>
                <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-500" />
              </span>
            </button>
            <p className="text-[11px] font-sans font-medium text-sb-green-dark/60 uppercase tracking-widest mt-4">
              Visioconférence de 30 minutes • 100% offert & sans engagement
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3 : LE CALCULATEUR DE PRESTIGE (15% CA) */}
      <section id="simulateur" className="bg-gradient-to-br from-[#080F0D] via-sb-green-dark to-[#09110F] text-white py-24 md:py-32 relative overflow-hidden">
        {/* Cercles de fond et trame architecturale or */}
        <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none flex items-center justify-center">
          <div className="w-[1200px] h-[1200px] border border-[#C5A065] rounded-full absolute translate-x-1/3"></div>
          <div className="w-[800px] h-[800px] border border-[#C5A065] rounded-full absolute translate-x-1/3"></div>
        </div>

        {/* Effets lumineux d'ambiance haut de gamme */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C5A065]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#C86B5C]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
            {/* Copywriting Executif Ciseleur */}
            <div className="lg:col-span-5 space-y-8 text-left">
              <span className="text-[#C5A065] font-sans font-bold text-[10px] md:text-xs uppercase tracking-[0.25em] block">
                Diagnostic de Performance Financière
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold uppercase leading-[1.15] tracking-tight">
                L'HÉMORRAGIE SILENCIEUSE : <br />
                <span className="text-[#C5A065]">CHIFFREZ LE COÛT DE L'INACTION</span>
              </h2>
              <div className="w-16 h-0.5 bg-[#C5A065] my-6"></div>

              <div className="space-y-6 text-white/80 font-sans text-sm md:text-base leading-relaxed">
                <p>
                  Chaque jour d'attentisme opérationnel est une taxe directe sur votre EBITDA. L’absence de standards et de processus formalisés ne se traduit pas seulement par une surcharge mentale et des urgences quotidiennes. <strong className="text-white font-semibold">Elle constitue une fuite financière constante et mesurable.</strong>
                </p>
                <p>
                  Dans une PME en croissance, <strong className="text-[#C5A065] font-semibold">environ 15 % de l'effort collectif est consumé</strong> par le double travail, les litiges administratifs, et la déperdition d'information liée au savoir tribal. C'est une taxe invisible que vous payez chaque jour à vos propres inefficacités.
                </p>
                <p className="text-white/60 text-xs md:text-sm">
                  Ajustez le curseur ci-contre pour matérialiser en temps réel ce gisement de marge brute inexploité. Sécuriser vos processus opérationnels n'est pas un coût de conformité, c'est le levier de ROI le plus rapide et le plus souverain à votre disposition.
                </p>
              </div>
            </div>

            {/* Dashboard interactif de prestige */}
            <div className="lg:col-span-7 bg-[#0B1513]/90 border border-white/[0.08] p-8 md:p-12 rounded-[4px] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.8)] relative backdrop-blur-md hover:border-[#C5A065]/35 transition-all duration-700">
              {/* Badge supérieur prestigieux en Terracotta noble */}
              <div className="absolute -top-3.5 right-8 px-4 py-1.5 bg-gradient-to-r from-[#C86B5C] to-[#b35647] text-white font-sans font-bold text-[9px] uppercase tracking-[0.25em] rounded-full shadow-lg shadow-[#C86B5C]/20 border border-white/10">
                Gisement de Marge Brute Captive
              </div>

              <div className="space-y-8 text-left">
                {/* CA Slider */}
                <div>
                  <div className="flex justify-between items-baseline mb-4">
                    <label className="font-sans text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/50">
                      Volume d'activité annuel :
                    </label>
                    <span className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#C5A065] tracking-tight drop-shadow-[0_0_15px_rgba(197,160,101,0.25)]">
                      {formatCurrency(turnover)}
                    </span>
                  </div>

                  {/* Slider au style minimaliste épuré avec piste bicolore dynamique */}
                  <input
                    type="range"
                    min={500000}
                    max={20000000}
                    step={250000}
                    value={turnover}
                    onChange={(e) => setTurnover(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#C5A065] focus:outline-none transition-all"
                    style={{
                      background: `linear-gradient(to right, #C5A065 0%, #C5A065 ${((turnover - 500000) / (20000000 - 500000)) * 100}%, #182B27 ${((turnover - 500000) / (20000000 - 500000)) * 100}%, #182B27 100%)`
                    }}
                  />

                  {/* Graduation de repères Chiffres d'Affaires */}
                  <div className="flex justify-between items-center text-[9px] font-mono text-white/30 px-1 mt-2.5 select-none">
                    <span>500 k€</span>
                    <span>5 M€</span>
                    <span>10 M€</span>
                    <span>15 M€</span>
                    <span>20 M€</span>
                  </div>

                  {/* Boutons de CA préconfigurés */}
                  <div className="flex flex-wrap gap-2 mt-5">
                    {QUICK_TURNOVERS.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setTurnover(item.value)}
                        className={`px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider transition-all duration-300 rounded-[2px] border ${turnover === item.value
                            ? 'bg-[#C5A065] text-[#0A1412] border-[#C5A065] shadow-[0_0_15px_rgba(197,160,101,0.35)] font-extrabold'
                            : 'bg-white/[0.02] text-white/50 hover:text-white border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-px bg-white/5 my-6"></div>

                {/* Calculs d'impact en Terracotta noble */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-6">
                  {/* Gisement Annuel - Pleine largeur en haut */}
                  <div className="col-span-full bg-[#C86B5C]/5 p-5 md:p-6 border border-[#C86B5C]/15 rounded-[2px] hover:border-[#C5A065]/35 hover:bg-[#182926]/40 transition-all duration-500 flex flex-row items-center justify-between text-left group shadow-lg hover:shadow-black/20">
                    <div className="space-y-1">
                      <p className="text-[10px] md:text-xs font-sans text-white/40 uppercase tracking-widest font-bold">
                        Gisement Annuel Captif
                      </p>
                      <span className="block text-[8px] md:text-[9px] text-[#C86B5C]/60 font-sans">
                        (15% du CA inexploité par an)
                      </span>
                    </div>
                    <p className="font-mono text-2xl xs:text-3xl sm:text-4xl font-bold text-[#C86B5C] leading-none transition-colors group-hover:text-white whitespace-nowrap pl-4">
                      {formatCurrency(annualLeak)}
                    </p>
                  </div>

                  {/* Dérive Mensuelle */}
                  <div className="bg-black/30 p-5 md:p-6 border border-white/5 rounded-[2px] hover:border-[#C86B5C]/35 hover:bg-[#182926]/40 transition-all duration-500 flex flex-col justify-between text-left group shadow-lg hover:shadow-black/20">
                    <div>
                      <p className="text-[10px] font-sans text-white/40 uppercase tracking-widest mb-2 font-bold">
                        Hémorragie Mensuelle
                      </p>
                      <p className="font-mono text-xl sm:text-2xl font-bold text-[#C86B5C]/90 leading-none transition-colors group-hover:text-white whitespace-nowrap">
                        {formatCurrency(monthlyLeak)}
                      </p>
                    </div>
                    <span className="block text-[8px] md:text-[9px] text-white/30 mt-3 font-sans">
                      (Par mois d'inaction)
                    </span>
                  </div>

                  {/* Fuite Quotidienne */}
                  <div className="bg-black/30 p-5 md:p-6 border border-[#C86B5C]/10 rounded-[2px] hover:border-[#C5A065]/35 hover:bg-[#182926]/40 transition-all duration-500 flex flex-col justify-between text-left relative overflow-hidden group shadow-lg hover:shadow-black/20">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-[#C86B5C]/5 rounded-bl-full flex items-center justify-center group-hover:bg-[#C5A065]/10 transition-colors">
                      <TrendingDown size={11} className="text-[#C86B5C]/80 group-hover:text-[#C5A065] transition-colors" />
                    </div>
                    <div>
                      <p className="text-[10px] font-sans text-white/40 uppercase tracking-widest mb-2 font-bold">
                        Fuite Quotidienne Pure
                      </p>
                      <p className="font-mono text-xl sm:text-2xl font-bold text-[#C86B5C] leading-none transition-colors group-hover:text-white whitespace-nowrap">
                        {formatCurrency(dailyLeak)}
                      </p>
                    </div>
                    <span className="block text-[8px] md:text-[9px] text-white/35 mt-3 font-sans">
                      (Sur 220 jours ouvrés)
                    </span>
                  </div>
                </div>

                {/* Graphique de répartition visuelle */}
                <div className="bg-[#142320]/50 p-6 border border-white/[0.05] rounded-[2px] text-left">
                  <div className="flex justify-between text-[10px] md:text-xs text-white/60 mb-3 font-sans font-bold tracking-wide">
                    <span>Performance Opérationnelle Actuelle (85%)</span>
                    <span className="text-[#C86B5C] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C86B5C] animate-pulse"></span>
                      Fuite de Rentabilité (15%)
                    </span>
                  </div>

                  {/* Barre de progression haut de gamme avec effet glossy */}
                  <div className="w-full h-3 bg-[#0B1513] rounded-full overflow-hidden flex p-0.5 border border-white/[0.06] shadow-inner">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#C5A065]/60 to-[#C5A065] rounded-full origin-left shadow-inner"
                      initial={{ width: '0%' }}
                      whileInView={{ width: '85%' }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 4.5, ease: "easeOut" }}
                    ></motion.div>
                    <motion.div
                      className="h-full bg-[#C86B5C] rounded-full ml-1 origin-left shadow-[0_0_8px_rgba(200,107,92,0.4)]"
                      initial={{ width: '0%' }}
                      whileInView={{ width: '15%' }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 3.0, ease: "easeOut", delay: 2.4 }}
                    ></motion.div>
                  </div>

                  {/* Texte final - Proposition 1 avec grossissement */}
                  <p className="text-xs md:text-sm text-white/70 text-center mt-6 font-sans leading-relaxed max-w-xl mx-auto italic border-t border-white/5 pt-4">
                    « Ce capital n'est pas perdu : il est simplement captif de vos processus actuels. Rétablir des standards rigoureux suffit à réinjecter ces sommes directement dans votre trésorerie. »
                  </p>
                </div>

                {/* Main CTA */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => onNavigate(Page.CONTACT)}
                    className="group relative w-full flex items-center justify-center px-8 py-5.5 bg-transparent text-[#C5A065] font-sans font-extrabold uppercase tracking-[0.25em] text-xs transition-all duration-500 overflow-hidden border border-[#C5A065] rounded-[2px] hover:text-[#0A1412] hover:-translate-y-0.5 shadow-lg hover:shadow-[0_12px_45px_rgba(197,160,101,0.25)]"
                  >
                    <span className="absolute inset-0 bg-[#C5A065] transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.16,1,0.3,1] z-0"></span>
                    <span className="relative z-10 flex items-center gap-3">
                      <span>Boucher mes fuites de marge</span>
                      <ArrowRight size={14} strokeWidth={2.5} className="group-hover:translate-x-1.5 transition-transform duration-500" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* SECTION 5 : PRESTATIONS & INGÉNIERIE DE LA RENTABILITÉ */}
      <section className="bg-[#F8F9FA] text-sb-black border-t border-sb-green-dark/10">
        <div className="container mx-auto px-6 py-20 md:py-fib-89">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20">
            <div className="text-center md:text-left w-full md:w-auto mb-10 md:mb-0">
              <span className="text-[#C5A065] font-sans font-bold text-[10px] md:text-xs uppercase tracking-math-wide block mb-3">
                Prestations & Accompagnement
              </span>
              <h2 className="font-serif text-2xl md:text-3xl lg:text-[40px] xl:text-[42px] text-sb-green-dark mb-4 tracking-math-tight">
                Modules de Structuration
              </h2>
              <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-sm opacity-60">
                Nos interventions pour sécuriser votre valeur
              </p>
            </div>

            <button
              onClick={() => onNavigate(Page.SERVICES)}
              className="hidden md:flex items-center text-sb-green-dark font-sans font-bold uppercase tracking-math-wide text-xs hover:text-[#C5A065] transition-colors pb-2 border-b border-sb-green-dark/20 hover:border-[#C5A065] group"
            >
              Voir le catalogue complet <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-12 max-w-6xl mx-auto">
            {SERVICES.map((service) => (
              <div key={service.id} className="bg-white border border-sb-green-dark/10 rounded-[2px] overflow-hidden group hover:border-[#C5A065]/40 hover:shadow-xl transition-all duration-300">
                <div className="grid md:grid-cols-12 gap-0">
                  {/* Info Module */}
                  <div className="md:col-span-4 p-8 md:p-10 bg-[#F7F7F4] flex flex-col justify-between border-b md:border-b-0 md:border-r border-sb-green-dark/5">
                    <div>
                      <span className="inline-block text-[10px] font-sans font-bold uppercase tracking-math-wide text-sb-green-dark border border-sb-green-dark/20 px-3 py-1 rounded-[2px] mb-6 bg-white shadow-sm">
                        {service.subtitle}
                      </span>
                      <h4 className="font-serif text-xl md:text-3xl font-bold text-sb-green-dark mb-6 leading-tight tracking-tight whitespace-pre-line group-hover:text-[#C5A065] transition-colors">
                        {service.title}
                      </h4>
                      <p className="font-serif text-sm md:text-base text-sb-green-dark/80 italic leading-relaxed">
                        "{service.description}"
                      </p>
                    </div>

                    <div className="mt-8">
                      <button
                        onClick={() => service.link && onNavigate(service.link)}
                        className="w-full bg-sb-green-dark text-sb-beige font-sans font-bold uppercase tracking-math-wide text-[10px] md:text-xs px-6 py-4 rounded-[2px] hover:bg-black transition-colors flex items-center justify-center group/btn"
                      >
                        EXPLORER LE MODULE <ArrowUpRight size={14} className="ml-2 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Benefices & Livrables */}
                  <div className="md:col-span-8 p-8 md:p-10 bg-white">
                    <div className="grid sm:grid-cols-2 gap-12">
                      <div>
                        <h5 className="flex items-center gap-2 text-sb-green-dark font-sans font-bold uppercase tracking-math-wide text-[10px] mb-6 pb-2 border-b border-sb-green-dark/10">
                          <Target size={16} className="text-[#C5A065]" /> BÉNÉFICES FINANCIERS
                        </h5>
                        <ul className="space-y-4">
                          {service.benefits.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs md:text-sm text-sb-green-dark/80 font-medium leading-relaxed font-sans">
                              <Check size={16} className="text-[#C5A065] mt-1 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="flex items-center gap-2 text-sb-green-dark font-sans font-bold uppercase tracking-math-wide text-[10px] mb-6 pb-2 border-b border-sb-green-dark/10">
                          <FileText size={16} className="text-[#C5A065]" /> LIVRABLES DE TRANSFORMATION
                        </h5>
                        <ul className="space-y-4">
                          {service.deliverables.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs md:text-sm text-sb-green-dark/80 font-medium leading-relaxed font-sans">
                              <CheckCircle2 size={16} className="text-sb-green-dark mt-1 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 : LE DEUX CHEMINS (CTA EXÉCUTIF TRANCHANT) */}
      <section className="bg-sb-green-dark text-sb-cream py-20 md:py-fib-144 border-t border-sb-beige/10 relative overflow-hidden">
        <div className="container mx-auto px-6 text-center relative z-10">
          <span className="text-[#C5A065] font-sans font-bold text-[10px] md:text-xs uppercase tracking-math-wide block mb-3">
            La Décision d'Avenir
          </span>
          <h2 className="font-serif text-3xl md:text-[45px] text-white uppercase tracking-math-tight mb-8">
            Deux chemins opérationnels
          </h2>
          <div className="w-24 h-px bg-[#C5A065] mx-auto mb-20"></div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-20 items-stretch text-left">
            {/* OPTION A: POMPIER PERMANENT */}
            <div className="bg-black/30 border border-[#E55B5B]/30 p-8 md:p-12 rounded-[2px] flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-[#E55B5B]/20 group-hover:bg-[#E55B5B] transition-all duration-500"></div>
              <div>
                <div className="mb-6 text-[#E55B5B]">
                  <AlertTriangle size={40} strokeWidth={1} />
                </div>
                <h3 className="font-serif text-2xl text-white mb-6 uppercase tracking-wide">
                  Option A : Subir l'urgence permanente
                </h3>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white/70 font-sans leading-relaxed">
                    <span className="text-[#E55B5B] font-bold mt-1">✗</span>
                    <span>Vous continuez à sacrifier vos soirées pour réparer les erreurs de la journée.</span>
                  </li>
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white/70 font-sans leading-relaxed">
                    <span className="text-[#E55B5B] font-bold mt-1">✗</span>
                    <span>Vous tolérez l'érosion invisible de 15 % de votre chiffre d'affaires.</span>
                  </li>
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white/70 font-sans leading-relaxed">
                    <span className="text-[#E55B5B] font-bold mt-1">✗</span>
                    <span>Votre entreprise reste fragile et dépendante d'individus isolés.</span>
                  </li>
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white/70 font-sans leading-relaxed">
                    <span className="text-[#E55B5B] font-bold mt-1">✗</span>
                    <span>Votre structure est inquantifiable, intransmissible, et stagne sous son plafond de verre.</span>
                  </li>
                </ul>
              </div>
              <p className="text-2xs text-[#E55B5B] uppercase font-bold tracking-widest font-sans border-t border-white/10 pt-6">
                Coût masqué : Épuisement opérationnel de la direction.
              </p>
            </div>

            {/* OPTION B: CADRE SOUVERAIN */}
            <div className="bg-[#11201B] border border-[#C5A065] p-8 md:p-12 rounded-[2px] flex flex-col justify-between relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 w-1.5 h-full bg-[#C5A065] transition-all duration-300"></div>
              <div>
                <div className="mb-6 text-[#C5A065]">
                  <Zap size={40} strokeWidth={1} />
                </div>
                <h3 className="font-serif text-2xl text-[#C5A065] mb-6 uppercase tracking-wide">
                  Option B : Activer les 3 réflexes
                </h3>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white font-sans font-medium leading-relaxed">
                    <span className="text-[#C5A065] font-bold mt-1">✓</span>
                    <span>Vous formalisez vos standards opérationnels pour les rendre autonomes.</span>
                  </li>
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white font-sans font-medium leading-relaxed">
                    <span className="text-[#C5A065] font-bold mt-1">✓</span>
                    <span>Vous réinjectez les 15 % de chiffre d'affaires gaspillé directement dans votre profit net.</span>
                  </li>
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white font-sans font-medium leading-relaxed">
                    <span className="text-[#C5A065] font-bold mt-1">✓</span>
                    <span>Vous sécurisez la transmission et la scalabilité de votre savoir-faire.</span>
                  </li>
                  <li className="flex items-start gap-3 text-xs md:text-sm text-white font-sans font-medium leading-relaxed">
                    <span className="text-[#C5A065] font-bold mt-1">✓</span>
                    <span>Vous reprenez votre rôle de stratège en déléguant le chaos quotidien à une structure.</span>
                  </li>
                </ul>
              </div>
              <p className="text-2xs text-[#C5A065] uppercase font-bold tracking-widest font-sans border-t border-white/10 pt-6">
                Objectif : Rentabilité structurelle & Croissance sereine.
              </p>
            </div>
          </div>

          {/* Bouton central d'action */}
          <div className="flex flex-col items-center justify-center mt-12">
            <button
              onClick={() => onNavigate(Page.CONTACT)}
              className="group relative inline-flex items-center justify-center px-12 py-6 bg-[#C5A065] text-sb-green-dark font-sans font-bold uppercase tracking-math-wide text-xs md:text-sm transition-all duration-300 hover:bg-white rounded-[2px]"
            >
              PRENDRE LE CONTRÔLE DE MA MARGE <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;