
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';

interface MethodProps {
    onNavigate: (page: Page) => void;
}

const Method: React.FC<MethodProps> = ({ onNavigate }) => {
  const steps = [
    {
      id: '01',
      title: 'Observer',
      text: "Nous commençons par une immersion totale. Comprendre votre culture, vos flux, vos non-dits. Comme un terroir influence le café, votre environnement influence votre qualité.",
      image: "https://picsum.photos/id/60/800/600"
    },
    {
      id: '02',
      title: 'Diagnostiquer',
      text: "Analyse factuelle des écarts. Nous croisons les référentiels ISO 9001 avec votre réalité opérationnelle pour identifier les leviers d'action prioritaires.",
      image: "https://picsum.photos/id/119/800/600"
    },
    {
      id: '03',
      title: 'Transformer',
      text: "Mise en œuvre du plan d'action. Nous ne livrons pas un rapport pour qu'il prenne la poussière. Nous accompagnons le changement sur le terrain, avec vos équipes.",
      image: "https://picsum.photos/id/252/800/600"
    }
  ];

  return (
    <>
       <div className="bg-sb-beige text-sb-green-dark py-24 text-center rounded-b-[3rem] shadow-xl">
        <h1 className="font-serif text-5xl md:text-7xl mb-6 drop-shadow-sm">Notre Méthodologie</h1>
        <p className="text-xl max-w-2xl mx-auto opacity-80 font-light">
            Un processus en trois temps, simple, lisible et efficace.
        </p>
      </div>

      <Section bg="cream">
        <div className="relative">
            {/* Vertical Line for Desktop - Dashed and soft */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-sb-green-dark/20 -translate-x-1/2"></div>

            <div className="space-y-32">
                {steps.map((step, index) => (
                    <div key={step.id} className={`relative flex flex-col md:flex-row items-center gap-16 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                        
                        {/* Step Number Badge - Floating and soft */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex w-20 h-20 bg-sb-cream text-sb-green-dark rounded-full items-center justify-center font-serif text-2xl font-bold z-10 shadow-xl shadow-sb-green-dark/10 border border-sb-beige">
                            {step.id}
                        </div>

                         {/* Image */}
                         <div className="w-full md:w-1/2">
                            <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl">
                                <img src={step.image} alt={step.title} className="w-full h-[400px] object-cover hover:scale-105 transition-transform duration-700" />
                            </div>
                         </div>

                         {/* Text */}
                         <div className={`w-full md:w-1/2 text-center ${index % 2 === 1 ? 'md:text-right' : 'md:text-left'}`}>
                            <span className="md:hidden inline-block px-4 py-2 bg-sb-green-dark text-sb-beige text-sm font-bold rounded-full mb-6 shadow-lg">{step.id}</span>
                            <h3 className="font-serif text-4xl md:text-5xl text-sb-green-dark mb-6 drop-shadow-sm">{step.title}</h3>
                            <p className="text-lg text-gray-600 leading-relaxed font-light">
                                {step.text}
                            </p>
                         </div>
                    </div>
                ))}
            </div>
        </div>
      </Section>
    </>
  );
};

export default Method;
