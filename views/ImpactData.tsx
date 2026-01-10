
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { Database, EyeOff, Hourglass, ArrowRight } from 'lucide-react';

interface ImpactDataProps {
  onNavigate: (page: Page) => void;
}

const ImpactData: React.FC<ImpactDataProps> = ({ onNavigate }) => {
  return (
    <>
      {/* ZONE 1 : HERO SECTION */}
      <section className="bg-sb-green-dark text-white pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-7xl leading-[1.1] mb-10 text-white uppercase font-normal tracking-math-tight break-normal">
                LA DONNÉE INUTILE EST<br/>
                <span className="text-[#C5A065]">UN PASSIF TOXIQUE.</span>
            </h1>
            <div className="w-24 h-px bg-[#C5A065] mx-auto mb-10"></div>
            <p className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto font-sans font-light leading-relaxed">
                Piloter avec les mauvais indicateurs coûte plus cher que de ne pas piloter du tout. Voici le prix réel de votre brouillard.
            </p>
        </div>
      </section>

      {/* ZONE 2 : LES 3 IMPACTS */}
      <section className="bg-[#F4F6F7] py-24 md:py-32">
         <div className="container mx-auto px-6 max-w-[1100px] space-y-24">
             
             {/* BLOC 1 : L'OBÉSITÉ INFORMATIONNELLE */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Database size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                L'OBÉSITÉ<br/>INFORMATIONNELLE
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Dans une PME de 5M€, les indicateurs s'accumulent souvent par strates historiques. Vos managers passent plus de temps à 'nourrir la bête' (collecte, mise en forme) qu'à décider.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                         <div className="mb-4">
                            <span className="text-4xl md:text-7xl font-serif font-bold text-[#8B0000] leading-none block whitespace-nowrap">
                                40 000 €
                            </span>
                            <span className="text-xl md:text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                / AN
                            </span>
                        </div>
                         <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Gaspillés en indicateurs inactifs</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left w-full md:w-3/5">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Le Calcul du Gaspillage :</strong>
                                4 Responsables perdant 0,5j/semaine à remplir des tableaux inutiles.
                            </p>
                        </div>
                        <div className="text-center md:text-right w-full md:w-2/5">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">PERTE SÈCHE</p>
                             <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">38 400 €</p>
                        </div>
                    </div>
                </div>
             </div>

             {/* BLOC 2 : LA CÉCITÉ SUR LA RENTABILITÉ */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                             <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <EyeOff size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LA CÉCITÉ SUR LA<br/>RENTABILITÉ RÉELLE
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Vos tableaux affichent des moyennes qui masquent les disparités. Vous voyez la Marge Brute théorique sans imputer les coûts réels. Vos clients sains paient pour les toxiques.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                        <div className="mb-4">
                            <span className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000] uppercase tracking-wide mb-2 block">
                                DESTRUCTION
                            </span>
                            <span className="text-xl md:text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                DE VALEUR
                            </span>
                        </div>
                         <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Sur des contrats supposés rentables</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    
                    <div className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <h4 className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-sm opacity-80">ANALYSE D'UN CONTRAT DE 500 000 €</h4>
                            <span className="text-sb-green-dark/70 font-serif italic text-xs md:text-sm">(Marge attendue : 20%)</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <span className="text-sb-green-dark font-medium text-xs md:text-sm">Gain théorique</span>
                                    <span className="text-[#C5A065] font-bold font-serif text-lg">+ 100 000 €</span>
                                </div>
                                <div className="flex justify-between items-center">
                                     <span className="text-sb-green-dark/80 text-[10px] md:text-xs italic">Coûts cachés réels</span>
                                     <span className="text-[#8B0000] font-bold text-xs">- 50 000 €</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-center items-center md:items-end border-l-0 md:border-l border-gray-200 pl-0 md:pl-10">
                                <span className="text-sb-green-dark font-bold uppercase text-[10px] mb-2 opacity-80">RÉSULTAT RÉEL NET</span>
                                <span className="text-[#8B0000] font-bold text-3xl md:text-4xl font-serif">+ 50 000 €</span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>

             {/* BLOC 3 : L'INERTIE CORRECTIVE */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                         <div className="flex items-center gap-6 mb-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Hourglass size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                L'INERTIE CORRECTIVE<br/>(LE RETARD)
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                La plupart des PME pilotent au rétroviseur. Si l'info remonte 45 jours plus tard, vous êtes spectateur de votre perte. Une dérive de 2% sur vos coûts invisible un trimestre coûte 25 000 €.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                         <div className="mb-4">
                             <span className="text-4xl md:text-7xl font-serif font-bold text-[#8B0000] leading-none block whitespace-nowrap">
                                -25 000 €
                            </span>
                            <span className="text-xl md:text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                / TRIMESTRE
                            </span>
                        </div>
                         <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Coût d'une dérive tardive</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left w-full md:w-3/5">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Le Scénario :</strong>
                                Dérive de 2% sur les coûts invisible pendant 3 mois sur une base de 3M€ de coûts.
                            </p>
                        </div>
                         <div className="text-center md:text-right w-full md:w-2/5">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">PERTE IRRÉCUPÉRABLE</p>
                             <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">25 000 €</p>
                        </div>
                    </div>
                </div>
             </div>
         </div>
      </section>

      {/* 3. FINAL CTA */}
      <Section bg="cream" className="py-24 text-center border-t border-sb-green-dark/10">
        <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark mb-10 uppercase tracking-tight">
            Sortez du brouillard décisionnel
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

export default ImpactData;
