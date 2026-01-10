
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { AlertOctagon, Timer, Search, Siren, FileCheck, ArrowRight } from 'lucide-react';

interface OfferAuditProps {
  onNavigate: (page: Page) => void;
}

const OfferAudit: React.FC<OfferAuditProps> = ({ onNavigate }) => {
  return (
    <>
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center bg-sb-green-dark overflow-hidden">
        {/* Background - Precision/Focus Aesthetic */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://image.pollinations.ai/prompt/macro%20photography%20magnifying%20glass%20lens%20focus%20on%20document%20details%20dark%20moody%20lighting%20oxford%20green%20tones?nologo=true" 
            alt="Inspection de précision" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-sb-green-dark/85 mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sb-green-dark to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10 text-center pt-32 pb-20">
            <span className="inline-block font-sans text-xs font-bold tracking-math-wide uppercase text-sb-beige mb-6 border border-sb-beige/30 px-4 py-2 rounded-[2px]">
                Cabinet Delacour — SÉCURISATION & CONFORMITÉ NORMATIVE
            </span>
            
            <h1 className="font-serif text-5xl md:text-hero text-white leading-[1.1] tracking-math-tight mb-8 uppercase">
              Audit Blanc ISO 9001 :<br/>Le Crash-Test
            </h1>
            
            <div className="w-24 h-px bg-sb-beige mx-auto mb-10"></div>
            
            <p className="text-body text-white/90 leading-phi max-w-2xl mx-auto font-light mb-12 font-sans">
              Votre répétition générale en conditions réelles.<br/>
              <span className="opacity-70">Identifiez et corrigez vos écarts critiques avant l'arrivée de l'auditeur certificateur.</span>
            </p>
            
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-12 py-5 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-math-wide text-xs overflow-hidden transition-all duration-300 hover:bg-white rounded-[2px]"
            >
                Planifier mon audit blanc
            </button>
        </div>
      </section>

      {/* 2. SECTION CONSTAT (TENSION) */}
      <Section bg="cream" className="py-fib-144">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="font-serif text-title text-sb-green-dark uppercase tracking-math-tight mb-8">L'Angle Mort</h2>
                <div className="relative p-10 bg-white border-l-4 border-sb-green-dark shadow-sm rounded-[2px]">
                    <p className="font-serif text-2xl md:text-3xl italic text-sb-green-dark leading-normal">
                        "Une non-conformité majeure découverte le jour de l'examen n'est pas une erreur technique, c'est un échec stratégique coûteux."
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-16">
                {/* Pain Point 1 */}
                <div className="bg-white p-8 border border-gray-200 hover:border-sb-green-dark/30 transition-all duration-300 group rounded-[2px]">
                    <div className="w-12 h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6 group-hover:bg-sb-green-dark group-hover:text-sb-beige transition-colors">
                        <Timer size={24} />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-sb-green-dark mb-4">Report de Certification</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        3 à 6 mois de retard sur votre calendrier commercial. Un délai qui peut vous coûter des appels d'offres stratégiques.
                    </p>
                </div>

                {/* Pain Point 2 */}
                <div className="bg-white p-8 border border-gray-200 hover:border-sb-green-dark/30 transition-all duration-300 group rounded-[2px]">
                    <div className="w-12 h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6 group-hover:bg-sb-green-dark group-hover:text-sb-beige transition-colors">
                        <AlertOctagon size={24} />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-sb-green-dark mb-4">Coût d'Image</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Perte de crédibilité face aux équipes mobilisées et à la Direction. L'échec démotive et fragilise la dynamique qualité.
                    </p>
                </div>

                {/* Pain Point 3 */}
                <div className="bg-white p-8 border border-gray-200 hover:border-sb-green-dark/30 transition-all duration-300 group rounded-[2px]">
                    <div className="w-12 h-12 bg-sb-cream text-sb-green-dark flex items-center justify-center rounded-[2px] mb-6 group-hover:bg-sb-green-dark group-hover:text-sb-beige transition-colors">
                        <Siren size={24} />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-sb-green-dark mb-4">Stress Organisationnel</h3>
                    <p className="text-sb-green-dark/70 font-light leading-phi text-sm">
                        Subir l'audit officiel au lieu de le maîtriser. L'incertitude génère une tension inutile qui nuit à la performance le jour J.
                    </p>
                </div>
            </div>
        </div>
      </Section>

      {/* 3. SECTION MÉTHODOLOGIE (TIMELINE) */}
      <Section bg="green" className="py-fib-144 relative border-t-4 border-sb-beige">
        <div className="text-center mb-24">
            <h2 className="font-serif text-title text-white uppercase tracking-math-tight mb-4">Méthodologie</h2>
            <p className="text-sb-beige font-sans uppercase tracking-math-wide text-sm">Protocole de Validation</p>
        </div>

        <div className="relative max-w-4xl mx-auto">
            {/* Central Line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-sb-beige/20 -translate-x-1/2"></div>

            <div className="space-y-20">
                {/* Phase 1 */}
                <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-2xl text-sb-beige mb-2">Phase 1 : La Revue Documentaire</h3>
                        <p className="text-sb-beige/60 text-xs font-bold uppercase tracking-wide mb-2">Off-Site</p>
                        <p className="text-white/70 font-light leading-phi text-sm">Contrôle de Légalité et vérification exhaustive de votre Information Documentée pour s'assurer que les fondations sont solides avant l'épreuve.</p>
                    </div>
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <Search size={14} className="text-sb-beige" />
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
                        <h3 className="font-serif text-2xl text-sb-beige mb-2">Phase 2 : La Simulation Officielle</h3>
                        <p className="text-sb-beige/60 text-xs font-bold uppercase tracking-wide mb-2">Jour J</p>
                        <p className="text-white/70 font-light leading-phi text-sm">Mise en Situation et stress-test de vos équipes face aux questions pièges en conditions réelles d'audit de certification.</p>
                    </div>
                </div>

                 {/* Phase 3 */}
                 <div className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                    <div className="md:w-5/12 text-left md:text-right pl-12 md:pl-0 md:pr-12 order-2 md:order-1">
                        <h3 className="font-serif text-2xl text-sb-beige mb-2">Phase 3 : Le Verdict & Plan Correctif</h3>
                        <p className="text-sb-beige/60 text-xs font-bold uppercase tracking-wide mb-2">Restitution</p>
                        <p className="text-white/70 font-light leading-phi text-sm">Plan de Bataille, rapport d'écarts (Majeurs/Mineurs) et feuille de route des correctifs immédiats pour sécuriser le certificat.</p>
                    </div>
                    <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-8 h-8 bg-sb-green-dark border-2 border-sb-beige rounded-full flex items-center justify-center z-10 order-1 md:order-2">
                        <FileCheck size={14} className="text-sb-beige" />
                    </div>
                    <div className="md:w-5/12 pl-12 md:pl-12 order-3">
                         <span className="text-sb-beige/20 font-bold text-6xl font-serif">03</span>
                    </div>
                </div>
            </div>
        </div>
      </Section>

      {/* 4. FINAL CTA */}
      <Section bg="cream" className="py-24 text-center border-t border-sb-green-dark/10">
        <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark mb-10 uppercase tracking-tight">
            Prêt pour votre répétition générale ?
        </h2>
        <button 
            onClick={() => onNavigate(Page.CONTACT)}
            className="group inline-flex items-center justify-center px-10 py-5 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-math-wide text-sm rounded-[2px] hover:bg-sb-green-dark hover:text-white transition-all shadow-lg"
        >
            RÉSERVER MON AUDIT BLANC <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </Section>
    </>
  );
};

export default OfferAudit;
