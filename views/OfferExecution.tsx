
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { Archive, TrendingDown, Wrench, CheckCircle, Briefcase } from 'lucide-react';

interface OfferExecutionProps {
  onNavigate: (page: Page) => void;
}

const OfferExecution: React.FC<OfferExecutionProps> = ({ onNavigate }) => {
  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center bg-sb-green-dark overflow-hidden">
        {/* Background - Industrial/Strategic Aesthetic */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://image.pollinations.ai/prompt/luxury%20chess%20game%20move%20strategy%20dark%20cinematic%20lighting%20hand%20moving%20piece%20macro%20photography%20focus%20on%20action?nologo=true" 
            alt="Stratégie en action" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-sb-green-dark/85 mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sb-green-dark to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10 text-center pt-32 pb-20">
            <span className="inline-block font-sans text-xs font-bold tracking-math-wide uppercase text-sb-beige mb-6 border border-sb-beige/30 px-4 py-2 rounded-[2px]">
                Cabinet Delacour — DÉPLOIEMENT & TRANSFORMATION
            </span>
            
            <h1 className="font-serif text-5xl md:text-hero text-white leading-[1.1] tracking-math-tight mb-8 uppercase">
              PROGRAMME DE<br/>STRUCTURATION<br/>& PERFORMANCE
            </h1>
            
            <div className="w-24 h-px bg-sb-beige mx-auto mb-10"></div>
            
            <p className="text-body text-white/90 leading-phi max-w-2xl mx-auto font-light mb-12 font-sans">
              De la feuille de route à la réalité terrain.<br/>
              <span className="opacity-70">Nous pilotons la mise en œuvre de votre plan de transformation. Garantie de rythme et de résultats.</span>
            </p>
            
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-12 py-5 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-math-wide text-xs overflow-hidden transition-all duration-300 hover:bg-white rounded-[2px]"
            >
                Engager la transformation
            </button>
        </div>
      </section>

      {/* 2. SECTION CONSTAT (TENSION) */}
      <Section bg="cream" className="py-fib-144">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="font-serif text-title text-sb-green-dark uppercase tracking-math-tight mb-8">L'Enlisement</h2>
                <div className="relative p-10 bg-white border-l-4 border-sb-green-dark shadow-sm rounded-[2px]">
                    <p className="font-serif text-2xl md:text-3xl italic text-sb-green-dark leading-normal">
                        "Un diagnostic sans exécution n'est qu'une dépense. La valeur réside dans l'action, pas dans l'intention."
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-16">
                {/* Pain Point 1 */}
                <div className="bg-white p-8 border border-gray-200 hover:border-sb-green-dark/30 transition-all duration-300 group rounded-[2px]">
                    <div className="w-12 h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6 group-hover:bg-sb-green-dark group-hover:text-sb-beige transition-colors">
                        <Archive size={24} />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-sb-green-dark mb-4">Le Syndrome du "Tiroir"</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Le rapport d'audit reste lettre morte, chassé par le quotidien. Les plans d'actions s'empilent sans jamais être clôturés.
                    </p>
                </div>

                {/* Pain Point 2 */}
                <div className="bg-white p-8 border border-gray-200 hover:border-sb-green-dark/30 transition-all duration-300 group rounded-[2px]">
                    <div className="w-12 h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6 group-hover:bg-sb-green-dark group-hover:text-sb-beige transition-colors">
                        <TrendingDown size={24} />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-sb-green-dark mb-4">Perte de Crédibilité</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        L'élan initié retombe, démobilisant les équipes. Le management perd sa légitimité à force d'effets d'annonce sans suite.
                    </p>
                </div>

                {/* Pain Point 3 */}
                <div className="bg-white p-8 border border-gray-200 hover:border-sb-green-dark/30 transition-all duration-300 group rounded-[2px]">
                    <div className="w-12 h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6 group-hover:bg-sb-green-dark group-hover:text-sb-beige transition-colors">
                        <Wrench size={24} />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-sb-green-dark mb-4">Bricolage</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Actions correctives superficielles qui ne traitent pas les causes racines. On soigne le symptôme mais la maladie persiste.
                    </p>
                </div>
            </div>
        </div>
      </Section>

      {/* 3. SECTION MÉTHODOLOGIE (TIMELINE) */}
      <Section bg="green" className="py-fib-144 relative border-t-4 border-sb-beige">
        <div className="text-center mb-24">
            <h2 className="font-serif text-title text-white uppercase tracking-math-tight mb-4">Feuille de Route</h2>
            <p className="text-sb-beige font-sans uppercase tracking-math-wide text-sm">Rythme & Discipline d'exécution</p>
        </div>

        <div className="relative max-w-4xl mx-auto">
            {/* Central Line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-sb-beige/20 -translate-x-1/2"></div>

            <div className="space-y-20">
                {/* Phase 1 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-2xl text-sb-beige mb-2">Phase 1 : Le Choc de Fiabilité</h3>
                        <p className="text-sb-beige/60 text-xs font-bold uppercase tracking-wide mb-2">Mois 1-3</p>
                        <p className="text-white/70 font-light leading-phi text-sm">Sécurisation Immédiate (Quick Wins) et déploiement des verrous de sécurité pour stopper l'hémorragie opérationnelle.</p>
                    </div>
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <span className="w-2 h-2 bg-sb-beige rounded-full"></span>
                    </div>
                    <div className="md:w-5/12 pl-12 md:pl-12 order-3">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">01</span>
                    </div>
                </div>

                {/* Phase 2 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                     <div className="md:w-5/12 text-right pr-12 hidden md:block order-1">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">02</span>
                    </div>
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <span className="w-2 h-2 bg-sb-beige rounded-full"></span>
                    </div>
                    <div className="md:w-5/12 text-left pl-12 order-2 md:order-3">
                        <h3 className="font-serif text-2xl text-sb-beige mb-2">Phase 2 : L'Industrialisation</h3>
                        <p className="text-sb-beige/60 text-xs font-bold uppercase tracking-wide mb-2">Mois 4-9</p>
                        <p className="text-white/70 font-light leading-phi text-sm">Structuration des Flux, refonte des processus critiques et implémentation des outils de pilotage (Dashboards) pour une visibilité totale.</p>
                    </div>
                </div>

                 {/* Phase 3 */}
                 <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-2xl text-sb-beige mb-2">Phase 3 : L'Ancrage Culturel</h3>
                        <p className="text-sb-beige/60 text-xs font-bold uppercase tracking-wide mb-2">Mois 10+</p>
                        <p className="text-white/70 font-light leading-phi text-sm">Autonomie des Équipes, formation des managers et transfert de compétences pour assurer la pérennité du système.</p>
                    </div>
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <span className="w-2 h-2 bg-sb-beige rounded-full"></span>
                    </div>
                    <div className="md:w-5/12 pl-12 md:pl-12 order-3">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">03</span>
                    </div>
                </div>

                {/* Phase 4 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                     <div className="md:w-5/12 text-right pr-12 hidden md:block order-1">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">04</span>
                    </div>
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <CheckCircle size={16} className="text-sb-beige" />
                    </div>
                    <div className="md:w-5/12 text-left pl-12 order-2 md:order-3">
                        <h3 className="font-serif text-2xl text-sb-beige mb-2">Phase 4 : La Validation</h3>
                        <p className="text-sb-beige/60 text-xs font-bold uppercase tracking-wide mb-2">Jalon Final</p>
                        <p className="text-white/70 font-light leading-phi text-sm">Audit de clôture et mesure de l'écart parcouru pour valider la performance et célébrer le nouveau standard.</p>
                    </div>
                </div>
            </div>
        </div>
      </Section>

      {/* 4. SECTION OFFRE (MANDAT) */}
      <Section bg="cream" className="pb-fib-144 pt-24">
        <div className="max-w-4xl mx-auto">
            <div className="bg-[#0A1210] p-12 md:p-16 border border-sb-beige/30 relative overflow-hidden rounded-[2px] text-center">
                {/* Decorative Pattern */}
                <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-sb-beige/20"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-sb-beige/20"></div>
                
                <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-sb-beige rounded-full mb-8 text-sb-green-dark">
                        <Briefcase size={32} />
                    </div>
                    
                    <h2 className="font-serif text-3xl md:text-4xl text-sb-beige mb-4 uppercase tracking-widest leading-tight">
                        MANDAT DE STRUCTURATION & PERFORMANCE
                    </h2>

                    <div className="w-20 h-px bg-sb-beige/50 mx-auto mb-8"></div>
                    
                    <p className="font-serif text-xl text-white/80 italic mb-2">
                        "Sortez de l'artisanat, entrez dans l'industrie."
                    </p>
                    <p className="text-white/70 text-sm font-sans font-light leading-relaxed max-w-2xl mx-auto mb-10">
                        Nous construisons l'ossature invisible (règles, rôles, standards) qui permet à votre entreprise de grandir sans chaos, même en votre absence.
                    </p>
                    
                    <div className="bg-white/5 border border-sb-beige/20 p-8 rounded-[2px] mb-12 max-w-lg mx-auto">
                        <p className="text-sb-beige text-sm tracking-wide leading-relaxed">
                            <span className="font-bold border-b border-sb-beige/30 pb-1 mb-2 inline-block">CONTINUITÉ STRATÉGIQUE :</span><br/>
                            Votre diagnostic n'est pas une dépense, c'est un acompte. L'investissement de votre Audit de Robustesse est déductible du montant global de ce mandat.
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => onNavigate(Page.CONTACT)}
                        className="bg-sb-beige text-sb-green-dark px-10 py-5 font-bold uppercase tracking-math-wide rounded-[2px] hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                        DÉMARRER LA STRUCTURATION
                    </button>
                </div>
            </div>
        </div>
      </Section>
    </>
  );
};

export default OfferExecution;
