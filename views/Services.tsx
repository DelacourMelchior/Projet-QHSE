
import React from 'react';
import { Page } from '../types';
import { ArrowRight, Target, FileText, ChevronRight, Square } from 'lucide-react';

interface ServicesProps {
  onNavigate: (page: Page) => void;
}

const Services: React.FC<ServicesProps> = ({ onNavigate }) => {

  const servicesData = [
    {
      id: 'robustesse',
      number: '01',
      title: "AUDIT DE ROBUSTESSE",
      subtitle: "Diagnostic Flash (2-5 jours)",
      link: Page.OFFER_ROBUSTESSE,
      description: "L'intervention chirurgicale pour identifier vos failles. Un état des lieux sans concession.",
      benefits: [
        "Détection des pertes d'argent invisibles",
        "Vision claire de vos zones de fragilité",
        "Tri immédiat entre l'urgent et l'accessoire"
      ],
      deliverables: [
        "La liste des \"Points Rouges\" (Risques majeurs)",
        "Repérage des freins qui ralentissent vos équipes",
        "Plan de bataille : Quoi faire, Quand et le Budget"
      ]
    },
    {
      id: 'execution',
      number: '02',
      title: "PROGRAMME DE\nSTRUCTURATION\n& PERFORMANCE",
      subtitle: "Mise en place SMQ (3-6 mois)",
      link: Page.OFFER_EXECUTION,
      description: "Transformation opérationnelle. Nous passons de l'intention à l'action.",
      benefits: [
        "Fluidité opérationnelle (Fin des frictions)",
        "Sécurisation du savoir-faire (Fin du tribal)",
        "Gain de productivité par la standardisation"
      ],
      deliverables: [
        "Architecture des processus rédigée et optimisée",
        "Standards documentaires prêts à l'emploi",
        "Tableaux de bord de pilotage opérationnel"
      ]
    },
    {
      id: 'certification',
      number: '03',
      title: "ARCHITECTURE & ISO 9001",
      subtitle: "Accompagnement (6-12 mois)",
      link: Page.OFFER_ISO,
      description: "Votre certification garantie. Construction d'un Système de Management Agile.",
      benefits: [
        "Garantie de certification (100% de réussite)",
        "Accès aux appels d'offres restreints",
        "Crédibilité immédiate auprès des grands comptes"
      ],
      deliverables: [
        "Système de Management complet (Manuel, Procédures)",
        "Accompagnement lors de l'audit officiel",
        "Le Diplôme/Certificat ISO obtenu"
      ]
    },
    {
      id: 'audit-blanc',
      number: '04',
      title: "AUDIT BLANC ISO 9001 (CRASH-TEST)",
      subtitle: "PRÉ-VALIDATION (2-5 JOURS)",
      link: Page.OFFER_AUDIT,
      description: "La répétition générale. Un stress-test pour éliminer tout risque.",
      benefits: [
        "Suppression du stress : Zéro surprise le jour de l'audit officiel",
        "Élimination des \"Non-Conformités Majeures\" (Bloquantes)",
        "Vos équipes sont entraînées à répondre à l'auditeur"
      ],
      deliverables: [
        "Simulation d'audit ISO 9001 en conditions réelles",
        "Liste des écarts normatifs à corriger d'urgence",
        "Plan de bataille immédiat (Ce qu'il faut faire ce soir)"
      ]
    }
  ];

  return (
    <div className="bg-sb-green-dark min-h-screen text-white overflow-hidden">
      
      {/* 1. HERO - TYPOGRAPHIC PURITY */}
      <section className="pt-32 pb-32 md:pt-48 md:pb-40 relative z-10">
        <div className="container mx-auto px-6 text-center">
            <h1 className="font-serif text-5xl md:text-7xl mb-6 tracking-math-tight uppercase text-white">
                Catalogue<br/>
                <span className="text-[#C5A065]">D'Interventions</span>
            </h1>
            <p className="text-sm md:text-base font-bold tracking-widest uppercase text-white/40 font-sans">
                Architecture de la Performance
            </p>
        </div>
      </section>

      {/* 2. THE AXIS LAYOUT (VERTEBRAL COLUMN) */}
      <section className="relative pb-32">
         
         {/* THE CENTRAL AXIS LINE (DESKTOP ONLY) */}
         <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[#C5A065]/40 -translate-x-1/2 z-0"></div>

         <div className="container mx-auto px-6 max-w-7xl relative z-10">
            <div className="space-y-0"> {/* No space-y, padding handled in items */}
                
                {servicesData.map((service, index) => {
                    // Determine alignment based on index (Even = Left Title, Odd = Right Title)
                    const isEven = index % 2 === 0;

                    return (
                        <div key={service.id} className="relative group">
                            
                            {/* DESKTOP LAYOUT */}
                            <div className="hidden md:flex w-full py-24">
                                
                                {/* LEFT SIDE */}
                                <div className={`w-1/2 pr-24 ${isEven ? 'text-right flex flex-col justify-center' : 'text-left pl-24 pr-0'}`}>
                                    {isEven ? (
                                        // EVEN: TITLE SIDE (LEFT)
                                        <div className="transform transition-transform duration-700 group-hover:-translate-x-4">
                                            <span className="block font-sans text-xs font-bold text-[#C5A065] tracking-widest mb-4">
                                                {service.number} — {service.subtitle}
                                            </span>
                                            <h2 className="font-serif text-5xl lg:text-6xl text-white leading-tight uppercase tracking-tight whitespace-pre-line">
                                                {service.title}
                                            </h2>
                                        </div>
                                    ) : (
                                        // ODD: CONTENT SIDE (LEFT)
                                        <div className="transform transition-transform duration-700 group-hover:-translate-x-4">
                                            <p className="font-serif text-xl text-white/90 leading-relaxed mb-10 italic">
                                                "{service.description}"
                                            </p>
                                            
                                            <div className="grid grid-cols-2 gap-8 mb-10">
                                                {/* BENEFITS */}
                                                <div>
                                                    <h4 className="text-[#C5A065] font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <Target size={14} /> Bénéfices
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {service.benefits.map((item, i) => (
                                                            <li key={i} className="font-sans text-xs text-white/80 font-medium flex items-start leading-relaxed">
                                                                <ChevronRight size={14} className="text-[#C5A065] mr-2 flex-shrink-0 mt-0.5" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                {/* DELIVERABLES */}
                                                <div>
                                                    <h4 className="text-white font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <FileText size={14} /> Livrables
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {service.deliverables.map((item, i) => (
                                                            <li key={i} className="font-sans text-xs text-white/60 font-medium flex items-start leading-relaxed">
                                                                <Square size={8} className="text-white/40 mr-3 flex-shrink-0 mt-1.5 fill-current" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => onNavigate(service.link as Page)}
                                                className="inline-flex items-center justify-center bg-[#C5A065] text-[#0A1F1C] font-bold uppercase tracking-math-wide text-xs px-6 py-4 rounded-[2px] hover:bg-white transition-colors shadow-lg"
                                            >
                                                Explorer ce module <ArrowRight className="ml-2 w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* CENTER JUNCTION (THE RHOMBUS) */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                    <div className="w-4 h-4 bg-[#0A1F1C] border border-[#C5A065] transform rotate-45 group-hover:bg-[#C5A065] group-hover:scale-125 transition-all duration-500 shadow-[0_0_15px_rgba(197,160,101,0.3)]"></div>
                                </div>

                                {/* RIGHT SIDE */}
                                <div className={`w-1/2 pl-24 ${isEven ? 'text-left' : 'text-right pr-24 pl-0 flex flex-col justify-center'}`}>
                                    {isEven ? (
                                        // EVEN: CONTENT SIDE (RIGHT)
                                        <div className="transform transition-transform duration-700 group-hover:translate-x-4">
                                            <p className="font-serif text-xl text-white/90 leading-relaxed mb-10 italic">
                                                "{service.description}"
                                            </p>
                                            
                                            <div className="grid grid-cols-2 gap-8 mb-10">
                                                {/* BENEFITS */}
                                                <div>
                                                    <h4 className="text-[#C5A065] font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <Target size={14} /> Bénéfices
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {service.benefits.map((item, i) => (
                                                            <li key={i} className="font-sans text-xs text-white/80 font-medium flex items-start leading-relaxed">
                                                                <ChevronRight size={14} className="text-[#C5A065] mr-2 flex-shrink-0 mt-0.5" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                {/* DELIVERABLES */}
                                                <div>
                                                    <h4 className="text-white font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <FileText size={14} /> Livrables
                                                    </h4>
                                                    <ul className="space-y-3">
                                                        {service.deliverables.map((item, i) => (
                                                            <li key={i} className="font-sans text-xs text-white/60 font-medium flex items-start leading-relaxed">
                                                                <Square size={8} className="text-white/40 mr-3 flex-shrink-0 mt-1.5 fill-current" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => onNavigate(service.link as Page)}
                                                className="inline-flex items-center justify-center bg-[#C5A065] text-[#0A1F1C] font-bold uppercase tracking-math-wide text-xs px-6 py-4 rounded-[2px] hover:bg-white transition-colors shadow-lg"
                                            >
                                                Explorer ce module <ArrowRight className="ml-2 w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        // ODD: TITLE SIDE (RIGHT)
                                        <div className="transform transition-transform duration-700 group-hover:translate-x-4">
                                            <span className="block font-sans text-xs font-bold text-[#C5A065] tracking-widest mb-4">
                                                {service.subtitle} — {service.number}
                                            </span>
                                            <h2 className="font-serif text-5xl lg:text-6xl text-white leading-tight uppercase tracking-tight whitespace-pre-line">
                                                {service.title}
                                            </h2>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* MOBILE LAYOUT (STACKED) */}
                            <div className="md:hidden py-16 border-l border-[#C5A065]/20 ml-4 pl-8 relative">
                                <div className="absolute left-0 top-16 -translate-x-1/2 w-3 h-3 bg-[#0A1F1C] border border-[#C5A065] transform rotate-45"></div>
                                
                                <span className="block font-sans text-xs font-bold text-[#C5A065] tracking-widest mb-4">
                                    {service.number} / {service.subtitle}
                                </span>
                                <h2 className="font-serif text-3xl text-white leading-none uppercase tracking-tight mb-6 whitespace-pre-line">
                                    {service.title}
                                </h2>
                                <p className="font-serif text-lg text-white/80 leading-relaxed mb-8 italic">
                                    {service.description}
                                </p>

                                <div className="space-y-8 mb-8">
                                     <div>
                                        <h4 className="text-[#C5A065] font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Target size={14} /> Bénéfices
                                        </h4>
                                        <ul className="space-y-2">
                                            {service.benefits.map((item, i) => (
                                                <li key={i} className="font-sans text-xs text-white/80 font-medium flex items-start">
                                                    <ChevronRight size={14} className="text-[#C5A065] mr-2 flex-shrink-0 mt-0.5" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <FileText size={14} /> Livrables
                                        </h4>
                                        <ul className="space-y-2">
                                            {service.deliverables.map((item, i) => (
                                                <li key={i} className="font-sans text-xs text-white/60 font-medium flex items-start">
                                                     <Square size={8} className="text-white/40 mr-3 flex-shrink-0 mt-1.5 fill-current" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => onNavigate(service.link as Page)}
                                    className="w-full inline-flex items-center justify-center bg-[#C5A065] text-[#0A1F1C] font-bold uppercase tracking-math-wide text-xs px-6 py-4 rounded-[2px]"
                                >
                                    Explorer <ArrowRight className="ml-2 w-4 h-4" />
                                </button>
                            </div>

                        </div>
                    );
                })}

            </div>
         </div>
      </section>

      {/* 3. CLOSING - THE ANCHOR (WHITE THEME) */}
      <section className="relative py-24 bg-white border-t border-[#C5A065]/20">
          
          {/* Continuing the line partially into the footer (Golden Gradient) */}
          <div className="hidden md:block absolute left-1/2 top-0 h-16 w-px bg-gradient-to-b from-[#C5A065]/40 to-transparent -translate-x-1/2 z-0"></div>

          <div className="container mx-auto px-6 text-center relative z-10">
              <h2 className="font-serif text-3xl md:text-5xl text-[#0A1F1C] mb-8 uppercase tracking-tight leading-tight">
                  La clarté précède la compétence.
              </h2>
              <p className="text-lg text-[#0A1F1C]/70 font-light mb-12 font-sans max-w-xl mx-auto">
                  Choisissez l'architecture qui correspond à votre stade de maturité.
              </p>
              
              <button 
                  onClick={() => onNavigate(Page.CONTACT)}
                  className="group relative inline-flex items-center justify-center px-10 py-5 bg-[#0A1F1C] text-[#C5A065] font-bold uppercase tracking-math-wide text-sm overflow-hidden transition-all duration-300 hover:bg-[#C5A065] hover:text-[#0A1F1C] rounded-[2px] shadow-xl"
              >
                  CONSTRUIRE MA FEUILLE DE ROUTE <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
      </section>

    </div>
  );
};

export default Services;
