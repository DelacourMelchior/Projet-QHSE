import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Plane, Target, ArrowRight, Zap, ShieldCheck, BarChart3, ChevronRight, Activity, ChevronLeft, LayoutDashboard, Microscope, Layers } from 'lucide-react';
import Section from '../components/Section';
import { Page } from '../types';

interface AboutProps {
  onNavigate: (page: Page) => void;
}

const About: React.FC<AboutProps> = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const steps = [
    {
      id: 0,
      label: "L'AUTORITÉ",
      title: "M. DELACOUR",
      subtitle: "L'EXIGENCE DES MILIEUX CRITIQUES",
      content: (
        <div className="grid lg:grid-cols-2 gap-12 items-center h-full">
          <div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white leading-tight uppercase mb-8">
              OÙ L'ERREUR N'EST PAS UNE OPTION.<br/>
              <span className="text-sb-beige italic">C'EST UNE CRISE MAJEURE.</span>
            </h2>
            <p className="text-xl text-white/70 font-light leading-relaxed mb-8">
              J'ai construit mon expertise au cœur de la <span className="font-medium text-white">Sûreté Aéroportuaire</span>, de l'<span className="font-medium text-white">Industrie Aéronautique</span> et de la <span className="font-medium text-white">Mécanique de Précision</span>.
            </p>
            <div className="space-y-4">
              {[
                "Tolérance zéro sur la défaillance",
                "Ingénierie de la fiabilité totale",
                "Gestion de crise et anticipation"
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 flex-shrink-0 mt-1.5 rounded-full bg-sb-beige" />
                  <p className="text-white font-medium tracking-wide uppercase text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1C2B29] p-10 rounded-2xl border border-white/5 shadow-2xl relative">
            <Plane size={48} className="text-sb-beige mb-6 opacity-30" />
            <p className="text-2xl font-serif text-white italic leading-relaxed">
              "Dans ces environnements, un processus défaillant ne coûte pas quelques points de marge. Il coûte des vies ou des millions. J'y ai appris à construire des systèmes infaillibles."
            </p>
          </div>
        </div>
      )
    },
    {
      id: 1,
      label: "LA VALIDATION",
      title: "LE SOCLE ACADÉMIQUE",
      subtitle: "LA GARANTIE TECHNIQUE",
      content: (
        <div className="grid lg:grid-cols-2 gap-12 items-center h-full">
          <div className="bg-[#1C2B29] p-10 rounded-2xl border border-white/5 shadow-2xl relative flex flex-col justify-center">
            <GraduationCap size={48} className="text-sb-beige mb-6 opacity-30" />
            <h3 className="text-3xl font-serif text-white mb-6 uppercase">Master 2 QHSE</h3>
            <p className="text-xl text-white/80 font-light leading-relaxed">
              & Excellence Opérationnelle
            </p>
            <div className="w-12 h-1 bg-sb-beige/30 mt-8"></div>
          </div>
          <div>
            <h2 className="font-serif text-3xl md:text-5xl text-white leading-tight uppercase mb-8">
              L'APPROCHE STRUCTURÉE DE<br/>
              <span className="text-sb-beige italic">L'INGÉNIERIE DES ORGANISATIONS</span>
            </h2>
            <p className="text-xl text-white/70 font-light leading-relaxed mb-8">
              L'expérience terrain donne l'intuition, mais elle ne suffit pas pour sécuriser une croissance. C'est pourquoi mon approche n'est pas uniquement empirique : elle s'appuie sur un bagage académique de haut niveau pour garantir une maîtrise totale de l'architecture de vos processus.
            </p>
            <div className="space-y-4">
              {[
                "Méthodologie d'analyse rigoureuse",
                "Outils avancés de l'Excellence Opérationnelle",
                "Architecture des Systèmes de Management"
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 flex-shrink-0 mt-1.5 rounded-full bg-sb-beige" />
                  <p className="text-white font-medium tracking-wide uppercase text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      label: "LA MISSION",
      title: "LE CHOIX STRATÉGIQUE",
      subtitle: "DE L'AÉRONAUTIQUE À L'ENTREPRENEURIAT",
      content: (
        <div className="grid lg:grid-cols-2 gap-12 items-center h-full">
          <div>
            <h2 className="font-serif text-3xl md:text-5xl text-white leading-tight uppercase mb-6">
              JE VOULAIS MON INDÉPENDANCE.<br/>
              <span className="text-sb-beige italic">ET J'AI CIBLÉ L'URGENCE.</span>
            </h2>
            <p className="text-xl text-white/70 font-light leading-relaxed mb-6">
              Comme vous, j'ai la fibre entrepreneuriale. Plutôt que d'être un rouage dans un grand groupe qui a déjà des armées de qualiticiens pour faire de la paperasse, j'ai cherché où mon expertise aurait un impact vital. La réponse était évidente : les PME. Pourquoi ?
            </p>
            <div className="space-y-4">
              {[
                "Elles ont l'agilité et le savoir-faire, mais pourraient manquer de 'colonne vertébrale'",
                "Sans structure, leur croissance risquerait de se transformer en chaos opérationnel",
                "Le dirigeant pourrait finir par s'épuiser et perdre la liberté qu'il cherchait"
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 flex-shrink-0 mt-1.5 rounded-full bg-sb-beige" />
                  <p className="text-white font-medium tracking-wide uppercase text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1C2B29] p-10 rounded-2xl border border-white/5 shadow-2xl relative">
            <Target size={48} className="text-sb-beige mb-6 opacity-30" />
            <p className="text-2xl font-serif text-white italic leading-relaxed">
              "Mon objectif : adapter les méthodes de haute performance des grands groupes, enlever toute la lourdeur bureaucratique, et les implanter chez vous pour vous rendre la maîtrise totale de votre entreprise."
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      label: "TRANSITION",
      title: "PASSONS À VOTRE RÉALITÉ",
      subtitle: "LE DIAGNOSTIC",
      content: (
        <div className="flex flex-col items-center justify-center text-center h-full">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-2xl"
          >
            <p className="text-2xl md:text-3xl font-serif text-white italic mb-12 leading-relaxed">
              "Maintenant que vous savez d'où je viens et pourquoi je suis là, regardons concrètement où se trouvent vos opportunités d'optimisation."
            </p>
            <button 
              onClick={() => onNavigate(Page.DIAGNOSTIC)}
              className="group relative inline-flex items-center justify-center px-10 py-6 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-widest text-sm transition-all duration-300 hover:bg-white rounded-[2px] shadow-2xl"
            >
              LANCER LE DIAGNOSTIC <ArrowRight size={20} className="ml-3 group-hover:translate-x-2 transition-transform" />
            </button>
            <div className="mt-20">
              <p className="font-serif text-3xl text-white italic">M. DELACOUR</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-sb-beige/40 mt-4">Fondateur du Cabinet Delacour</p>
            </div>
          </motion.div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };
  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="h-screen w-full bg-sb-green-dark text-white overflow-hidden flex flex-col relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sb-beige rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-sb-beige rounded-full blur-[100px] opacity-10"></div>
      </div>

      {/* Header Nav / Progress */}
      <div className="flex-none container mx-auto px-4 lg:px-8 pt-4 lg:pt-8 pb-2 lg:pb-4 flex justify-between items-center relative z-10">
        <div className="flex flex-wrap items-center gap-x-4 lg:gap-x-8 gap-y-2 lg:gap-y-4 max-w-full lg:max-w-[70%]">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentStep ? 1 : -1);
                setCurrentStep(i);
              }}
              className={`group flex flex-col gap-2 text-left transition-all duration-500 ${currentStep === i ? 'opacity-100' : 'opacity-30 hover:opacity-50'}`}
            >
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase">{step.label}</p>
              <div className={`h-0.5 transition-all duration-500 ${currentStep === i ? 'bg-sb-beige w-12' : 'bg-white/20 w-8 group-hover:w-10'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] container mx-auto px-4 lg:px-8 relative z-10 flex flex-col justify-start lg:justify-center py-4 lg:py-2">
        <div className="max-w-6xl w-full mx-auto my-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction * 40, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: direction * -40, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <header className="mb-10">
                <span className="text-sb-beige text-[10px] font-bold uppercase tracking-[0.4em] mb-4 block">
                  {steps[currentStep].subtitle}
                </span>
                <h1 className="font-serif text-xl md:text-2xl text-white/40 uppercase tracking-[0.5em]">
                  {steps[currentStep].title}
                </h1>
              </header>

              <div className="min-h-[40vh]">
                {steps[currentStep].content}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation Controls */}
      <div className="flex-none container mx-auto px-4 lg:px-8 pb-4 lg:pb-8 flex justify-between items-end relative z-10">
        <div className="flex gap-4">
          <button 
            disabled={currentStep === 0}
            onClick={prevStep}
            className={`p-4 rounded-full border border-white/10 transition-all ${currentStep === 0 ? 'opacity-10 cursor-not-allowed' : 'hover:bg-white/5 hover:border-white/30 cursor-pointer'}`}
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            disabled={currentStep === steps.length - 1}
            onClick={nextStep}
            className={`p-4 rounded-full border border-white/10 transition-all ${currentStep === steps.length - 1 ? 'opacity-10 cursor-not-allowed' : 'hover:bg-white/5 hover:border-white/30 text-sb-beige cursor-pointer'}`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
        
        <div className="flex flex-col items-end">
           <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-sb-beige mb-2">Slide</p>
           <p className="text-4xl font-serif leading-none">0{currentStep + 1}<span className="text-white/20"> / 0{steps.length}</span></p>
        </div>
      </div>
    </div>
  );
};

export default About;
