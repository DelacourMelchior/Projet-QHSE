
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';

interface AboutProps {
  onNavigate: (page: Page) => void;
}

const About: React.FC<AboutProps> = ({ onNavigate }) => {
  return (
    <>
      <Section bg="cream" className="pt-20">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div className="order-2 md:order-1">
            <div className="relative p-4">
                {/* Organic decorative background */}
              <div className="absolute inset-0 bg-sb-beige rounded-[3rem] rotate-3 transform scale-95 shadow-xl"></div>
              <img 
                src="https://picsum.photos/id/1/800/1000" 
                alt="Consultant travaillant" 
                className="relative w-full h-auto shadow-2xl rounded-[2.5rem]"
              />
              <div className="absolute -bottom-10 -right-4 bg-sb-green-dark p-10 rounded-tl-3xl rounded-br-[2.5rem] rounded-tr-lg rounded-bl-lg shadow-2xl hidden md:block max-w-xs border-t border-l border-white/10">
                <p className="text-sb-beige font-serif text-2xl italic leading-normal">"La qualité est une habitude, pas un acte."</p>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-10">
            <div>
                <h3 className="text-sm text-sb-green-light font-bold uppercase tracking-widest mb-2">À propos</h3>
                <h2 className="font-serif text-4xl md:text-6xl text-sb-green-dark leading-tight drop-shadow-sm">
                L'architecte de votre <span className="italic text-sb-green-light">conformité</span>.
                </h2>
            </div>
            
            <div className="space-y-6 text-lg leading-relaxed text-gray-600 font-light">
              <p>
                Je m'appelle <strong className="font-semibold text-sb-black">Jean Dupont</strong>. Après 15 années passées à diriger des services qualité dans l'industrie aéronautique et pharmaceutique, j'ai compris une chose essentielle : les normes ne sont pas là pour freiner l'entreprise, mais pour la structurer.
              </p>
              <p>
                Mon approche se distingue par une volonté farouche de simplifier. Je refuse la complexité administrative inutile. Je conçois des systèmes de management de la qualité qui respirent, qui vivent et qui s'adaptent à la réalité du terrain, pas l'inverse.
              </p>
              <p>
                Aujourd'hui, j'accompagne les PME et ETI dans leur quête d'excellence opérationnelle, avec la même précision qu'un artisan peaufinant son œuvre.
              </p>
            </div>
            <div className="pt-6">
                <h4 className="font-serif text-2xl text-sb-green-dark mb-6">Mes valeurs</h4>
                <div className="flex flex-wrap gap-4">
                    {['Écoute Active', 'Pragmatisme', 'Rigueur', 'Transmission', 'Transparence'].map(val => (
                        <span key={val} className="px-6 py-2 bg-white border border-sb-beige rounded-full text-gray-600 shadow-md hover:shadow-lg transition-shadow text-sm uppercase tracking-wide">
                            {val}
                        </span>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </Section>

      <Section bg="green" className="text-center rounded-t-[3rem] mt-12 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto space-y-8 py-12">
           <h2 className="font-serif text-4xl text-sb-beige drop-shadow-md">Une approche centrée sur l'humain</h2>
           <p className="text-xl text-sb-cream leading-loose font-light drop-shadow-sm">
               Au-delà des processus et des indicateurs, c'est l'adhésion de vos équipes qui fait la différence. 
               Mon rôle est aussi de pédagogue : donner du sens à la contrainte pour en faire un levier de fierté collective.
           </p>
        </div>
      </Section>
    </>
  );
};

export default About;
