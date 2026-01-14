
import React from 'react';
import { Page } from '../types';
import { TrendingDown, Users, Layers, ArrowRight, BookOpen } from 'lucide-react';

interface ImpactSystemeProps {
  onNavigate: (page: Page) => void;
}

const ImpactSysteme: React.FC<ImpactSystemeProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white min-h-screen">
      {/* HERO SECTION */}
      <section className="bg-sb-green-dark text-white pt-32 pb-16 md:pt-56 md:pb-32 relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="font-serif text-2xl sm:text-4xl md:text-7xl leading-tight mb-6 text-white uppercase font-normal tracking-math-tight">
                LE DÉSORDRE EST UNE<br/>
                <span className="text-[#C5A065]">TAXE SUR VOTRE CAPITAL.</span>
            </h1>
            <div className="w-16 md:w-24 h-px bg-[#C5A065] mx-auto mb-8"></div>
            <p className="text-base md:text-2xl text-white/70 max-w-3xl mx-auto font-sans font-light leading-relaxed">
                Une entreprise sans système repose sur la chance et les hommes. Voici ce que cette fragilité vous coûte réellement.
            </p>
        </div>
      </section>

      {/* IMPACT CARDS */}
      <section className="py-12 md:py-24 bg-[#F4F6F7]">
         <div className="container mx-auto px-4 md:px-6 max-w-4xl space-y-12 md:space-y-20">
             
             {/* CARD 1: FRICTION */}
             <div className="bg-white shadow-xl md:shadow-2xl border-l-[6px] md:border-l-[8px] border-[#C5A065] p-6 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-4 md:gap-6 mb-8 md:mb-12">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <TrendingDown size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="font-serif text-xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        LA FRICTION<br/>OPÉRATIONNELLE
                    </h2>
                </div>

                <div className="space-y-6 md:space-y-8 text-sb-green-dark/80 font-sans text-sm md:text-lg leading-relaxed mb-10 md:mb-16 text-justify">
                    <p>Dans une PME réalisant 5M€ de CA par an, l'informel ne suffit plus. Vos collaborateurs passent leur temps à chercher l'information, attendre des validations ou compenser l'absence de standards. Le travail se fait, mais au prix d'une énergie démesurée. C'est du sable dans les engrenages.</p>
                    <p>Cette lourdeur a un coût : la perte d'efficience. Vous payez 100% des salaires, mais à cause de ces frottements, vous ne récupérez que 75% de temps productif. Sur une masse salariale d'1,2M€, c'est 300 000 € par an versés pour financer votre désorganisation.</p>
                    <p>L'Audit n'est que le point de départ. Ma valeur ajoutée réside dans l'accompagnement opérationnel qui suit. Nous reconstruisons votre architecture : définition des rôles, simplification des flux et écriture des règles. Je transforme une organisation lourde en un système fluide pour que chaque heure payée soit une heure produite.</p>
                </div>

                <div className="text-center mb-10 md:mb-12">
                    <p className="text-[#8B0000] font-serif text-5xl md:text-8xl font-bold leading-none mb-1 md:mb-2">-25%</p>
                    <p className="text-[#8B0000] font-serif text-lg md:text-2xl uppercase tracking-widest font-bold mb-4 md:mb-6">D'EFFICACITÉ</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs opacity-60">GASPILLAGE DE MASSE SALARIALE</p>
                </div>

                <div className="bg-[#F9F9F9] p-6 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-2 py-0.5 border border-gray-100 text-[8px] md:text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="space-y-6">
                        <p className="text-xs md:text-sm leading-relaxed">
                            <span className="text-sb-green-dark font-bold uppercase tracking-wide mr-2 whitespace-nowrap">Scénario PME (CA 5M€ / AN) :</span>
                            <span className="text-sb-green-dark/60 italic">Sur une masse salariale opérationnelle d'environ 1,2M€, l'absence de processus optimisés génère 25% de temps improductif (recherche, attente, flou).</span>
                        </p>
                        <div className="py-6 text-center md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 md:mb-2">SALAIRES À FONDS PERDUS</p>
                            <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">300 000 € <span className="text-sm md:text-xl font-sans font-bold">/ AN</span></p>
                        </div>
                        
                        {/* SOURCE VISIBLE */}
                        <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row gap-4 items-start">
                             <div className="text-[#C5A065] flex-shrink-0 mt-1">
                                <BookOpen size={20} />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark mb-1">Source & Méthode</p>
                                <p className="text-xs md:text-sm text-sb-green-dark/80 font-medium leading-relaxed">
                                    Études IDC sur la productivité ("The High Cost of Not Finding Information") et méthodologie standard Lean Office.
                                </p>
                             </div>
                        </div>
                    </div>
                </div>
             </div>

             {/* CARD 2: FUITE CAPITAUX */}
             <div className="bg-white shadow-xl md:shadow-2xl border-l-[6px] md:border-l-[8px] border-[#C5A065] p-6 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-4 md:gap-6 mb-8 md:mb-12">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <Users size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="font-serif text-xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        LA FUITE DES<br/>CAPITAUX INTELLECTUELS
                    </h2>
                </div>

                <div className="space-y-6 md:space-y-8 text-sb-green-dark/80 font-sans text-sm md:text-lg leading-relaxed mb-10 md:mb-16 text-justify">
                    <p>Votre entreprise repose-t-elle sur des processus écrits ou sur la mémoire de quelques 'historiques' ? C'est le danger du savoir tribal : des pans entiers de l'activité sont détenus par une poignée d'individus. Cette connaissance n'est pas un actif de l'entreprise, elle est seulement 'louée' à vos salariés.</p>
                    <p>Le départ d'un expert est un crash industriel. Au-delà du recrutement, le coût réel inclut la perte de productivité durant les 6 à 9 mois de montée en charge du remplaçant. Pour un cadre à 60k€/an, le coût total (150% du salaire) représente une perte sèche de 90 000 € par départ clé.</p>
                    <p>Mon travail consiste à sécuriser cet actif. Je mène l'extraction et la formalisation : je transforme le 'coup de main' intuitif de vos experts en processus standardisés. Nous construisons le patrimoine de l'entreprise pour rendre tout départ indolore pour vos opérations.</p>
                </div>

                <div className="text-center mb-10 md:mb-12">
                    <p className="text-[#C5A065] font-serif text-base md:text-xl uppercase tracking-widest font-bold mb-2 md:mb-4">COÛT PAR DÉPART</p>
                    <p className="text-[#8B0000] font-serif text-5xl md:text-8xl font-bold leading-none mb-4 md:mb-6">90k€</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs opacity-60">POUR UN CADRE EXPERT (TECH/CO/ADMIN)</p>
                </div>

                <div className="bg-[#F9F9F9] p-6 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-2 py-0.5 border border-gray-100 text-[8px] md:text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="space-y-6">
                        <p className="text-xs md:text-sm leading-relaxed">
                            <span className="text-sb-green-dark font-bold uppercase tracking-wide mr-2 whitespace-nowrap">Impact Financier Réel :</span>
                            <span className="text-sb-green-dark/60 italic">Remplacer un expert (60k€/an) coûte 150% de son salaire (Recrutement + Formation + Perte de productivité).</span>
                        </p>
                        <div className="py-6 text-center md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 md:mb-2">PERTE SÈCHE</p>
                            <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">90 000 € <span className="text-sm md:text-xl font-sans font-bold">/ DÉMISSION</span></p>
                        </div>
                        
                         {/* SOURCE VISIBLE */}
                         <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row gap-4 items-start">
                             <div className="text-[#C5A065] flex-shrink-0 mt-1">
                                <BookOpen size={20} />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark mb-1">Source & Méthode</p>
                                <p className="text-xs md:text-sm text-sb-green-dark/80 font-medium leading-relaxed">
                                    Données SHRM (Society for Human Resource Management) évaluant le coût de remplacement d'un expert entre 150% et 200% du salaire annuel.
                                </p>
                             </div>
                        </div>
                    </div>
                </div>
             </div>

             {/* CARD 3: PLAFOND DE VERRE */}
             <div className="bg-white shadow-xl md:shadow-2xl border-l-[6px] md:border-l-[8px] border-[#C5A065] p-6 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-4 md:gap-6 mb-8 md:mb-12">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <Layers size={24} className="md:w-8 md:h-8" />
                    </div>
                    <h2 className="font-serif text-xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        LE PLAFOND DE VERRE<br/><span className="text-sm md:text-2xl font-normal">(SATURATION)</span>
                    </h2>
                </div>

                <div className="space-y-6 md:space-y-8 text-sb-green-dark/80 font-sans text-sm md:text-lg leading-relaxed mb-10 md:mb-16 text-justify">
                    <p>C'est le paradoxe de la croissance : plus vous vendez, plus vous souffrez. Votre organisation 'artisanale' n'est pas conçue pour le volume. Chaque nouveau client ajoute une complexité exponentielle. Vous arrivez à saturation : vos équipes sont sous l'eau, non par manque de volonté, mais par saturation structurelle.</p>
                    <p>Cette saturation est un frein à main. Combien d'affaires refusez-vous parce que 'on est charrette' ? Pour une PME de 5M€/an, cette incapacité à passer à l'échelle coûte cher. Si vous ratez 10% de croissance faute de structure pour l'absorber, c'est 500 000 € de CA laissés sur la table.</p>
                    <p>Mon rôle est de casser ce plafond de verre. L'accompagnement vise à 'industrialiser' vos méthodes. Nous créons des standards robustes pour traiter le volume avec rigueur. Nous passons d'une gestion de l'effort à un pilotage de flux, vous permettant de grandir sans exploser en vol.</p>
                </div>

                <div className="text-center mb-10 md:mb-12">
                    <p className="text-[#8B0000] font-serif text-5xl md:text-8xl font-bold leading-none mb-1 md:mb-2">-500k€</p>
                    <p className="text-[#8B0000] font-serif text-lg md:text-2xl uppercase tracking-widest font-bold mb-4 md:mb-6">DE CA</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs opacity-60">MANQUE À GAGNER ANNUEL (REFUS DE CHARGE)</p>
                </div>

                <div className="bg-[#F9F9F9] p-6 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-2 py-0.5 border border-gray-100 text-[8px] md:text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="space-y-6">
                        <p className="text-xs md:text-sm leading-relaxed">
                            <span className="text-sb-green-dark font-bold uppercase tracking-wide mr-2 whitespace-nowrap">Impact Financier Réel :</span>
                            <span className="text-sb-green-dark/60 italic">Sur un CA de 5M€, vous laissez échapper 10% de croissance par incapacité à absorber la charge supplémentaire.</span>
                        </p>
                        <div className="py-6 text-center md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 md:mb-2">ARGENT LAISSÉ SUR LA TABLE</p>
                            <p className="text-3xl md:text-5xl font-serif font-bold text-[#8B0000]">500 000 € <span className="text-sm md:text-xl font-sans font-bold">/ AN</span></p>
                        </div>
                        
                         {/* SOURCE VISIBLE */}
                         <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row gap-4 items-start">
                             <div className="text-[#C5A065] flex-shrink-0 mt-1">
                                <BookOpen size={20} />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark mb-1">Source & Méthode</p>
                                <p className="text-xs md:text-sm text-sb-green-dark/80 font-medium leading-relaxed">
                                    Modèle de la 'Courbe de Greiner' (Crise d'Autonomie) et analyse du 'Paradoxe de la Croissance' (Bain & Co).
                                </p>
                             </div>
                        </div>
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
            <div className="w-16 md:w-24 h-px bg-[#C5A065] mx-auto mb-8 md:mb-10"></div>
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

export default ImpactSysteme;
