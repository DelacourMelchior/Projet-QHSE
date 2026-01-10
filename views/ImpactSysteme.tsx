
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { TrendingDown, Users, Layers, ArrowRight } from 'lucide-react';

interface ImpactSystemeProps {
  onNavigate: (page: Page) => void;
}

const ImpactSysteme: React.FC<ImpactSystemeProps> = ({ onNavigate }) => {
  return (
    <>
      {/* ZONE 1 : HERO SECTION */}
      <section className="bg-sb-green-dark text-white pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-7xl leading-[1.1] mb-10 text-white uppercase font-normal tracking-math-tight break-normal">
                LE DÉSORDRE EST UNE<br/>
                <span className="text-[#C5A065]">TAXE SUR VOTRE CAPITAL.</span>
            </h1>
            <div className="w-24 h-px bg-[#C5A065] mx-auto mb-10"></div>
            <p className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto font-sans font-light leading-relaxed">
                Une entreprise sans système repose sur la chance et les hommes. Voici ce que cette fragilité vous coûte réellement.
            </p>
        </div>
      </section>

      {/* ZONE 2 : LES 3 IMPACTS */}
      <section className="bg-[#F4F6F7] py-24 md:py-32">
         <div className="container mx-auto px-6 max-w-[1100px] space-y-24">
             
             {/* BLOC 1 : LA FRICTION OPÉRATIONNELLE */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <TrendingDown size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LA FRICTION<br/>OPÉRATIONNELLE
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Dans une PME réalisant 5M€ de CA par an, l'informel ne suffit plus. Vos collaborateurs passent leur temps à chercher l'information ou attendre des validations. Vous payez 100% des salaires, mais à cause de ces frottements, vous ne récupérez que 75% de temps productif.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                        <div className="mb-4">
                            <span className="text-5xl md:text-8xl font-serif font-bold text-[#8B0000] leading-none block">
                                -25%
                            </span>
                            <span className="text-xl md:text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                D'EFFICACITÉ
                            </span>
                        </div>
                         <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Gaspillage de Masse Salariale</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left w-full md:w-3/5">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Scénario PME (CA 5M€ / AN) :</strong>
                                Sur une masse salariale opérationnelle d'environ 1,2M€, l'absence de processus optimisés génère 25% de temps improductif.
                            </p>
                        </div>
                        <div className="text-center md:text-right w-full md:w-2/5">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">SALAIRES À FONDS PERDUS</p>
                             <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">300 000 €<span className="text-sm md:text-lg ml-2 font-sans opacity-60 text-sb-green-dark">/ AN</span></p>
                        </div>
                    </div>
                </div>
             </div>

             {/* BLOC 2 : LA FUITE DES CAPITAUX INTELLECTUELS */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                             <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Users size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LA FUITE DES CAPITAUX<br/>INTELLECTUELS
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Votre entreprise repose-t-elle sur des processus écrits ou sur la mémoire de quelques 'historiques' ? Le départ d'un expert est un crash industriel. Pour un cadre à 60k€/an, le coût total représente une perte sèche de 90 000 €.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                        <div className="mb-4">
                            <span className="text-lg md:text-xl font-serif text-[#8B0000] uppercase tracking-wide mb-2 block">
                                COÛT PAR DÉPART
                            </span>
                            <span className="text-5xl md:text-7xl font-serif font-bold text-[#8B0000] leading-none block">
                                90k€
                            </span>
                        </div>
                        <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Pour un cadre expert</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left w-full md:w-3/5">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Impact Financier Réel :</strong>
                                Remplacer un expert (60k€/an) coûte 150% de son salaire (Recrutement + Formation + Perte de productivité).
                            </p>
                        </div>
                         <div className="text-center md:text-right w-full md:w-2/5">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">PERTE SÈCHE</p>
                             <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">90 000 €</p>
                        </div>
                    </div>
                </div>
             </div>

             {/* BLOC 3 : LE PLAFOND DE VERRE */}
             <div className="bg-white p-8 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Layers size={28} />
                            </div>
                            <h2 className="font-serif text-2xl md:text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LE PLAFOND DE VERRE<br/>(SATURATION)
                            </h2>
                        </div>
                        <div className="text-base md:text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Votre organisation 'artisanale' n'est pas conçue pour le volume. Chaque nouveau client ajoute une complexité exponentielle. Si vous ratez 10% de croissance faute de structure, c'est 500 000 € de CA laissés sur la table.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                        <div className="mb-4">
                             <span className="text-4xl md:text-6xl font-serif font-bold text-[#8B0000] leading-none block whitespace-nowrap">
                                -500k€
                            </span>
                            <span className="text-xl md:text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                DE CA
                            </span>
                        </div>
                        <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs">Manque à gagner annuel</p>
                    </div>
                </div>

                <div className="bg-[#F9F9F9] border-t border-gray-100 p-8 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-6 md:ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left w-full md:w-3/5">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Impact Financier Réel :</strong>
                                Sur un CA de 5M€, vous laissez échapper 10% de croissance par incapacité à absorber la charge supplémentaire.
                            </p>
                        </div>
                         <div className="text-center md:text-right w-full md:w-2/5">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs mb-2 opacity-80">ARGENT LAISSÉ SUR LA TABLE</p>
                             <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">500 000 €</p>
                        </div>
                    </div>
                </div>
             </div>
         </div>
      </section>

      {/* 3. FINAL CTA */}
      <Section bg="cream" className="py-24 text-center border-t border-sb-green-dark/10">
        <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark mb-10 uppercase tracking-tight">
            Structurez votre capital immatériel
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

export default ImpactSysteme;
