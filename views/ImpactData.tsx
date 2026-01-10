
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
            <h1 className="font-serif text-4xl md:text-7xl leading-[1.1] mb-10 text-white uppercase font-normal tracking-math-tight">
                LA DONNÉE INUTILE EST<br/>
                <span className="text-[#C5A065]">UN PASSIF TOXIQUE.</span>
            </h1>
            <div className="w-24 h-px bg-[#C5A065] mx-auto mb-10"></div>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-sans font-light leading-relaxed">
                Piloter avec les mauvais indicateurs coûte plus cher que de ne pas piloter du tout. Voici le prix réel de votre brouillard.
            </p>
        </div>
      </section>

      {/* ZONE 2 : LES 3 IMPACTS (BLOCS) */}
      <section className="bg-[#F4F6F7] py-24 md:py-32">
         <div className="container mx-auto px-6 max-w-[1100px] space-y-24">
             
             {/* BLOC 1 : L'OBÉSITÉ INFORMATIONNELLE (LE TROP-PLEIN) */}
             <div className="bg-white p-12 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-16 items-center">
                    {/* Golden Ratio: Text Column ~62% */}
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-14 h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Database size={28} />
                            </div>
                            <h2 className="font-serif text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                L'OBÉSITÉ<br/>INFORMATIONNELLE
                            </h2>
                        </div>
                        <div className="text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Dans une PME de 5M€, les indicateurs s'accumulent souvent par strates historiques. Chaque service crée ses tableaux pour se rassurer, sans cohérence globale. Vos managers se retrouvent à maintenir des fichiers 'pour information', remplis de données qui ne sont ni connectées à la stratégie, ni utilisées pour piloter l'action.
                            </p>
                            <p>
                                Cette saturation crée un bruit coûteux. L'information vitale est noyée dans la masse. Vous financez une bureaucratie interne où vos cadres passent plus de temps à 'nourrir la bête' (collecte, mise en forme) qu'à analyser les résultats pour décider.
                            </p>
                            <p>
                                Mon accompagnement vise à sortir du brouillard par la méthode. Nous ne supprimons pas aveuglément ; nous sélectionnons. Je travaille avec votre CODIR pour définir les règles de pilotage : quels indicateurs déclenchent vraiment une décision ? Nous structurons l'architecture pour ne conserver que les leviers de performance.
                            </p>
                        </div>
                    </div>
                    {/* Golden Ratio: Visual Column ~38% */}
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                         <div className="mb-4">
                            <span className="text-5xl md:text-7xl font-serif font-bold text-[#8B0000] leading-none block whitespace-nowrap">
                                40 000 €
                            </span>
                            <span className="text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                / AN
                            </span>
                        </div>
                         <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs">Gaspillés en indicateurs inactifs</p>
                    </div>
                </div>

                {/* SIMULATION PME - Minimalist Design */}
                <div className="bg-[#F9F9F9] border-t border-gray-100 p-10 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left w-full md:w-3/5">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Le Calcul du Gaspillage :</strong>
                                Base 4 Responsables (~400€/jour) x 0,5j perdu/semaine à remplir des tableaux manuels inutiles = 2 jours perdus/mois x 12 mois.
                            </p>
                        </div>
                        <div className="text-center md:text-right w-full md:w-2/5">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs mb-2 opacity-80">PERTE SÈCHE</p>
                             <p className="text-4xl md:text-5xl font-serif font-bold text-[#8B0000]">38 400 €</p>
                             <p className="text-sb-green-dark/60 font-light italic text-xs mt-2">(Arrondi à 40 000 €)</p>
                        </div>
                    </div>
                    {/* Source Note - Footnote style */}
                    <p className="mt-8 text-xs text-sb-green-dark/70 italic font-sans text-right">
                        Source : Application du 'Principe de Parcimonie' (Kaplan & Norton, Balanced Scorecard) et Loi de Pareto.
                    </p>
                </div>
             </div>

             {/* BLOC 2 : LA CÉCITÉ SUR LA RENTABILITÉ RÉELLE */}
             <div className="bg-white p-12 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-16 items-center">
                    {/* Golden Ratio: Text Column ~62% */}
                    <div className="w-full md:w-[62%]">
                        <div className="flex items-center gap-6 mb-10">
                             <div className="w-14 h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <EyeOff size={28} />
                            </div>
                            <h2 className="font-serif text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                LA CÉCITÉ SUR LA<br/>RENTABILITÉ RÉELLE
                            </h2>
                        </div>
                        <div className="text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                Vos tableaux de bord actuels affichent des moyennes par famille de produits. Mais la moyenne est dangereuse : elle masque les disparités. Vous voyez la Marge Brute théorique d'un gros contrat, sans imputer les coûts réels qu'il génère (logistique spécifique, temps passé par le Bureau d'Études, SAV).
                            </p>
                            <p>
                                Cette cécité provoque l'inter-subventionnement invisible. Sans le savoir, vos clients sains paient pour les toxiques. Vous pouvez féliciter vos équipes pour la signature d'un contrat de 500k€ qui, une fois les coûts cachés déduits, détruit en réalité votre trésorerie.
                            </p>
                            <p>
                                Je ne viens pas refaire votre comptabilité, je pose la méthodologie analytique. Je définis avec vous les clés de répartition pour affecter les coûts cachés au bon dossier. Nous construisons le 'grille de lecture' qui vous donnera la lucidité nécessaire pour redresser ou stopper les activités déficitaires.
                            </p>
                        </div>
                    </div>
                    {/* Golden Ratio: Visual Column ~38% */}
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                        <div className="mb-4">
                            <span className="text-4xl md:text-5xl font-serif font-bold text-[#8B0000] uppercase tracking-wide mb-2 block">
                                DESTRUCTION
                            </span>
                            <span className="text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                DE VALEUR
                            </span>
                        </div>
                         <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs">Sur des contrats supposés rentables</p>
                    </div>
                </div>

                {/* SIMULATION PME - Minimalist Design */}
                <div className="bg-[#F9F9F9] border-t border-gray-100 p-10 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sb-green-dark font-bold uppercase tracking-math-wide text-sm opacity-80">ANALYSE D'UN CONTRAT DE 500 000 €</h4>
                            <span className="text-sb-green-dark/70 font-serif italic text-sm">(Marge brute théorique attendue : 20% soit 100k€)</span>
                        </div>
                        
                        {/* CALCUL ÉPURÉ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <span className="text-sb-green-dark font-medium text-sm">Gain théorique affiché</span>
                                    <span className="text-[#C5A065] font-bold font-serif text-lg">+ 100 000 €</span>
                                </div>
                                <div className="space-y-2 pl-4 border-l border-gray-200">
                                    <div className="flex justify-between items-center">
                                         <span className="text-sb-green-dark/80 text-xs italic">Coûts cachés (Logistique, BE, Admin)</span>
                                         <span className="text-[#8B0000] font-bold text-xs">- 50 000 €</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col justify-center items-center md:items-end border-l-0 md:border-l border-gray-200 pl-0 md:pl-10">
                                <span className="text-sb-green-dark font-bold uppercase text-xs mb-2 opacity-80">RÉSULTAT RÉEL NET</span>
                                <span className="text-[#8B0000] font-bold text-4xl font-serif">+ 50 000 €</span>
                                <p className="text-sb-green-dark/60 font-light italic text-xs mt-2 text-center md:text-right">
                                    (50% de la marge évaporée en coûts cachés)
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Source Note - Footnote style */}
                    <p className="mt-8 text-xs text-sb-green-dark/70 italic font-sans text-right">
                        Source : Méthodologie ABC (Activity-Based Costing) et analyse de la 'Whale Curve' de rentabilité (R. Kaplan).
                    </p>
                </div>
             </div>

             {/* BLOC 3 : L'INERTIE CORRECTIVE (LE RETARD) */}
             <div className="bg-white p-12 md:p-[72px] shadow-xl border-l-4 border-[#C5A065] rounded-[2px] group hover:translate-y-[-5px] transition-all duration-500">
                <div className="flex flex-col md:flex-row gap-16 items-center">
                    {/* Golden Ratio: Text Column ~62% */}
                    <div className="w-full md:w-[62%]">
                         <div className="flex items-center gap-6 mb-10">
                            <div className="w-14 h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0">
                                <Hourglass size={28} />
                            </div>
                            <h2 className="font-serif text-3xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                                L'INERTIE CORRECTIVE<br/>(LE RETARD)
                            </h2>
                        </div>
                        <div className="text-lg text-sb-green-dark/80 font-sans leading-relaxed text-justify space-y-8">
                            <p>
                                La plupart des PME pilotent au rétroviseur : vous attendez le bilan pour savoir si vous avez gagné de l'argent. C'est dangereux. Une dérive opérationnelle (baisse de cadence, dérapage intérim) peut survenir n'importe quand. Si l'info remonte 45 jours plus tard, vous êtes spectateur de votre perte.
                            </p>
                            <p>
                                Le temps de latence est l'ennemi. Une dérive mineure de 2% sur vos coûts, si elle reste invisible un trimestre, coûte une fortune. Pour une PME de 5M€, ce retard à l'allumage représente une perte sèche de 25 000 €. C'est de l'argent brûlé irréversiblement.
                            </p>
                            <p>
                                Mon accompagnement réduit ce délai à zéro. J'installe une culture de la réactivité. Nous définissons les indicateurs avancés (Flash Hebdo) pour détecter l'écart dès la première semaine. L'objectif : passer du mode 'Constat de décès' au mode 'Correction de trajectoire'.
                            </p>
                        </div>
                    </div>
                    {/* Golden Ratio: Visual Column ~38% */}
                    <div className="w-full md:w-[38%] border-t md:border-t-0 md:border-l border-gray-100 pt-10 md:pt-0 md:pl-16 flex flex-col justify-center text-center md:text-right h-full">
                         <div className="mb-4">
                             <span className="text-5xl md:text-7xl font-serif font-bold text-[#8B0000] leading-none block whitespace-nowrap">
                                -25 000 €
                            </span>
                            <span className="text-2xl font-serif text-[#8B0000] uppercase tracking-wide">
                                / TRIMESTRE
                            </span>
                        </div>
                         <div className="w-12 h-px bg-sb-green-dark/10 mx-auto md:ml-auto mb-6"></div>
                        <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs">Coût d'une dérive tardivement détectée</p>
                    </div>
                </div>

                {/* SIMULATION PME - Minimalist Design */}
                <div className="bg-[#F9F9F9] border-t border-gray-100 p-10 md:p-12 mt-16 relative">
                    <div className="absolute top-0 left-0 -translate-y-1/2 bg-white px-4 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark/70 ml-10">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="text-left w-full md:w-3/5">
                            <p className="text-sb-green-dark/90 italic text-sm font-medium leading-relaxed">
                                <strong className="text-sb-green-dark not-italic block mb-1">Le Scénario :</strong>
                                Dérive de 2% sur les coûts (Matière/Main d'œuvre) invisible pendant 3 mois (délai situation comptable) sur une base de 3M€ de coûts.
                            </p>
                        </div>
                         <div className="text-center md:text-right w-full md:w-2/5">
                             <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs mb-2 opacity-80">PERTE IRRÉCUPÉRABLE</p>
                             <p className="text-4xl md:text-5xl font-serif font-bold text-[#8B0000]">25 000 €</p>
                             <p className="text-sb-green-dark/60 font-light italic text-xs mt-2">(Argent brûlé par manque de réactivité)</p>
                        </div>
                    </div>
                    {/* Source Note - Footnote style */}
                    <p className="mt-8 text-xs text-sb-green-dark/70 italic font-sans text-right">
                        Source : Distinction 'Lagging vs Leading Indicators' (HBR) et principe du 'Short Interval Control' (Lean Management).
                    </p>
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
