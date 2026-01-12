
import React from 'react';
import { Page } from '../types';
import { Factory, Briefcase, Clock, ArrowRight } from 'lucide-react';

interface ImpactRisqueProps {
  onNavigate: (page: Page) => void;
}

const ImpactRisque: React.FC<ImpactRisqueProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white min-h-screen">
      {/* HERO SECTION */}
      <section className="bg-sb-green-dark text-white pt-32 pb-16 md:pt-56 md:pb-32 relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="font-serif text-2xl sm:text-4xl md:text-7xl leading-tight mb-6 text-white uppercase font-normal tracking-math-tight">
                VOTRE RISQUE N'EST PAS TECHNIQUE.<br/>
                <span className="text-[#C5A065]">IL EST FINANCIER.</span>
            </h1>
            <div className="w-16 md:w-24 h-px bg-[#C5A065] mx-auto mb-8"></div>
            <p className="text-base md:text-2xl text-white/70 max-w-3xl mx-auto font-sans font-light leading-relaxed">
                La non-qualité n'est pas une fatalité, c'est une hémorragie de cash. Voici les 3 postes de coûts qui plombent votre bilan.
            </p>
        </div>
      </section>

      {/* IMPACT CARDS */}
      <section className="py-12 md:py-24 bg-[#F4F6F7]">
         <div className="container mx-auto px-4 md:px-6 max-w-4xl space-y-12 md:space-y-20">
             
             {/* CARD 1: RETRAVAIL */}
             <div className="bg-white shadow-xl md:shadow-2xl border-l-[6px] md:border-l-[8px] border-[#C5A065] p-6 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-4 md:gap-6 mb-8 md:mb-12">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <Factory size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="font-serif text-xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        LE COÛT DU RETRAVAIL<br/><span className="text-sm md:text-2xl font-normal">(NON-QUALITÉ)</span>
                    </h2>
                </div>

                <div className="space-y-6 md:space-y-8 text-sb-green-dark/80 font-sans text-sm md:text-lg leading-relaxed mb-10 md:mb-16 text-justify">
                    <p>Que vous vendiez des produits ou des services, observez vos équipes : combien de temps passent-elles à produire et combien à corriger ? Dossiers incomplets, bugs, urgences... Vos collaborateurs écopent l'eau, mais personne ne coupe le robinet. Sur 30 personnes, vous payez 4 à 5 salaires uniquement pour gérer ce 'SAV interne'.</p>
                    <p>Le drame financier, c'est la récidive. Tant que la cause n'est pas traitée, la dépense est perpétuelle. Pour une PME de 5M€, c'est 750 000 € par an qui sont brûlés pour résoudre les mêmes problèmes, encore et encore.</p>
                    <p>L'Audit a une fonction chirurgicale : isoler la Cause Racine. Nous remontons la chaîne de causalité (Processus ? Compétence ? Outil ?) pour identifier l'origine du dysfonctionnement. L'objectif est de placer le verrou systémique qui empêche l'erreur de se reproduire, transformant une charge récurrente en économie définitive.</p>
                </div>

                <div className="text-center mb-10 md:mb-12">
                    <p className="text-[#8B0000] font-serif text-5xl md:text-8xl font-bold leading-none mb-1 md:mb-2">-15%</p>
                    <p className="text-[#8B0000] font-serif text-lg md:text-2xl uppercase tracking-widest font-bold mb-4 md:mb-6">DU CA</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs opacity-60">Gaspillé en non-qualité</p>
                </div>

                <div className="bg-[#F9F9F9] p-6 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-2 py-0.5 border border-gray-100 text-[8px] md:text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="space-y-6">
                        <p className="text-xs md:text-sm leading-relaxed">
                            <span className="text-sb-green-dark font-bold uppercase tracking-wide mr-2 whitespace-nowrap">Le Calcul :</span>
                            <span className="text-sb-green-dark/60 italic">15% du CA consommé par la non-qualité (rebuts, temps de reprise, avoirs, gestion des litiges).</span>
                        </p>
                        <div className="pt-6 border-t border-gray-200 text-center md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 md:mb-2">PERTE ANNUELLE RÉCURRENTE</p>
                            <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">750 000 €</p>
                            <p className="text-[9px] text-gray-400 italic mt-1 md:mt-2">(Tant que la cause racine n'est pas traitée)</p>
                        </div>
                        <p className="text-center text-[8px] md:text-[9px] text-gray-400 italic font-light pt-2 md:pt-4">Source : Estimation conservatrice basée sur le modèle de P. Crosby et les référentiels AFNOR.</p>
                    </div>
                </div>
             </div>

             {/* CARD 2: DÉFIANCE */}
             <div className="bg-white shadow-xl md:shadow-2xl border-l-[6px] md:border-l-[8px] border-[#C5A065] p-6 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-4 md:gap-6 mb-8 md:mb-12">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <Briefcase size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="font-serif text-xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        LE PRIX DE LA<br/>DÉFIANCE
                    </h2>
                </div>

                <div className="space-y-6 md:space-y-8 text-sb-green-dark/80 font-sans text-sm md:text-lg leading-relaxed mb-10 md:mb-16 text-justify">
                    <p>La confiance ne se décrète pas, elle se prouve. Si votre organisation manque de transparence, vos clients vous imposent des mécanismes de défense coûteux : pénalités, stocks de sécurité, audits inopinés. Vous n'êtes plus un partenaire, mais un 'fournisseur sous surveillance' qui passe son temps à se justifier.</p>
                    <p>Le marché intègre cette 'prime de risque'. Faute de garantir une fiabilité absolue, vous êtes écarté des appels d'offres Premium ou forcé de baisser vos prix. Pour une PME de 5M€, la sanction est brutale : la perte d'un client stratégique ou la disqualification sur un marché majeur.</p>
                    <p>L'Audit traite la cause racine de la défiance : l'absence de preuve. En objectivant la maîtrise de vos processus, nous inversons le rapport de force. Vous ne vendez plus seulement un produit, mais une sécurité d'approvisionnement. C'est cet actif qui permet de reconquérir vos marges de négociation.</p>
                </div>

                <div className="text-center mb-10 md:mb-12">
                    <p className="text-[#8B0000] font-serif text-3xl md:text-6xl font-bold uppercase leading-tight mb-2 md:mb-6">DISQUALIFICATION</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs opacity-60">RISQUE SUR APPEL D'OFFRES</p>
                </div>

                <div className="bg-[#F9F9F9] p-6 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-2 py-0.5 border border-gray-100 text-[8px] md:text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="space-y-6">
                        <p className="text-xs md:text-sm leading-relaxed">
                            <span className="text-sb-green-dark font-bold uppercase tracking-wide mr-2 whitespace-nowrap">Simulation :</span>
                            <span className="text-sb-green-dark/60 italic">Disqualification sur un appel d'offres stratégique (ou perte client Top 5) due à une note 'Fiabilité' insuffisante.</span>
                        </p>
                        <div className="pt-6 border-t border-gray-200 text-center md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 md:mb-2">MANQUE À GAGNER</p>
                            <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">200 000 € <span className="text-sm md:text-xl font-sans font-bold">NET</span></p>
                            <p className="text-[9px] text-gray-400 italic mt-1 md:mt-2">(Marge directe perdue sur 3 ans)</p>
                        </div>
                        <p className="text-center text-[8px] md:text-[9px] text-gray-400 italic font-light pt-2 md:pt-4">Source : Application du principe de 'Taxe de la Défiance' (S.M.R. Covey) et des critères de disqualification Achats (ISO 19011).</p>
                    </div>
                </div>
             </div>

             {/* CARD 3: OPPORTUNITÉ */}
             <div className="bg-white shadow-xl md:shadow-2xl border-l-[6px] md:border-l-[8px] border-[#C5A065] p-6 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-4 md:gap-6 mb-8 md:mb-12">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <Clock size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="font-serif text-xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        LE COÛT<br/>D'OPPORTUNITÉ
                    </h2>
                </div>

                <div className="space-y-6 md:space-y-8 text-sb-green-dark/80 font-sans text-sm md:text-lg leading-relaxed mb-10 md:mb-16 text-justify">
                    <p>C'est la conséquence directe du 'Retravail' : quand l'opérationnel sature, l'onde de choc remonte jusqu'à vous. Faute de processus clairs, vous devenez l'arbitre de chaque exception. Vous compensez par votre disponibilité les manques du système.</p>
                    <p>Pour une PME qui réalise 5M€ de CA par an, cette surcharge est un danger. Tant que votre énergie est siphonnée par le quotidien, vous ne préparez pas l'avenir. Environ 40% du temps de Direction est consommé pour stabiliser le présent au lieu de développer la croissance.</p>
                    <p>L'Audit est un arrêt sur image nécessaire. Son but est d'établir un état des lieux impartial : mettre en lumière vos points forts (sur lesquels capitaliser) et identifier vos points sensibles (les failles qui créent cette surcharge). Cet inventaire lucide est la clé pour structurer l'autonomie de vos équipes et retrouver votre temps stratégique.</p>
                </div>

                <div className="text-center mb-10 md:mb-12">
                    <p className="text-[#8B0000] font-serif text-5xl md:text-8xl font-bold leading-none mb-1 md:mb-2">40%</p>
                    <p className="text-[#8B0000] font-serif text-lg md:text-2xl uppercase tracking-widest font-bold mb-4 md:mb-6">DU TEMPS</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs opacity-60">PERDU EN MICRO-MANAGEMENT</p>
                </div>

                <div className="bg-[#F9F9F9] p-6 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-2 py-0.5 border border-gray-100 text-[8px] md:text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€ / AN)
                    </div>
                    <div className="space-y-6">
                        <p className="text-xs md:text-sm leading-relaxed">
                            <span className="text-sb-green-dark font-bold uppercase tracking-wide mr-2 whitespace-nowrap">Le Calcul :</span>
                            <span className="text-sb-green-dark/60 italic">40% du temps de la Direction (Masse salariale chargée ~400k€) absorbé par la gestion de crise.</span>
                        </p>
                        <div className="pt-6 border-t border-gray-200 text-center md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 md:mb-2">GASPILLAGE SALARIAL</p>
                            <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">160 000 € <span className="text-sm md:text-xl font-sans font-bold">/ AN</span></p>
                            <p className="text-[9px] text-gray-400 italic mt-1 md:mt-2">(Sans compter le CA non développé faute de temps)</p>
                        </div>
                        <p className="text-center text-[8px] md:text-[9px] text-gray-400 italic font-light pt-2 md:pt-4">Source : Corrélation basée sur les études HBR (How CEOs Manage Time) et Bain & Company sur la surcharge organisationnelle.</p>
                    </div>
                </div>
             </div>

         </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-sb-green-dark text-white py-16 md:py-24 border-t-4 md:border-t-8 border-sb-beige">
        <div className="container mx-auto px-6 text-center">
            <h2 className="font-serif text-2xl md:text-5xl uppercase tracking-math-tight mb-6 md:mb-8">
                DÉCOUVREZ CE QUE VOUS<br/>POUVEZ RÉCUPÉRER.
            </h2>
            <p className="text-sm md:text-xl text-white/60 font-sans font-light mb-10 md:mb-16 max-w-2xl mx-auto">
                Un échange stratégique de 30 minutes pour évaluer vos gisements de profit invisibles et tracer votre feuille de route.
            </p>
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-8 md:px-12 py-5 md:py-7 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-math-wide text-xs md:text-base rounded-[2px] hover:bg-white transition-all shadow-2xl"
            >
                DEMANDER UN DIAGNOSTIC DE FAISABILITÉ <ArrowRight size={20} className="ml-2 md:ml-3 group-hover:translate-x-2 transition-transform" />
            </button>
        </div>
      </section>
    </div>
  );
};

export default ImpactRisque;
