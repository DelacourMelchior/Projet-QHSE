
import React from 'react';
import Section from '../components/Section';
import { SERVICES } from '../constants';
import { Page } from '../types';
import { Check, Clock, FileText } from 'lucide-react';

interface ServicesProps {
  onNavigate: (page: Page) => void;
}

const Services: React.FC<ServicesProps> = ({ onNavigate }) => {
  return (
    <>
      <div className="bg-sb-green-dark text-sb-cream py-24 md:py-32 text-center rounded-b-[3rem] mb-12 shadow-2xl">
        <div className="container mx-auto px-6">
            <h1 className="font-serif text-5xl md:text-7xl mb-8 drop-shadow-lg">Nos Prestations</h1>
            <p className="text-xl text-sb-green-light max-w-2xl mx-auto font-light drop-shadow-md">
                Des interventions ciblées, à forte valeur ajoutée, pour renforcer la performance, la conformité et la culture qualité.
            </p>
        </div>
      </div>

      <Section bg="cream">
        <div className="space-y-32">
          {SERVICES.map((service, index) => (
            <div key={service.id} className={`grid md:grid-cols-2 gap-16 items-start ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              
              {/* Image Side - Organic shapes */}
              <div className={`relative group sticky top-32 ${index % 2 === 1 ? 'md:order-2' : 'md:order-1'}`}>
                <div className="absolute inset-0 bg-sb-beige rounded-[2.5rem] transform translate-x-4 translate-y-4 transition-transform group-hover:translate-x-2 group-hover:translate-y-2 shadow-xl"></div>
                <img 
                  src={service.image} 
                  alt={service.title} 
                  className="relative w-full h-[500px] object-cover shadow-2xl rounded-[2.5rem]"
                />
              </div>

              {/* Content Side */}
              <div className={`space-y-8 ${index % 2 === 1 ? 'md:order-1' : 'md:order-2'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-sb-green-dark/5 text-sb-green-dark font-bold tracking-widest uppercase text-xs rounded-full shadow-inner">
                        <Clock size={14} />
                        {service.duration}
                    </span>
                </div>
                
                <h2 className="font-serif text-4xl md:text-5xl text-sb-green-dark leading-tight drop-shadow-sm">{service.title}</h2>
                <p className="text-gray-600 text-lg leading-relaxed font-light">
                  {service.description}
                </p>
                
                {/* Benefits & Deliverables Grid */}
                <div className="grid gap-6">
                    {/* Benefits Box */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-sb-green-dark/5 border border-gray-100 hover:shadow-2xl hover:shadow-sb-green-dark/10 transition-shadow duration-300">
                        <h4 className="font-serif text-xl mb-6 text-sb-black flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-sb-beige flex items-center justify-center text-sb-green-dark shadow-sm"><Check size={16} /></span>
                            Vos bénéfices
                        </h4>
                        <ul className="space-y-4">
                            {service.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start space-x-4 text-gray-700 group">
                                    <span className="block w-1.5 h-1.5 rounded-full bg-sb-green-light mt-2.5 flex-shrink-0"></span>
                                    <span className="font-light">{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Deliverables Box */}
                    <div className="bg-sb-green-dark/5 p-8 rounded-3xl shadow-xl shadow-black/5 border border-sb-green-dark/5 hover:shadow-2xl hover:shadow-black/10 transition-shadow duration-300">
                        <h4 className="font-serif text-xl mb-6 text-sb-green-dark flex items-center gap-2">
                             <span className="w-8 h-8 rounded-full bg-sb-green-dark flex items-center justify-center text-sb-cream shadow-sm"><FileText size={16} /></span>
                             Livrables clés
                        </h4>
                        <ul className="space-y-4">
                            {service.deliverables.map((item, idx) => (
                                <li key={idx} className="flex items-start space-x-4 text-gray-700">
                                    <span className="block w-1.5 h-1.5 rounded-full bg-sb-green-dark mt-2.5 flex-shrink-0"></span>
                                    <span className="font-light text-sb-green-dark">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <button 
                  onClick={() => onNavigate(Page.CONTACT)}
                  className="inline-block mt-6 px-8 py-4 bg-sb-green-dark text-sb-cream font-bold uppercase tracking-widest rounded-full hover:bg-opacity-90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
                >
                  Demander un devis
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section bg="beige" className="text-center my-12 rounded-3xl mx-6 shadow-inner">
          <h2 className="font-serif text-3xl md:text-4xl mb-6 text-sb-green-dark drop-shadow-sm">Une autre demande ?</h2>
          <p className="text-gray-700 mb-10 max-w-2xl mx-auto text-lg font-light">
              Nous construisons ensemble la solution adaptée à votre contexte.
          </p>
          <button 
            onClick={() => onNavigate(Page.CONTACT)}
            className="bg-transparent border-2 border-sb-green-dark text-sb-green-dark px-10 py-4 font-bold uppercase tracking-widest rounded-full hover:bg-sb-green-dark hover:text-white transition-all shadow-lg hover:shadow-xl"
          >
              Nous contacter
          </button>
      </Section>
    </>
  );
};

export default Services;
