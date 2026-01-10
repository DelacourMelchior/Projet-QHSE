
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { Factory, Briefcase, Clock, ArrowRight } from 'lucide-react';

interface ImpactRisqueProps {
  onNavigate: (page: Page) => void;
}

const ImpactRisque: React.FC<ImpactRisqueProps> = ({ onNavigate }) => {
  return (
    <>
      {/* ZONE 1 : HERO SECTION */}
      <section className="bg-sb-green-dark text-white pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-7xl leading-[1.1] mb-10 text-white uppercase font-normal tracking-math-tight break-normal">
                VOTRE RISQUE N'EST PAS TECHNIQUE.<br/>
                <span className="text-[#C5A065]">IL EST FINANCIER.</span>
            </h1>
            <div className="w-24 h-px bg-[#C5A065] mx-auto mb-10"></div>
            <p className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto font-sans font-light leading-relaxed">
                La non-qualité n'est pas une fatalité, c'est une hémorragie de cash. Voici les 3 postes de coûts qui plombent votre bilan.
            </p>
        </div>
      </section>

      {/* ZONE 2 : LES 3 IMPACTS */}
      <section className="bg-[#F4F6F7] py-24 md:py-32">
         <div className="container mx-auto px-6 max-w-[1100px] space-y-24">
             
             {/* BLOC 1 : LE COÛT DU RETRAVAIL */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Factory size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LE COÛT DU RETRAVAIL<br/>(NON-QUALITÉ)
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Que vous vendiez des produits ou des services, observez vos équipes : combien de temps passent-elles à produire et combien à corriger ? Dossiers incomplets, urgences... Vos collaborateurs écopent l'eau, mais personne ne coupe le robinet.
                            </p>
                            <p>
                                Le drame financier, c'est la récidive. Tant que la cause n'est pas traitée, la dépense est perpétuelle. Pour une PME de 5M€, c'est 750 000 € par an qui sont brûlés pour résoudre les mêmes problèmes.
                            </p>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                        <div className="mb-4">
                            <span className="text-5xl md:text-8xl font-serif font-bold text-[#8B0000] leading-none block">
                                -15%
                            </span>
                            <span className="text-xl md:text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                DU CA
                            </span>
                        </div>
                        <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Gaspillé en Non-Qualité</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left md:w-1/2">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Le Calcul :</strong>
                                15% du CA consommé par la non-qualité (rebuts, temps de reprise, avoirs, gestion des litiges).
                            </p>
                        </div>
                        <div className="text-center md:text-right md:w-1/2">
                            <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">PERTE ANNUELLE RÉCURRENTE</p>
                            <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">750 000 €</p>
                        </div>
                    </div>
                </div>
             </div>

             {/* BLOC 2 : LE PRIX DE LA DÉFIANCE */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                             <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Briefcase size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LE PRIX DE LA<br/>DÉFIANCE
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Si votre organisation manque de transparence, vos clients vous imposent des pénalités, stocks de sécurité ou audits inopinés. Vous n'êtes plus un partenaire, mais un 'fournisseur sous surveillance'.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center h-full">
                         <div className="mb-4">
                            <span className="text-2xl md:text-4xl font-serif font-bold text-[#8B0000] leading-none block uppercase">
                                DISQUALIFICATION
                            </span>
                        </div>
                        <div className="w-12 h-px bg-sb-green-dark/10 mx-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Risque sur Appel d'Offres</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left md:w-1/2">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Simulation :</strong>
                                Disqualification sur un appel d'offres stratégique due à une note 'Fiabilité' insuffisante.
                            </p>
                        </div>
                        <div className="text-center md:text-right md:w-1/2">
                            <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">MANQUE À GAGNER</p>
                            <div className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000] flex flex-col md:block items-end">
                                <span>200 000 €</span>
                                <span className="text-sm md:text-lg ml-2 font-sans font-bold uppercase tracking-wide opacity-80 text-[#8B0000]">NET</span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>

             {/* BLOC 3 : LE COÛT D'OPPORTUNITÉ */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                         <div className="flex items-center gap-6 mb-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Clock size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LE COÛT<br/>D'OPPORTUNITÉ
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Faute de processus clairs, vous devenez l'arbitre de chaque exception. Vous compensez par votre disponibilité les manques du système. Environ 40% du temps de Direction est consommé pour stabiliser le présent au lieu de développer la croissance.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                        <div className="mb-4">
                            <span className="text-5xl md:text-8xl font-serif font-bold text-[#8B0000] leading-none block">
                                40%
                            </span>
                            <span className="text-xl md:text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                DU TEMPS
                            </span>
                        </div>
                        <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Perdu en Micro-Management</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€ / AN)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left md:w-1/2">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Le Calcul :</strong>
                                40% du temps de la Direction (Masse salariale chargée ~400k€) absorbé par la gestion de crise.
                            </p>
                        </div>
                        <div className="text-center md:text-right md:w-1/2">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">GASPILLAGE SALARIAL</p>
                             <div className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000] flex flex-col md:block items-end">
                                <span>160 000 €</span>
                                <span className="text-sm md:text-lg ml-2 font-sans font-bold uppercase tracking-wide opacity-80 text-[#8B0000]">/ AN</span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
         </div>
      </section>

      {/* 3. FINAL CTA */}
      <Section bg="cream" className="py-24 text-center border-t border-sb-green-dark/10">
        <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark mb-10 uppercase tracking-tight">
            Arrêtez l'hémorragie financière
        </h2>
        <button 
            onClick={() => onNavigate(Page.CONTACT)}
            className="group inline-flex items-center justify-center px-10 py-5 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-math-wide text-sm rounded-[2px] hover:bg-sb-green-dark hover:text-white transition-all shadow-lg"
        >
            RÉSERVER MON ENTRETIEN DE DIAGNOSTIC <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </Section>
    </>
  );
};

export default ImpactRisque;
