
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { ArrowRight } from 'lucide-react';

interface MethodProps {
    onNavigate: (page: Page) => void;
}

const Method: React.FC<MethodProps> = ({ onNavigate }) => {
  return (
    <>
      {/* HERO SECTION - GRAND CONFORT & CLARITY */}
      <div className="bg-sb-green-dark text-white py-24 md:py-32 border-b-8 border-sb-beige">
        <div className="container mx-auto px-6 max-w-5xl text-center">
            
            <h1 className="font-serif text-5xl md:text-7xl mb-10 tracking-tight font-medium leading-tight text-white">
                NOTRE PROTOCOLE<br/>
                D'INTERVENTION.
            </h1>
            
            <div className="w-32 h-2 bg-[#C5A065] mx-auto mb-12"></div>

            <p className="text-2xl md:text-3xl text-white font-sans font-light leading-normal max-w-4xl mx-auto">
                Une méthodologie hybride conçue pour maximiser l'impact sans alourdir votre quotidien.
            </p>
        </div>
      </div>

      {/* MAIN CONTENT - HIGH READABILITY (WHITE BG / DARK TEXT) */}
      <Section bg="cream" className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto space-y-24">

            {/* PHASE 1 : ANALYSE PRÉPARATOIRE */}
            <div className="bg-white p-10 md:p-16 border-l-8 border-[#C5A065] shadow-sm rounded-r-[4px]">
                <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                    <div className="hidden md:flex flex-shrink-0 w-20 h-20 bg-sb-green-dark text-white items-center justify-center rounded-[4px]">
                        <span className="font-serif text-4xl font-bold">1</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                             <div className="md:hidden flex flex-shrink-0 w-12 h-12 bg-sb-green-dark text-white items-center justify-center rounded-[4px]">
                                <span className="font-serif text-2xl font-bold">1</span>
                            </div>
                            <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark font-bold uppercase leading-tight">
                                ANALYSE PRÉPARATOIRE
                            </h2>
                        </div>
                        <span className="inline-block bg-[#C5A065]/10 text-[#C5A065] border border-[#C5A065] px-4 py-2 text-sm md:text-base font-bold uppercase tracking-widest rounded-[4px] mb-6">
                            BACK-OFFICE
                        </span>
                    </div>
                </div>
                
                <h3 className="font-serif text-2xl md:text-3xl text-sb-green-dark mb-8 italic font-medium">
                    "Je travaille seul pour préserver votre temps."
                </h3>

                <p className="text-xl md:text-2xl text-sb-green-dark/90 font-sans leading-loose text-justify">
                    Pour respecter le temps de vos équipes, le travail commence sans vous. J'analyse à distance votre documentation, vos données et vos référentiels. Que ce soit pour préparer un audit ou structurer un système, cette phase d'étude me permet d'arriver chez vous avec une maîtrise du contexte et des hypothèses solides.
                </p>
            </div>

            {/* PHASE 2 : ACTION SUR LE TERRAIN */}
            <div className="bg-white p-10 md:p-16 border-l-8 border-sb-green-dark shadow-sm rounded-r-[4px]">
                <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                    <div className="hidden md:flex flex-shrink-0 w-20 h-20 bg-sb-green-dark text-white items-center justify-center rounded-[4px]">
                        <span className="font-serif text-4xl font-bold">2</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                             <div className="md:hidden flex flex-shrink-0 w-12 h-12 bg-sb-green-dark text-white items-center justify-center rounded-[4px]">
                                <span className="font-serif text-2xl font-bold">2</span>
                            </div>
                            <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark font-bold uppercase leading-tight">
                                ACTION SUR LE TERRAIN
                            </h2>
                        </div>
                        <span className="inline-block bg-sb-green-dark/10 text-sb-green-dark border border-sb-green-dark px-4 py-2 text-sm md:text-base font-bold uppercase tracking-widest rounded-[4px] mb-6">
                            CO-CONSTRUCTION
                        </span>
                    </div>
                </div>
                
                <h3 className="font-serif text-2xl md:text-3xl text-sb-green-dark mb-8 italic font-medium">
                    "Nous validons et construisons ensemble."
                </h3>

                <p className="text-xl md:text-2xl text-sb-green-dark/90 font-sans leading-loose text-justify">
                    Rien ne se décide dans une tour d'ivoire. Cette phase est collaborative. En Audit, je confronte mon analyse à la réalité pour vérifier la conformité. En Conseil, nous bâtissons les processus ensemble lors d'ateliers ciblés. Dans les deux cas, nous validons chaque point avec vos experts pour garantir que la solution est applicable.
                </p>
            </div>

            {/* PHASE 3 : FORMALISATION & RESTITUTION */}
            <div className="bg-white p-10 md:p-16 border-l-8 border-[#C5A065] shadow-sm rounded-r-[4px]">
                <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                    <div className="hidden md:flex flex-shrink-0 w-20 h-20 bg-sb-green-dark text-white items-center justify-center rounded-[4px]">
                        <span className="font-serif text-4xl font-bold">3</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                             <div className="md:hidden flex flex-shrink-0 w-12 h-12 bg-sb-green-dark text-white items-center justify-center rounded-[4px]">
                                <span className="font-serif text-2xl font-bold">3</span>
                            </div>
                            <h2 className="font-serif text-3xl md:text-4xl text-sb-green-dark font-bold uppercase leading-tight">
                                FORMALISATION & RESTITUTION
                            </h2>
                        </div>
                        <span className="inline-block bg-[#C5A065]/10 text-[#C5A065] border border-[#C5A065] px-4 py-2 text-sm md:text-base font-bold uppercase tracking-widest rounded-[4px] mb-6">
                            SÉCURISATION
                        </span>
                    </div>
                </div>
                
                <h3 className="font-serif text-2xl md:text-3xl text-sb-green-dark mb-8 italic font-medium">
                    "Je livre un résultat structuré."
                </h3>

                <p className="text-xl md:text-2xl text-sb-green-dark/90 font-sans leading-loose text-justify">
                    Une fois le consensus terrain obtenu, je finalise les livrables en back-office. Je rédige le rapport d'audit factuel ou je formalise votre système documentaire final. Je vous restitue un outil clé en main, propre et structuré, prêt à être déployé ou présenté à un certificateur.
                </p>
            </div>

        </div>
      </Section>

      {/* CTA SECTION - MASSIVE BUTTON */}
      <section className="bg-sb-green-dark py-24 text-center border-t border-[#C5A065]">
        <div className="container mx-auto px-6">
            <h2 className="font-serif text-4xl md:text-5xl text-white mb-10 uppercase tracking-tight">
                VOTRE ENTREPRISE MÉRITE CETTE EXIGENCE.
            </h2>
            
            <button 
                onClick={() => onNavigate(Page.CONTACT)}
                className="group inline-flex items-center justify-center px-12 py-8 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-widest text-lg md:text-xl rounded-[4px] hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
                SOLLICITER UN PREMIER ÉCHANGE <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
        </div>
      </section>
    </>
  );
};

export default Method;
