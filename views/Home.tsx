
import React from 'react';
import section from '../components/section';
import { VALUES, SERVICES } from '../constants';
import { Page } from '../types';
import { ArrowRight, Handshake, Settings, Compass, Calendar, AlertTriangle, Zap, Target, FileText, CheckCircle2, Check } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const getShape = (index: number) => {
      if (index === 0) {
          return (
             <svg width="32" height="32" viewBox="0 0 40 40" fill="none" className="text-sb-beige mb-6">
                <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
                <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
                <circle cx="20" cy="20" r="3" fill="currentColor"/>
             </svg>
          );
      } else if (index === 1) {
          return (
             <svg width="32" height="32" viewBox="0 0 40 40" fill="none" className="text-sb-beige mb-6">
                <path d="M20 2L35.5885 11V29L20 38L4.41154 29V11L20 2Z" stroke="currentColor" strokeWidth="2"/>
             </svg>
          );
      } else {
          return (
             <svg width="32" height="32" viewBox="0 0 40 40" fill="none" className="text-sb-beige mb-6">
                <line x1="2" y1="38" x2="38" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                <rect x="7" y="24" width="6" height="10" stroke="currentColor" strokeWidth="2" />
                <rect x="17" y="16" width="6" height="18" stroke="currentColor" strokeWidth="2" />
                <rect x="27" y="6" width="6" height="28" stroke="currentColor" strokeWidth="2" />
             </svg>
          );
      }
  };

  return (
    <>
      {/* Hero section */}
      <section className="relative min-h-screen flex items-center justify-center bg-sb-green-dark overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://image.pollinations.ai/prompt/luxury%20executive%20office%20desk%20dark%20green%20aesthetic%20cinematic%20lighting%20golden%20ratio%20symmetry%20intricate%20details%20photorealistic%208k%20oxford%20green%20wall?nologo=true" 
            alt="Bureau de direction" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-sb-green-dark/80 mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sb-green-dark to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center justify-center text-center pt-48 md:pt-64 pb-20">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-hero text-white leading-[1.1] tracking-math-tight mb-12 drop-shadow-2xl uppercase font-normal">
              L'ORDRE PRÉCÈDE<br/>
              <span className="text-white">LA CROISSANCE</span>
            </h1>
            
            <p className="text-lg md:text-body text-white/90 leading-loose max-w-2xl font-medium mb-0 tracking-wide font-sans">
              Faites de la rigueur votre premier avantage concurrentiel.<br/>
              <span className="block mt-4 opacity-90 text-xl font-normal">Audit, Structuration & Performance. Nous convertissons vos contraintes opérationnelles en leviers de rentabilité.</span>
            </p>
            
            <div className="mt-24 w-full flex justify-center">
                <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group relative inline-flex items-center justify-center px-10 md:px-14 py-5 md:py-6 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-math-wide text-xs md:text-sm transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(240,234,214,0.3)] rounded-[2px]"
                >
                    <span className="relative z-10">PARLER DE VOS ENJEUX</span>
                </button>
            </div>
        </div>
      </section>

      {/* DIAGNOSTIC: LE LEVIER DE RENTABILITÉ */}
      <section className="bg-[#F8F9FA] py-fib-144 text-center border-b border-sb-green-dark/5">
        <div className="container mx-auto px-6">
            <h2 className="font-serif text-3xl md:text-[45px] font-bold text-sb-green-dark uppercase leading-tight tracking-math-tight mb-8">
                LE LEVIER DE RENTABILITÉ
            </h2>
            <div className="w-20 h-px bg-sb-green-dark/20 mx-auto mb-10"></div>
            <p className="text-lg md:text-body text-sb-green-dark font-normal leading-loose max-w-[800px] mx-auto font-sans mb-16">
                Une structure optimisée est votre premier gisement de profit net. Pour savoir si votre organisation actuelle est réellement configurée pour maximiser vos gains, posez-vous ces questions :
            </p>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
                <div className="bg-white p-8 md:p-10 border border-sb-green-dark/5 rounded-[2px] shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="mb-8 flex justify-center">
                        <Handshake size={48} strokeWidth={1} className="text-sb-green-dark group-hover:text-[#C5A065] transition-colors duration-300" />
                    </div>
                    <h3 className="font-serif font-bold uppercase tracking-wide text-lg mb-6 text-sb-green-dark">EXIGENCE CLIENTS</h3>
                    <p className="text-sb-green-dark/80 leading-loose font-medium font-sans text-left md:text-center text-sm md:text-base">
                        Votre structure actuelle est-elle capable de rassurer les donneurs d’ordres exigeants sans que vous n'ayez à baisser vos prix ?
                    </p>
                </div>

                <div className="bg-white p-8 md:p-10 border border-sb-green-dark/5 rounded-[2px] shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="mb-8 flex justify-center">
                        <Settings size={48} strokeWidth={1} className="text-sb-green-dark group-hover:text-[#C5A065] transition-colors duration-300" />
                    </div>
                    <h3 className="font-serif font-bold uppercase tracking-wide text-lg mb-6 text-sb-green-dark">CHARGE DE TRAVAIL</h3>
                    <p className="text-sb-green-dark/80 leading-loose font-medium font-sans text-left md:text-center text-sm md:text-base">
                        Votre structure est-elle conçue pour que la croissance augmente vos profits au lieu de simplement multiplier vos problèmes ?
                    </p>
                </div>

                <div className="bg-white p-8 md:p-10 border border-sb-green-dark/5 rounded-[2px] shadow-sm hover:shadow-lg transition-all duration-300 group">
                    <div className="mb-8 flex justify-center">
                        <Compass size={48} strokeWidth={1} className="text-sb-green-dark group-hover:text-[#C5A065] transition-colors duration-300" />
                    </div>
                    <h3 className="font-serif font-bold uppercase tracking-wide text-lg mb-6 text-sb-green-dark">PILOTAGE</h3>
                    <p className="text-sb-green-dark/80 leading-loose font-medium font-sans text-left md:text-center text-sm md:text-base">
                        Pilotez-vous avec une vision chirurgicale, ou naviguez-vous à vue avec des chiffres qui ont deux semaines de retard ?
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto border-t border-sb-green-dark/10 pt-16">
                <p className="font-serif text-2xl md:text-3xl text-sb-green-dark leading-tight mb-12 italic">
                    Un seul <span className="font-bold text-[#8A1C1C]">NON</span> confirme que votre organisation actuelle bride vos profits.
                </p>
                <button 
                    onClick={() => onNavigate(Page.CONTACT)}
                    className="group relative inline-flex items-center justify-center px-8 md:px-10 py-5 bg-[#C5A065] text-[#0A1F1C] font-bold uppercase tracking-math-wide text-xs md:text-sm transition-all duration-300 hover:bg-white hover:text-[#C5A065] shadow-lg hover:shadow-xl rounded-[2px] border border-transparent hover:border-[#C5A065]"
                >
                    DÉVERROUILLER MON POTENTIEL DE GAIN <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      </section>

      {/* METHODOLOGY - LES 3 PILIERS */}
      <section className="bg-sb-green-dark py-fib-144">
        <div className="container mx-auto px-6">
            <div className="text-center mb-24 max-w-4xl mx-auto">
                <h2 className="font-serif text-3xl md:text-[45px] text-white uppercase tracking-math-tight mb-6">
                    LES 3 PILIERS DE VOTRE PERFORMANCE
                </h2>
                <div className="w-16 h-px bg-sb-beige mx-auto mb-8"></div>
                <p className="text-lg md:text-body text-white/90 font-medium leading-loose font-sans uppercase tracking-widest">
                    La performance n'est pas un hasard, c'est une architecture.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 xl:gap-12 items-stretch">
            {VALUES.map((value: any, index) => (
                <div key={index} className="group flex flex-col relative bg-[#1C2B29] border-t-2 border-sb-beige/30 p-8 lg:p-10 xl:p-12 h-full hover:bg-[#233533] transition-all duration-500 rounded-[2px] shadow-2xl overflow-hidden">
                    {/* Header: Icon & Title */}
                    <div className="mb-10">
                        {getShape(index)}
                        <h3 className="font-serif text-2xl xl:text-3xl text-white tracking-wide uppercase font-bold leading-tight border-b border-white/10 pb-6">
                            {value.title}
                        </h3>
                    </div>

                    {/* Body: Description & Impacts */}
                    <div className="flex-grow flex flex-col">
                        <p className="font-sans text-sm xl:text-base text-white/90 leading-relaxed font-medium mb-10 italic">
                            {value.description}
                        </p>
                        
                        <div className="space-y-6 mb-12">
                            {value.impacts.map((impact: any, i: number) => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#C5A065] mt-2 flex-shrink-0" />
                                    <div>
                                        <p className="text-white font-bold text-xs uppercase tracking-wider mb-1">
                                            {impact.label}
                                        </p>
                                        <p className="text-white/60 text-xs leading-relaxed font-light">
                                            {impact.detail}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer: Financial Verdict & CTA */}
                    <div className="mt-auto pt-10 border-t border-white/10">
                        <div className="mb-10">
                            <p className={`font-serif text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight uppercase mb-2 leading-none ${value.color || 'text-[#10B981]'}`}>
                                {value.verdictTitle}
                            </p>
                            <p className="font-serif text-[10px] xl:text-xs text-[#C5A065] mb-4 font-bold uppercase tracking-widest leading-relaxed">
                                {value.verdictSubtitle}
                            </p>
                            <p className="font-sans text-[10px] text-white/30 uppercase tracking-widest leading-relaxed max-w-[200px]">
                                {value.verdictText}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => onNavigate(value.link)}
                            className="w-full text-center py-5 border border-[#C5A065]/50 text-[#C5A065] font-bold uppercase tracking-math-wide text-[10px] md:text-xs transition-all duration-300 rounded-[2px] hover:bg-[#C5A065] hover:text-sb-green-dark hover:border-[#C5A065]"
                        >
                            {value.buttonText}
                        </button>
                    </div>
                </div>
            ))}
            </div>
        </div>
      </section>

      {/* Services Preview */}
      <section bg="cream" className="pb-fib-144 border-t border-sb-green-dark/10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20">
             <div>
                <h2 className="font-serif text-3xl md:text-title text-sb-green-dark mb-4 tracking-math-tight">NOS PRESTATIONS</h2>
                <p className="text-sb-green-dark font-bold uppercase tracking-math-wide text-xs md:text-sm opacity-60">Architecture de la performance</p>
             </div>
             <button onClick={() => onNavigate(Page.SERVICES)} className="hidden md:flex items-center text-sb-green-dark font-bold uppercase tracking-math-wide text-xs hover:text-[#C5A065] transition-colors pb-2 border-b border-sb-green-dark/20 hover:border-[#C5A065]">
                Voir le catalogue complet <ArrowRight size={16} className="ml-2" />
             </button>
        </div>
       
        <div className="grid grid-cols-1 gap-12">
          {SERVICES.map((service) => (
            <div key={service.id} className="bg-white border border-sb-green-dark/10 rounded-[2px] overflow-hidden group hover:border-sb-green-dark/30 transition-all duration-300">
                <div className="grid md:grid-cols-12 gap-0">
                    <div className="md:col-span-4 p-8 md:p-10 bg-[#F7F7F4] flex flex-col justify-between border-b md:border-b-0 md:border-r border-sb-green-dark/5">
                        <div>
                             <span className="inline-block text-[10px] font-bold uppercase tracking-math-wide text-sb-green-dark border border-sb-green-dark/20 px-3 py-1 rounded-[2px] mb-6">
                                {service.subtitle}
                             </span>
                             <h4 className="font-serif text-2xl md:text-3xl font-bold text-sb-green-dark mb-6 leading-tight tracking-tight whitespace-pre-line">
                                {service.title}
                             </h4>
                             <p className="font-serif text-base text-sb-green-dark/80 italic leading-relaxed">
                                "{service.description}"
                             </p>
                        </div>
                        <div className="mt-8">
                             <button 
                                onClick={() => service.link && onNavigate(service.link)}
                                className="w-full bg-sb-green-dark text-sb-beige font-bold uppercase tracking-math-wide text-[10px] md:text-xs px-6 py-4 rounded-[2px] hover:bg-black transition-colors flex items-center justify-center"
                            >
                                EXPLORER CE MODULE <ArrowRight size={16} className="ml-2" />
                            </button>
                        </div>
                    </div>

                    <div className="md:col-span-8 p-8 md:p-10 bg-white">
                        <div className="grid sm:grid-cols-2 gap-12">
                            <div>
                                <h5 className="flex items-center gap-2 text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] mb-6 pb-2 border-b border-sb-green-dark/10">
                                    <Target size={16} className="text-[#C5A065]" /> BÉNÉFICES FINANCIERS
                                </h5>
                                <ul className="space-y-4">
                                    {service.benefits.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-sb-green-dark/80 font-medium leading-relaxed">
                                            <Check size={16} className="text-sb-green-dark mt-1 flex-shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h5 className="flex items-center gap-2 text-sb-green-dark font-bold uppercase tracking-math-wide text-[10px] mb-6 pb-2 border-b border-sb-green-dark/10">
                                    <FileText size={16} className="text-[#C5A065]" /> LIVRABLES CONCRETS
                                </h5>
                                <ul className="space-y-4">
                                    {service.deliverables.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-sb-green-dark/80 font-medium leading-relaxed">
                                            <CheckCircle2 size={16} className="text-[#C5A065] mt-1 flex-shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section bg="green" className="py-24 border-t border-sb-beige/10">
        <div className="container mx-auto px-6 text-center">
            <h2 className="font-serif text-3xl md:text-[40px] text-white uppercase tracking-math-tight mb-8">
                QUAND ALLEZ-VOUS SÉCURISER VOTRE AVENIR ?
            </h2>
            <div className="w-24 h-px bg-sb-beige mx-auto mb-20"></div>

            <div className="grid md:grid-cols-3 gap-12 md:gap-0 max-w-6xl mx-auto mb-20 items-stretch">
                <div className="flex flex-col items-center justify-start p-8 border-r-0 md:border-r border-white/10 last:border-0">
                    <div className="mb-8 text-[#C5A065]">
                        <Calendar size={40} strokeWidth={1} />
                    </div>
                    <h3 className="font-serif text-2xl text-white mb-6 uppercase tracking-wide">Dans 6 mois...</h3>
                    <p className="text-white/70 font-sans text-base font-light leading-relaxed max-w-xs mx-auto">
                        Vous constaterez que le chiffre d'affaires a monté, mais pas la marge. Vous aurez travaillé deux fois plus pour le même résultat net.
                    </p>
                </div>

                <div className="flex flex-col items-center justify-start p-8 border-r-0 md:border-r border-white/10 last:border-0">
                    <div className="mb-8 text-[#C5A065]">
                        <AlertTriangle size={40} strokeWidth={1} />
                    </div>
                    <h3 className="font-serif text-2xl text-white mb-6 uppercase tracking-wide">La semaine prochaine...</h3>
                    <p className="text-white/70 font-sans text-base font-light leading-relaxed max-w-xs mx-auto">
                        Un incident qualité critique ou un retard majeur mettra en péril votre plus gros client. Vous serez en mode 'Pompier'.
                    </p>
                </div>

                <div className="flex flex-col items-center justify-center p-10 bg-[#0A1F1C] border border-[#C5A065] rounded-[2px] relative z-10 shadow-2xl md:-my-6 md:scale-105 transform">
                    <div className="mb-8 text-[#C5A065]">
                        <Zap size={48} fill="currentColor" strokeWidth={0} />
                    </div>
                    <h3 className="font-sans font-bold uppercase tracking-widest text-xl text-[#C5A065] mb-6">DÈS MAINTENANT</h3>
                    <p className="text-white font-sans text-base font-medium leading-relaxed max-w-xs mx-auto">
                        Vous reprenez le contrôle. Nous identifions les fuites et structurons votre croissance. Vous dormez enfin l'esprit tranquille.
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center mt-20">
                 <button 
                    onClick={() => onNavigate(Page.CONTACT)}
                    className="group relative inline-flex items-center justify-center px-8 md:px-10 py-5 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-math-wide text-xs md:text-sm overflow-hidden transition-all duration-300 hover:bg-white rounded-[2px]"
                >
                    DÉMARRER LA TRANSFORMATION <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                 </button>
            </div>
        </div>
      </section>
    </>
  );
};

export default Home;
