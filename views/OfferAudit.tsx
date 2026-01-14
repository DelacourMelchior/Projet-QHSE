import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { AlertOctagon, Timer, Search, Siren, FileCheck, ArrowRight, CheckCircle } from 'lucide-react';

interface OfferAuditProps {
  onNavigate: (page: Page) => void;
}

const OfferAudit: React.FC<OfferAuditProps> = ({ onNavigate }) => {
  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center bg-sb-green-dark overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://image.pollinations.ai/prompt/macro%20photography%20of%20a%20stopwatch%20on%20dark%20wood%20desk%20cinematic%20lighting%20selective%20focus%20high%20contrast%20dark%20green%20atmosphere?nologo=true" 
            alt="Intensité Audit" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-sb-green-dark/90 mix-blend-multiply"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center pt-32 pb-20">
            <span className="inline-block font-sans text-[10px] md:text-xs font-bold tracking-math-wide uppercase text-sb-beige mb-6 border border-sb-beige/30 px-3 py-2 rounded-[2px]">
                CABINET DELACOUR — AUDIT BLANC ISO 9001
            </span>
            
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 89px)' }} className="font-serif text-white leading-[1.1] tracking-math-tight mb-8 uppercase">
              LE CRASH-TEST<br/>NORMATIF
            </h1>
            
            <div className="w-16 h-px bg-sb-beige mx-auto mb-10"></div>
            
            <p className="text-base md:text-body text-white/90 leading-phi max-w-2xl mx-auto font-light mb-12 font-sans px-4">
              Éliminez le risque de non-conformité majeure.<br/>
              <span className="opacity-70">Un audit en conditions réelles pour garantir votre succès le jour J.</span>
            </p>
            
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-10 py-5 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-xs transition-all duration-300 hover:bg-white rounded-[2px]"
            >
                Planifier l'audit blanc
            </button>
        </div>
      </section>

      {/* 2. SECTION CONSTAT (TENSION) */}
      <Section bg="cream" className="py-20 md:py-fib-144">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <h2 style={{ fontSize: 'clamp(24px, 5vw, 55px)' }} className="font-serif text-sb-green-dark uppercase tracking-math-tight mb-8 leading-tight">
                    L'Épreuve du Réel
                </h2>
                <div className="relative p-6 md:p-10 bg-white border-l-4 border-sb-green-dark shadow-sm rounded-[2px]">
                    <p className="font-serif text-lg md:text-3xl italic text-sb-green-dark leading-normal">
                        "L'échec d'une certification n'est pas un problème de qualité, c'est un problème de préparation."
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-16 px-2 md:px-0">
                {/* Pain Point 1 */}
                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <AlertOctagon size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">L'Angle Mort</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Ces détails normatifs que vous ne voyez plus et qui deviendront des non-conformités bloquantes.
                    </p>
                </div>

                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <Timer size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">Le Facteur Stress</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Des équipes qui perdent leurs moyens face à l'auditeur et ne savent plus valoriser le travail accompli.
                    </p>
                </div>

                <div className="bg-white p-6 md:p-8 border border-gray-200 rounded-[2px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6">
                        <Siren size={20} />
                    </div>
                    <h3 className="font-serif text-lg md:text-xl font-bold text-sb-green-dark mb-4">L'Urgence Finale</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Découvrir les écarts trop tard pour les corriger. Le risque de devoir repousser la certification.
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
            <p className="text-sb-beige font-sans uppercase tracking-math-wide text-[10px] md:text-sm">Simuler pour Réussir</p>
        </div>

        <div className="relative max-w-4xl mx-auto px-4">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-sb-beige/20 -translate-x-1/2"></div>

            <div className="space-y-16 md:space-y-20">
                {/* Step 1 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Immersion Totale</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Simulation d'audit en conditions réelles (2 à 5 jours selon périmètre). Nous adoptons la posture de l'auditeur de certification.</p>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <Search size={12} className="text-sb-beige" />
                    </div>
                    <div className="md:w-5/12 pl-12 order-3 hidden md:block">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">01</span>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                     <div className="md:w-5/12 text-right pr-12 hidden md:block order-1">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">02</span>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <AlertOctagon size={12} className="text-sb-beige" />
                    </div>
                    <div className="md:w-5/12 text-left pl-12 order-2 md:order-3">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Cartographie des Écarts</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Identification factuelle de tous les écarts normatifs. Priorisation immédiate des points critiques (Non-Conformités Majeures).</p>
                    </div>
                </div>

                 {/* Step 3 */}
                 <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Plan d'Action Commando</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Livraison immédiate des actions correctives à mener avant l'audit officiel. Accompagnement sur les dossiers sensibles.</p>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <FileCheck size={12} className="text-sb-beige" />
                    </div>
                    <div className="md:w-5/12 pl-12 order-3 hidden md:block">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">03</span>
                    </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                     <div className="md:w-5/12 text-right pr-12 hidden md:block order-1">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">04</span>
                    </div>
                    <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-6 h-6 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <CheckCircle size={12} className="text-sb-beige" />
                    </div>
                    <div className="md:w-5/12 text-left pl-12 order-2 md:order-3">
                        <h3 className="font-serif text-lg md:text-2xl text-sb-beige mb-2">Postures & Coaching</h3>
                        <p className="text-white/70 font-light leading-phi text-xs md:text-sm">Entraînement des pilotes de processus à la réponse et à la démonstration d'efficacité pour rassurer l'auditeur.</p>
                    </div>
                </div>
            </div>
        </div>
      </Section>

      {/* 4. FINAL CTA */}
      <Section bg="cream" className="py-24 text-center border-t border-sb-green-dark/10 px-4">
        <h2 className="font-serif text-2xl md:text-4xl text-sb-green-dark mb-10 uppercase tracking-tight leading-tight">
            Sécurisez votre certification
        </h2>
        <button 
            onClick={() => onNavigate(Page.CONTACT)}
            className="group inline-flex items-center justify-center px-10 py-5 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] md:text-sm rounded-[2px] transition-all shadow-lg"
        >
            DEMANDER UN DEVIS D'AUDIT BLANC <ArrowRight size={16} className="ml-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </Section>
    </>
  );
};

export default OfferAudit;
