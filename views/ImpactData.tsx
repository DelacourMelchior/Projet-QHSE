
import React from 'react';
import { Page } from '../types';
import { Database, EyeOff, Hourglass, ArrowRight } from 'lucide-react';

interface ImpactDataProps {
  onNavigate: (page: Page) => void;
}

const ImpactData: React.FC<ImpactDataProps> = ({ onNavigate }) => {
  return (
    <div className="bg-white min-h-screen">
      {/* HERO SECTION */}
      <section className="bg-sb-green-dark text-white pt-40 pb-24 md:pt-56 md:pb-32 relative overflow-hidden">
         <div className="container mx-auto px-6 relative z-10 text-center">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-7xl leading-[1.1] mb-8 text-white uppercase font-normal tracking-math-tight">
                LA DONNÉE INUTILE EST<br/>
                <span className="text-[#C5A065]">UN PASSIF TOXIQUE.</span>
            </h1>
            <div className="w-24 h-px bg-[#C5A065] mx-auto mb-10"></div>
            <p className="text-lg md:text-2xl text-white/70 max-w-3xl mx-auto font-sans font-light leading-relaxed">
                Piloter avec les mauvais indicateurs coûte plus cher que de ne pas piloter du tout.<br/>Voici le prix réel de votre brouillard.
            </p>
        </div>
      </section>

      {/* IMPACT CARDS */}
      <section className="py-24 bg-[#F4F6F7]">
         <div className="container mx-auto px-6 max-w-4xl space-y-20">
             
             {/* CARD 1: OBÉSITÉ */}
             <div className="bg-white shadow-2xl border-l-[8px] border-[#C5A065] p-10 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-6 mb-12">
                    <div className="w-14 h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <Database size={32} />
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        L'OBÉSITÉ<br/>INFORMATIONNELLE
                    </h2>
                </div>

                <div className="space-y-8 text-sb-green-dark/80 font-sans text-lg leading-relaxed mb-16 text-justify">
                    <p>Dans une PME de 5M€, les indicateurs s'accumulent souvent par strates historiques. Chaque service crée ses tableaux pour se rassurer, sans cohérence globale. Vos managers se retrouvent à maintenir des fichiers 'pour information', remplis de données qui ne sont ni connectées à la stratégie, ni utilisées pour piloter l'action.</p>
                    <p>Cette saturation crée un bruit coûteux. L'information vitale est noyée dans la masse. Vous financez une bureaucratie interne où vos cadres passent plus de temps à 'nourrir la bête' (collecte, mise en forme) qu'à analyser les résultats pour décider.</p>
                    <p>Mon accompagnement vise à sortir du brouillard par la méthode. Nous ne supprimons pas aveuglément ; nous sélectionnons. Je travaille avec votre CODIR pour définir les règles de pilotage : quels indicateurs déclenchent vraiment une décision ? Nous structurons l'architecture pour ne conserver que les leviers de performance.</p>
                </div>

                <div className="text-center mb-12">
                    <p className="text-[#8B0000] font-serif text-7xl md:text-8xl font-bold leading-none mb-2">40 000 €</p>
                    <p className="text-[#8B0000] font-serif text-2xl uppercase tracking-widest font-bold mb-6">/ AN</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs opacity-60">Gaspillés en indicateurs inactifs</p>
                </div>

                <div className="bg-[#F9F9F9] p-8 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-3 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <p className="text-sb-green-dark font-bold text-sm uppercase tracking-wide">Le Calcul du Gaspillage :</p>
                            <p className="text-sb-green-dark/60 italic text-sm">Base 4 Responsables (~400€/jour) x 0,5j perdu/semaine à remplir des tableaux manuels inutiles = 2 jours perdus/mois x 12 mois.</p>
                        </div>
                        <div className="pt-6 border-t border-gray-200 text-center md:text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">PERTE SÈCHE</p>
                            <p className="text-4xl md:text-5xl font-serif font-bold text-[#8B0000]">38 400 €</p>
                            <p className="text-[10px] text-gray-400 italic mt-2">(Arrondi à 40 000 €)</p>
                        </div>
                        <p className="text-center text-[9px] text-gray-400 italic font-light pt-4">Source : Application du 'Principe de Parcimonie' (Kaplan & Norton, Balanced Scorecard) et Loi de Pareto.</p>
                    </div>
                </div>
             </div>

             {/* CARD 2: CÉCITÉ RENTABILITÉ */}
             <div className="bg-white shadow-2xl border-l-[8px] border-[#C5A065] p-10 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-6 mb-12">
                    <div className="w-14 h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <EyeOff size={32} />
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        LA CÉCITÉ SUR LA<br/>RENTABILITÉ RÉELLE
                    </h2>
                </div>

                <div className="space-y-8 text-sb-green-dark/80 font-sans text-lg leading-relaxed mb-16 text-justify">
                    <p>Vos tableaux de bord actuels affichent des moyennes par famille de produits. Mais la moyenne est dangereuse : elle masque les disparités. Vous voyez la Marge Brute théorique d'un gros contrat, sans imputer les coûts réels qu'il génère (logistique spécifique, temps passé par le Bureau d'Études, SAV).</p>
                    <p>Cette cécité provoque l'inter-subventionnement invisible. Sans le savoir, vos clients sains paient pour les toxiques. Vous pouvez féliciter vos équipes pour la signature d'un contrat de 500k€ qui, une fois les coûts cachés déduits, détruit en réalité votre trésorerie.</p>
                    <p>Je ne viens pas refaire votre comptabilité, je pose la méthodologie analytique. Je définis avec vous les clés de répartition pour affecter les coûts cachés au bon dossier. Nous construisons la 'grille de lecture' qui vous donnera la lucidité nécessaire pour redresser ou stopper les activités déficitaires.</p>
                </div>

                <div className="text-center mb-12">
                    <p className="text-[#8B0000] font-serif text-5xl md:text-6xl font-bold uppercase leading-tight mb-2">DESTRUCTION</p>
                    <p className="text-[#8B0000] font-serif text-2xl uppercase tracking-widest font-bold mb-8">DE VALEUR</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs opacity-60">Sur des contrats supposés rentables</p>
                </div>

                <div className="bg-[#F9F9F9] p-8 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-3 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    
                    <div className="space-y-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <p className="text-sb-green-dark font-bold text-sm uppercase tracking-wide">ANALYSE D'UN CONTRAT DE 500 000 €</p>
                            <p className="text-sb-green-dark/60 italic text-sm">(Marge brute théorique attendue : 20% soit 100k€)</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                                <span className="text-sb-green-dark font-bold text-sm uppercase tracking-wide">Gain théorique affiché</span>
                                <span className="text-[#C5A065] font-serif text-2xl font-bold">+ 100 000 €</span>
                            </div>
                            <div className="flex justify-between items-center pb-4">
                                <div className="text-left">
                                     <p className="text-sb-green-dark/60 text-xs italic">Coûts cachés</p>
                                     <p className="text-sb-green-dark/60 text-xs italic">(Logistique, BE, Admin)</p>
                                </div>
                                <span className="text-[#8B0000] font-serif text-2xl font-bold">- 50 000 €</span>
                            </div>
                            <div className="pt-8 border-t-2 border-sb-green-dark flex flex-col md:flex-row justify-between items-center gap-6">
                                <span className="text-sb-green-dark font-bold uppercase text-xs tracking-widest">RÉSULTAT RÉEL NET</span>
                                <div className="text-center md:text-right">
                                     <p className="text-[#8B0000] font-serif text-4xl md:text-5xl font-bold">+ 50 000 €</p>
                                     <p className="text-[10px] text-gray-400 italic mt-2">(50% de la marge évaporée en coûts cachés)</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[9px] text-gray-400 italic font-light pt-4">Source : Méthodologie ABC (Activity-Based Costing) et analyse de la 'Whale Curve' de rentabilité (R. Kaplan).</p>
                    </div>
                </div>
             </div>

             {/* CARD 3: INERTIE */}
             <div className="bg-white shadow-2xl border-l-[8px] border-[#C5A065] p-10 md:p-16 rounded-[2px]">
                <div className="flex items-start gap-6 mb-12">
                    <div className="w-14 h-14 bg-sb-green-dark text-[#C5A065] flex items-center justify-center rounded-[2px] flex-shrink-0 shadow-lg">
                        <Hourglass size={32} />
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark uppercase tracking-tight font-bold leading-tight">
                        L'INERTIE<br/>CORRECTIVE<br/>(LE RETARD)
                    </h2>
                </div>

                <div className="space-y-8 text-sb-green-dark/80 font-sans text-lg leading-relaxed mb-16 text-justify">
                    <p>La plupart des PME pilotent au rétroviseur : vous attendez le bilan pour savoir si vous avez gagné de l'argent. C'est dangereux. Une dérive opérationnelle (baisse de cadence, dérapage intérim) peut survenir n'importe quand. Si l'info remonte 45 jours plus tard, vous êtes spectateur de votre perte.</p>
                    <p>Le temps de latence est l'ennemi. Une dérive mineure de 2% sur vos coûts, si elle reste invisible un trimestre, coûte une fortune. Pour une PME de 5M€, ce retard à l'allumage représente une perte sèche de 25 000 €. C'est de l'argent brûlé irréversiblement.</p>
                    <p>Mon accompagnement réduit ce délai à zéro. J'installe une culture de la réactivité. Nous définissons les indicateurs avancés (Flash Hebdo) pour détecter l'écart dès la première semaine. L'objectif : passer du mode 'Constat de décès' au mode 'Correction de trajectoire'.</p>
                </div>

                <div className="text-center mb-12">
                    <p className="text-[#8B0000] font-serif text-7xl md:text-8xl font-bold leading-none mb-2">-25 000 €</p>
                    <p className="text-[#8B0000] font-serif text-2xl uppercase tracking-widest font-bold mb-6">/ TRIMESTRE</p>
                    <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs opacity-60">COÛT D'UNE DÉRIVE TARDIVEMENT DÉTECTÉE</p>
                </div>

                <div className="bg-[#F9F9F9] p-8 md:p-12 relative border border-gray-100">
                    <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-3 py-1 border border-gray-100 text-[10px] font-bold uppercase tracking-math-wide text-gray-400">
                        IMPACT PME (CA 5M€)
                    </div>
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <p className="text-sb-green-dark font-bold text-sm uppercase tracking-wide">Le Scénario :</p>
                            <p className="text-sb-green-dark/60 italic text-sm">Dérive de 2% sur les coûts (Matière/Main d'œuvre) invisible pendant 3 mois (délai situation comptable) sur une base de 3M€ de coûts.</p>
                        </div>
                        <div className="pt-6 border-t border-gray-200 text-center md:text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">PERTE IRRÉCUPÉRABLE</p>
                            <p className="text-4xl md:text-5xl font-serif font-bold text-[#8B0000]">25 000 €</p>
                            <p className="text-[10px] text-gray-400 italic mt-2">(Argent brûlé par manque de réactivité)</p>
                        </div>
                        <p className="text-center text-[9px] text-gray-400 italic font-light pt-4">Source : Distinction 'Lagging vs Leading Indicators' (HBR) et principe du 'Short Interval Control' (Lean Management).</p>
                    </div>
                </div>
             </div>

         </div>
      </section>

      {/* FOOTER CTA */}
      <section className="bg-sb-green-dark text-white py-24 border-t-8 border-sb-beige">
        <div className="container mx-auto px-6 text-center">
            <h2 className="font-serif text-4xl md:text-5xl uppercase tracking-math-tight mb-8">
                PASSEZ DU BRUIT AU<br/>SIGNAL.
            </h2>
            <div className="w-24 h-px bg-[#C5A065] mx-auto mb-10"></div>
            <p className="text-lg md:text-xl text-white/60 font-sans font-light mb-16 max-w-2xl mx-auto">
                Arrêtez de piloter au feeling. Construisons le Cockpit qui vous donne le contrôle réel.
            </p>
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-12 py-7 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-math-wide text-sm md:text-base rounded-[2px] hover:bg-white transition-all shadow-2xl"
            >
                AUDITER MES INDICATEURS <ArrowRight size={20} className="ml-3 group-hover:translate-x-2 transition-transform" />
            </button>
        </div>
      </section>
    </div>
  );
};

export default ImpactData;
