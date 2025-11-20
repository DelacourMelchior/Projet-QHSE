
import React from 'react';
import Section from '../components/Section';
import { VALUES, SERVICES } from '../constants';
import { Page } from '../types';
import { ArrowRight } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  // Take only the first 3 services for the home page preview
  const previewServices = SERVICES.slice(0, 3);

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-sb-green-dark overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/id/6/1920/1080" 
            alt="Bureau de travail organisé" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-sb-green-dark/90"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center pt-20">
          <div className="space-y-10">
            <div className="inline-block border-b border-sb-beige/30 pb-2">
               <h2 className="text-sb-beige font-serif italic tracking-wider">Maison Delacour</h2>
            </div>
            <h1 className="font-serif text-5xl md:text-7xl text-sb-cream leading-tight drop-shadow-lg">
              Votre performance commence par une <span className="italic text-sb-beige">qualité</span> maîtrisée.
            </h1>
            <p className="text-xl text-sb-green-light leading-relaxed max-w-lg font-light drop-shadow-md">
              Conseil et excellence en management de la qualité. Audits ciblés et accompagnement ISO 9001 pour transformer votre organisation.
            </p>
            <button 
              onClick={() => onNavigate(Page.CONTACT)}
              className="inline-flex items-center px-10 py-5 bg-sb-beige text-sb-green-dark font-bold uppercase tracking-widest hover:bg-white transition-all duration-300 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Planifier un diagnostic
            </button>
          </div>
        </div>
      </section>

      {/* Storytelling Intro */}
      <Section bg="cream" className="text-center max-w-4xl mx-auto">
        <h2 className="font-serif text-3xl md:text-5xl mb-8 text-sb-green-dark leading-tight">
          Un engagement profond pour <br/>le détail et l'exigence.
        </h2>
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-light">
          La Maison Delacour analyse chaque processus de votre entreprise pour en révéler le potentiel. 
          La qualité n'est pas une option, c'est la fondation de votre pérennité et de votre excellence opérationnelle.
        </p>
      </Section>

      {/* Values - Soft cards instead of bordered boxes */}
      <Section bg="green">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 text-center md:text-left">
          {VALUES.map((value, index) => (
            <div key={index} className="space-y-6 p-8 bg-white/5 rounded-3xl hover:bg-white/10 transition-colors duration-300 backdrop-blur-sm shadow-xl shadow-black/20">
              <div className="w-14 h-14 bg-sb-beige/10 rounded-2xl flex items-center justify-center mx-auto md:mx-0 text-sb-beige shadow-inner">
                 <value.icon className="w-7 h-7" />
              </div>
              <h3 className="font-serif text-2xl text-sb-cream">{value.title}</h3>
              <p className="text-sb-green-light leading-relaxed font-light opacity-90">
                {value.text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Visual Break - Rounded container */}
      <section className="py-16 bg-sb-cream">
        <div className="container mx-auto px-6">
            <div className="relative h-[60vh] rounded-3xl overflow-hidden shadow-2xl">
                <img 
                src="https://picsum.photos/id/3/1600/900" 
                alt="Travail d'équipe" 
                className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-6">
                <div className="bg-sb-cream/95 backdrop-blur-md p-10 md:p-16 max-w-2xl text-center shadow-2xl shadow-black/20 rounded-3xl transform transition-transform hover:scale-105 duration-500 border border-white/50">
                    <h3 className="font-serif text-3xl md:text-4xl text-sb-green-dark mb-6">Une démarche qui vous valorise</h3>
                    <p className="mb-8 text-gray-600 text-lg">
                    La certification n'est pas qu'un papier. C'est la preuve de votre engagement envers vos clients.
                    </p>
                    <button 
                    onClick={() => onNavigate(Page.SERVICES)}
                    className="border-2 border-sb-green-dark text-sb-green-dark px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-sb-green-dark hover:text-white transition-colors rounded-full shadow-lg hover:shadow-xl"
                    >
                    Découvrir nos offres
                    </button>
                </div>
                </div>
            </div>
        </div>
      </section>

      {/* Services Preview - Rounded cards */}
      <Section bg="beige">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
             <div>
                <h2 className="font-serif text-4xl text-sb-green-dark mb-2">Nos Offres Phares</h2>
                <p className="text-gray-600 font-light">Un aperçu de notre catalogue de prestations</p>
             </div>
             <button onClick={() => onNavigate(Page.SERVICES)} className="hidden md:flex items-center text-sb-green-dark font-bold uppercase tracking-widest text-xs hover:text-sb-green-light transition-colors mt-4 md:mt-0">
                Voir toutes les prestations <ArrowRight size={14} className="ml-2" />
             </button>
        </div>
       
        <div className="grid md:grid-cols-3 gap-8">
          {previewServices.map((service) => (
            <div key={service.id} className="bg-sb-cream p-2 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 group transform hover:-translate-y-2">
              <div className="h-56 mb-6 overflow-hidden rounded-2xl shadow-inner">
                 <img src={service.image} alt={service.title} className="w-full h-full object-cover transform scale-125 group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="px-6 pb-8">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-sb-green-light">{service.subtitle}</span>
                </div>
                <h4 className="font-serif text-2xl font-bold text-sb-green-dark mb-3 leading-tight">{service.title}</h4>
                <p className="text-gray-600 mb-8 line-clamp-3 font-light leading-relaxed">{service.description}</p>
                <button 
                    onClick={() => onNavigate(Page.SERVICES)}
                    className="text-sb-green-dark font-bold uppercase tracking-wider text-xs flex items-center group-hover:text-sb-green-light transition-colors"
                >
                    En savoir plus <ArrowRight size={14} className="ml-2" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center md:hidden">
            <button onClick={() => onNavigate(Page.SERVICES)} className="inline-flex items-center text-sb-green-dark font-bold uppercase tracking-widest text-xs hover:text-sb-green-light transition-colors">
                Voir toutes les prestations <ArrowRight size={14} className="ml-2" />
             </button>
        </div>
      </Section>
    </>
  );
};

export default Home;
