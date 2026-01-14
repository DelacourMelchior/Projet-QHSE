import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { Archive, TrendingDown, Wrench, CheckCircle, ArrowRight } from 'lucide-react';

interface OfferExecutionProps {
  onNavigate: (page: Page) => void;
}

const OfferExecution: React.FC<OfferExecutionProps> = ({ onNavigate }) => {
  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center bg-sb-green-dark overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://image.pollinations.ai/prompt/luxury%20chess%20game%20move%20strategy%20dark%20cinematic%20lighting%20hand%20moving%20piece%20macro%20photography%20focus%20on%20action?nologo=true" 
            alt="Stratégie en action" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-sb-green-dark/85 mix-blend-multiply"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center pt-32 pb-20">
            <span className="inline-block font-sans text-[10px] md:text-xs font-bold tracking-math-wide uppercase text-sb-beige mb-6 border border-sb-beige/30 px-3 py-2 rounded-[2px]">
                Cabinet Delacour — DÉPLOIEMENT & TRANSFORMATION
            </span>
            
            <h1 style={{ fontSize: 'clamp(26px, 6vw, 89px)' }} className="font-serif text-white leading-[1.1] tracking-math-tight mb-8 uppercase">
              PROGRAMME DE<br/>STRUCTURATION<br/>& PERFORMANCE
            </h1>
            
            <div className="w-16 h-px bg-sb-beige mx-auto mb-10"></div>
            
            <p className="text-base md:text-body text-white/90 leading-phi max-w-2xl mx-auto font-light mb-12 font-sans px-4">
              De la feuille de route à la réalité terrain.<br/>
              <span className="opacity-70">Nous pilotons la mise en œuvre de votre plan de transformation.</span>
            </p>
            
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-10 py-5 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs transition-all duration-300 hover:bg-white rounded-[2px]"
            >
                Engager la transformation
            </button>
        </div>
      </section>

      {/* 2. SECTION CONSTAT (TENSION) */}
      <Section bg="cream" className="py-20 md:py-fib-144">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <h2 style={{ fontSize: 'clamp(24px, 5vw, 55px)' }} className="font-serif text-sb-green-dark uppercase tracking-math-tight mb-8 leading-tight">L'Enlisement</h2>
                <div className="relative p-6 md:p-10 bg-white border-l-4 border-sb-green-dark shadow-sm rounded-[2px]">
                    <p className="font-serif text-lg md:text-3xl italic text-sb-green-dark leading-normal">
                        "Un diagnostic sans exécution n'est qu'une dépense. La valeur réside dans l'action."
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-16 px-2 md:px-0">
                {/* Pain Point 1 */}
                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <Archive size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">Le Syndrome du "Tiroir"</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Le rapport d'audit reste lettre morte, chassé par le quotidien. Les plans d'actions s'empilent.
                    </p>
                </div>

                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <TrendingDown size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">Perte de Crédibilité</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        L'élan initié retombe. Le management perd sa légitimité à force d'effets d'annonce sans suite.
                    </p>
                </div>

                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <Wrench size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">Bricolage</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Actions correctives superficielles qui ne traitent pas les causes racines.
                    </p>
                </div>
            </div>
        </div>
      </Section>

      {/* 3. SECTION MÉTHODOLOGIE (TIMELINE) */}
      <Section bg="green" className="py-20 md:py-fib-144 relative border-t-4 border-sb-beige">
        <div className="text-center mb-24 px-4">
            {/* TITRE MÉTHODOLOGIE AJUSTÉ */}
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 55px)' }} className="font-serif text-white uppercase tracking-math-tight mb-4 leading-tight">
                Méthodologie
            </h2>
            <p className="text-sb-beige font-sans uppercase tracking-math-wide text-[10px] md:text-sm">Rythme & Discipline d'exécution</p>
        </div>

        <div className="relative max-w-4xl mx-auto px-4">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-sb-beige/20 -translate-x-1/2"></div>

            <div className="space-y-16 md:space-y-20">
                {/* Phase 1 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 1 : Le Choc</h3>
                        <p className="text-sb-beige/60 text-[10px] font-bold uppercase tracking-wide mb-2">Mois 1-3</p>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Sécurisation Immédiate (Quick Wins) et déploiement des verrous de sécurité pour stopper l'hémorragie.</p>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <span className="w-1.5 h-1.5 bg-sb-beige rounded-full"></span>
                    </div>
                    <div className="md:w-5/12 pl-12 order-3 hidden md:block">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">01</span>
                    </div>
                </div>

                {/* Phase 2 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                     <div className="md:w-5/12 text-right pr-12 hidden md:block order-1">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">02</span>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <span className="w-1.5 h-1.5 bg-sb-beige rounded-full"></span>
                    </div>
                    <div className="md:w-5/12 text-left pl-12 order-2 md:order-3">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 2 : L'Industrialisation</h3>
                        <p className="text-sb-beige/60 text-[10px] font-bold uppercase tracking-wide mb-2">Mois 4-9</p>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Structuration des Flux, refonte des processus critiques et implémentation des outils de pilotage.</p>
                    </div>
                </div>

                 {/* Phase 3 */}
                 <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 3 : L'Ancrage</h3>
                        <p className="text-sb-beige/60 text-[10px] font-bold uppercase tracking-wide mb-2">Mois 10+</p>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Autonomie des Équipes, formation des managers et transfert de compétences pour assurer la pérennité.</p>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <span className="w-1.5 h-1.5 bg-sb-beige rounded-full"></span>
                    </div>
                    <div className="md:w-5/12 pl-12 order-3 hidden md:block">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">03</span>
                    </div>
                </div>

                {/* Phase 4 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                     <div className="md:w-5/12 text-right pr-12 hidden md:block order-1">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">04</span>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <CheckCircle size={12} className="text-sb-beige" />
                    </div>
                    <div className="md:w-5/12 text-left pl-12 order-2 md:order-3">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 4 : La Validation</h3>
                        <p className="text-sb-beige/60 text-[10px] font-bold uppercase tracking-wide mb-2">Jalon Final</p>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Audit de clôture et mesure de l'écart parcouru pour valider la performance et célébrer le nouveau standard.</p>
                    </div>
                </div>
            </div>
        </div>
      </Section>

      {/* 4. FINAL CTA */}
      <Section bg="cream" className="py-24 text-center border-t border-sb-green-dark/10 px-4">
        <h2 className="font-serif text-2xl md:text-4xl text-sb-green-dark mb-10 uppercase tracking-tight leading-tight">
            Prêt à structurer votre croissance ?
        </h2>
        <button 
            onClick={() => onNavigate(Page.CONTACT)}
            className="group inline-flex items-center justify-center px-10 py-5 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-sm rounded-[2px] transition-all shadow-lg"
        >
            RÉSERVER MON ENTRETIEN <ArrowRight size={16} className="ml-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </Section>
    </>
  );
};

export default OfferExecution;
