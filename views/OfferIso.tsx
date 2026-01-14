import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { AlertTriangle, Layers, UserMinus, CheckCircle, ArrowRight } from 'lucide-react';

interface OfferIsoProps {
  onNavigate: (page: Page) => void;
}

const OfferIso: React.FC<OfferIsoProps> = ({ onNavigate }) => {
  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center bg-sb-green-dark overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://image.pollinations.ai/prompt/architectural%20blueprint%20macro%20clean%20lines%20dark%20green%20background%20golden%20ratio%20overlay%20platinum%20details%20cinematic%20lighting?nologo=true" 
            alt="Architecture Plan" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-sb-green-dark/85 mix-blend-multiply"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center pt-32 pb-20">
            <span className="inline-block font-sans text-[10px] md:text-xs font-bold tracking-math-wide uppercase text-sb-beige mb-6 border border-sb-beige/30 px-3 py-2 rounded-[2px]">
                Cabinet Delacour — Programme Intégral
            </span>
            
            <h1 style={{ fontSize: 'clamp(26px, 6vw, 89px)' }} className="font-serif text-white leading-[1.1] tracking-math-tight mb-8 uppercase">
              Architecture &<br className="hidden sm:block" /> Certification ISO 9001
            </h1>
            
            <div className="w-16 h-px bg-sb-beige mx-auto mb-10"></div>
            
            <p className="text-base md:text-body text-white/90 leading-phi max-w-2xl mx-auto font-light mb-12 font-sans px-4">
              Votre certification en 6 à 9 mois.<br/>
              <span className="opacity-70">Transformez votre ambition stratégique en système certifié.</span>
            </p>
            
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-10 py-5 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs transition-all duration-300 hover:bg-white rounded-[2px]"
            >
                Demander un diagnostic
            </button>
        </div>
      </section>

      {/* 2. SECTION CONSTAT (TENSION) */}
      <Section bg="cream" className="py-20 md:py-fib-144">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <h2 style={{ fontSize: 'clamp(22px, 5vw, 55px)' }} className="font-serif text-sb-green-dark uppercase tracking-math-tight mb-8 leading-tight">
                  L'Écueil Bureaucratique
                </h2>
                <div className="relative p-6 md:p-10 bg-white border-l-4 border-sb-green-dark shadow-sm rounded-[2px]">
                    <p className="font-serif text-lg md:text-3xl italic text-sb-green-dark leading-normal">
                        "Le risque n'est pas de rater l'examen, mais de construire un système lourd qui paralysera votre agilité."
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-16 px-2 md:px-0">
                {/* Cards */}
                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <Layers size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">L'Usine à Gaz</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Des procédures que personne ne lit et qui ralentissent l'exécution opérationnelle.
                    </p>
                </div>

                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <AlertTriangle size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">La Double Vie</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Un système pour la Qualité et un système pour le Business. Une dichotomie risquée.
                    </p>
                </div>

                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <UserMinus size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">La Démotivation</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Transformer vos collaborateurs en agents administratifs. Perte de sens majeure.
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
            <p className="text-sb-beige font-sans uppercase tracking-math-wide text-[10px] md:text-sm">De la stratégie à la certification</p>
        </div>

        <div className="relative max-w-4xl mx-auto px-4">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-sb-beige/20 -translate-x-1/2"></div>

            <div className="space-y-16 md:space-y-20">
                {/* Phase 1 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 1 : L'Architecture</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Cadrage & Stratégie. Design du Système, Audit initial (Gap Analysis) et cartographie des processus alignée sur la réalité business.</p>
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
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 2 : La Construction</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Déploiement & Ingénierie des Flux. Rédaction minimaliste, création des Tableaux de Bord et formation des pilotes.</p>
                    </div>
                </div>

                 {/* Phase 3 */}
                 <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 3 : L'Épreuve</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Audit Blanc. Crash-Test en conditions réelles et Revue de Direction pour corriger les derniers écarts avant l'épreuve.</p>
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
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Phase 4 : Le Sacre</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Certification. Assistance lors de l'audit final et validation de votre nouveau standard d'excellence.</p>
                    </div>
                </div>
            </div>
        </div>
      </Section>

      {/* 4. FINAL CTA */}
      <Section bg="cream" className="py-24 text-center border-t border-sb-green-dark/10 px-4">
        <h2 className="font-serif text-2xl md:text-4xl text-sb-green-dark mb-10 uppercase tracking-tight leading-tight">
            Prêt à certifier votre excellence ?
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

export default OfferIso;
