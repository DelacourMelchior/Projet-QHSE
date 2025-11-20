
import React from 'react';
import Section from '../components/Section';
import { TESTIMONIALS } from '../constants';
import { Mail, Phone, MapPin, Star } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <>
      {/* Testimonials - Soft bubbles */}
      <Section bg="green" className="text-center rounded-b-[3rem] mb-12 shadow-2xl">
        <h2 className="font-serif text-3xl md:text-4xl text-sb-beige mb-16 drop-shadow-md">Ce que disent nos partenaires</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
                <div key={t.id} className="bg-white/5 p-10 rounded-[2rem] text-left relative backdrop-blur-sm hover:bg-white/10 transition-colors shadow-xl shadow-black/20 border border-white/5">
                    <div className="flex text-sb-beige mb-6 drop-shadow-sm">
                        {[1,2,3,4,5].map(i => <Star key={i} size={18} fill="#F3E9D2" className="mr-1"/>)}
                    </div>
                    <p className="text-sb-cream text-xl italic mb-8 font-light leading-relaxed drop-shadow-sm">"{t.quote}"</p>
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-sb-beige rounded-full flex items-center justify-center text-sb-green-dark font-bold font-serif text-lg shadow-lg">
                            {t.author.charAt(0)}
                        </div>
                        <div>
                            <p className="text-white font-bold uppercase tracking-wider text-sm">{t.author}</p>
                            <p className="text-sb-green-light text-sm">{t.role}</p>
                        </div>
                        {t.metric && (
                            <div className="ml-auto px-4 py-1.5 bg-sb-green-light/20 text-sb-beige text-xs font-bold rounded-full border border-sb-green-light/30 shadow-sm">
                                {t.metric}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </Section>

      <Section bg="cream">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
            {/* Info */}
            <div className="space-y-8">
                <h1 className="font-serif text-5xl md:text-6xl text-sb-green-dark mb-6 drop-shadow-sm">Parlons de <br/>votre projet.</h1>
                <p className="text-gray-600 text-lg mb-12 leading-relaxed font-light">
                    Un accompagnement commence toujours par un échange. Prenez contact pour un premier diagnostic téléphonique gratuit de 30 minutes.
                </p>
                
                <div className="space-y-8 p-8 bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-50">
                    <div className="flex items-center space-x-6">
                        <div className="w-14 h-14 bg-sb-green-dark/5 text-sb-green-dark flex items-center justify-center rounded-2xl shadow-inner">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs text-gray-400 mb-1">Email</h4>
                            <a href="mailto:contact@qhse-excellence.fr" className="text-xl text-sb-green-dark font-serif hover:text-sb-green-light transition-colors">contact@qhse-excellence.fr</a>
                        </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="w-14 h-14 bg-sb-green-dark/5 text-sb-green-dark flex items-center justify-center rounded-2xl shadow-inner">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs text-gray-400 mb-1">Téléphone</h4>
                            <a href="tel:+33123456789" className="text-xl text-sb-green-dark font-serif hover:text-sb-green-light transition-colors">+33 1 23 45 67 89</a>
                        </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="w-14 h-14 bg-sb-green-dark/5 text-sb-green-dark flex items-center justify-center rounded-2xl shadow-inner">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs text-gray-400 mb-1">Bureau</h4>
                            <p className="text-xl text-sb-green-dark font-serif">Paris, France</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form - Softer inputs */}
            <div className="bg-white p-8 md:p-12 shadow-2xl shadow-gray-200 rounded-[2.5rem] border border-gray-50">
                <h3 className="font-serif text-3xl text-sb-green-dark mb-8 drop-shadow-sm">Envoyez-nous un message</h3>
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Prénom</label>
                            <input type="text" className="w-full bg-sb-cream/50 border border-transparent focus:border-sb-green-light focus:bg-white rounded-xl py-3 px-4 focus:outline-none transition-all duration-300 shadow-inner focus:shadow-lg" placeholder="Jean" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Nom</label>
                            <input type="text" className="w-full bg-sb-cream/50 border border-transparent focus:border-sb-green-light focus:bg-white rounded-xl py-3 px-4 focus:outline-none transition-all duration-300 shadow-inner focus:shadow-lg" placeholder="Dupont" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Email</label>
                        <input type="email" className="w-full bg-sb-cream/50 border border-transparent focus:border-sb-green-light focus:bg-white rounded-xl py-3 px-4 focus:outline-none transition-all duration-300 shadow-inner focus:shadow-lg" placeholder="jean.dupont@entreprise.com" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">Message</label>
                        <textarea rows={4} className="w-full bg-sb-cream/50 border border-transparent focus:border-sb-green-light focus:bg-white rounded-xl py-3 px-4 focus:outline-none transition-all duration-300 resize-none shadow-inner focus:shadow-lg" placeholder="Je souhaite obtenir des informations..."></textarea>
                    </div>
                    <button type="submit" className="w-full bg-sb-green-dark text-white py-4 font-bold uppercase tracking-widest hover:bg-opacity-90 transition-all mt-6 rounded-full shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                        Envoyer le message
                    </button>
                </form>
            </div>
        </div>
      </Section>
    </>
  );
};

export default Contact;
