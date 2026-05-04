
import React, { useState } from 'react';
import Section from '../components/Section';
import { Page } from '../types';
import { Mail, Send, Clock, Phone, CheckCircle2, Loader2, MapPin } from 'lucide-react';

interface ContactProps {
  onNavigate?: (page: Page) => void;
}

const Contact: React.FC<ContactProps> = ({ onNavigate }) => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    function: '',
    message: '',
    _gotcha: '' // Champ anti-spam (Honeypot)
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch('https://formspree.io/f/xqeezlgv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          function: formData.function,
          message: formData.message,
          _subject: `Nouveau Diagnostic : ${formData.company} (${formData.name})`,
          _gotcha: formData._gotcha
        })
      });

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error("Erreur d'envoi:", error);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <Section bg="cream" className="py-32 md:py-48 min-h-screen flex items-center">
        <div className="max-w-3xl mx-auto text-center px-6 animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 bg-sb-green-dark text-sb-beige flex items-center justify-center rounded-full mx-auto mb-10 shadow-xl">
                <CheckCircle2 size={40} />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-sb-green-dark mb-6 uppercase tracking-tight">
                DEMANDE BIEN REÇUE.
            </h1>
            <div className="w-16 h-px bg-[#C5A065] mx-auto mb-10"></div>
            <p className="text-xl text-sb-green-dark/80 font-light leading-relaxed mb-12">
                Merci, M. {formData.name.split(' ')[0]}. Votre demande de diagnostic de faisabilité a été transmise au cabinet. 
                <br /><br />
                Je reviendrai vers vous personnellement sous <span className="font-bold border-b border-[#C5A065]">24 heures ouvrées</span> pour convenir de notre créneau d'échange téléphonique.
            </p>
            <button 
                onClick={() => setStatus('idle')}
                className="text-xs font-bold uppercase tracking-widest text-sb-green-dark/40 hover:text-sb-green-dark transition-colors"
            >
                Envoyer une autre demande
            </button>
        </div>
      </Section>
    );
  }

  return (
    <>
      <Section bg="cream" className="pt-32 pb-20 md:pt-48 md:pb-32 min-h-screen">
        
        {/* HEADER SECTION */}
        <div className="container mx-auto px-6 mb-20 md:mb-32">
             <div className="max-w-4xl">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A065] mb-4">Initialisation Stratégique</h3>
                <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-sb-green-dark mb-8 tracking-math-tight uppercase leading-[0.9]">
                   Parlons de votre<br/><span className="italic text-sb-green-light">Prochaine Étape.</span>
                </h1>
                <p className="text-lg md:text-body text-sb-green-dark/70 font-light leading-relaxed max-w-2xl">
                   Sollicitez votre diagnostic de faisabilité offert. Trente minutes d'expertise pour identifier vos leviers de performance immédiats.
                </p>
             </div>
        </div>

        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-24">
                
                {/* COLONNE GAUCHE : CARTE D'INFORMATION (4 COLONNES) */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white border border-sb-green-dark/5 p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] rounded-[2px] relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sb-beige/10 rounded-full -mr-16 -mt-16"></div>
                        
                        <div className="relative z-10 space-y-12">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-sb-green-dark/40 mb-6 border-b border-sb-green-dark/10 pb-2">Engagement de service</h4>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-sb-green-dark/5 flex items-center justify-center rounded-[2px] text-sb-green-dark flex-shrink-0">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-sb-green-dark mb-1">Réactivité</p>
                                            <p className="text-sm text-sb-green-dark/60 font-light">Réponse garantie sous 24h ouvrées.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-sb-green-dark/5 flex items-center justify-center rounded-[2px] text-sb-green-dark flex-shrink-0">
                                            <Phone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-sb-green-dark mb-1">Format</p>
                                            <p className="text-sm text-sb-green-dark/60 font-light">30 min d'échange téléphonique stratégique.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-sb-green-dark/5">
                                <h4 className="font-serif text-xl mb-4 text-sb-green-dark">Note du Consultant</h4>
                                <p className="text-sm font-light leading-relaxed text-sb-green-dark/70 italic">
                                    "Chaque organisation est unique. Ce diagnostic n'est pas une présentation commerciale, c'est une première analyse de la maturité de vos processus."
                                </p>
                                <div className="mt-6 flex items-center gap-3">
                                    <div className="w-8 h-px bg-[#C5A065]"></div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark">M. Delacour</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6 bg-sb-green-dark text-sb-beige flex items-center justify-between rounded-[2px]">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Confidentialité Totale</span>
                        <ShieldAlert size={16} className="text-[#C5A065]" />
                    </div>
                </div>

                {/* COLONNE DROITE : FORMULAIRE (8 COLONNES) */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-8 md:p-12 lg:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.05)] border border-white rounded-[2px]">
                        <form className="space-y-12" onSubmit={handleSubmit}>
                            {/* Honeypot */}
                            <input type="text" name="_gotcha" value={formData._gotcha} onChange={handleChange} className="hidden" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                                {/* Nom */}
                                <div className="group relative">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark/40 mb-2 block transition-colors group-focus-within:text-[#C5A065]">
                                        Prénom & Nom <span className="text-[#C5A065]">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full bg-sb-cream/30 border border-sb-green-dark/5 px-4 py-3 text-sb-green-dark focus:border-[#C5A065] focus:bg-white outline-none transition-all rounded-[2px]" 
                                        placeholder="Jean Dupont" 
                                    />
                                </div>

                                {/* Email */}
                                <div className="group relative">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark/40 mb-2 block transition-colors group-focus-within:text-[#C5A065]">
                                        Email Professionnel <span className="text-[#C5A065]">*</span>
                                    </label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full bg-sb-cream/30 border border-sb-green-dark/5 px-4 py-3 text-sb-green-dark focus:border-[#C5A065] focus:bg-white outline-none transition-all rounded-[2px]" 
                                        placeholder="j.dupont@societe.com" 
                                    />
                                </div>

                                {/* Téléphone */}
                                <div className="group relative">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark/40 mb-2 block transition-colors group-focus-within:text-[#C5A065]">
                                        Téléphone <span className="text-[#C5A065]">*</span>
                                    </label>
                                    <input 
                                        type="tel" 
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full bg-sb-cream/30 border border-sb-green-dark/5 px-4 py-3 text-sb-green-dark focus:border-[#C5A065] focus:bg-white outline-none transition-all rounded-[2px]" 
                                        placeholder="06 00 00 00 00" 
                                    />
                                </div>

                                {/* Société */}
                                <div className="group relative">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark/40 mb-2 block transition-colors group-focus-within:text-[#C5A065]">
                                        Société <span className="text-[#C5A065]">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        name="company"
                                        required
                                        value={formData.company}
                                        onChange={handleChange}
                                        className="w-full bg-sb-cream/30 border border-sb-green-dark/5 px-4 py-3 text-sb-green-dark focus:border-[#C5A065] focus:bg-white outline-none transition-all rounded-[2px]" 
                                        placeholder="Nom de l'entreprise" 
                                    />
                                </div>

                                {/* Fonction */}
                                <div className="md:col-span-2 group relative">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark/40 mb-2 block transition-colors group-focus-within:text-[#C5A065]">
                                        Votre Fonction <span className="text-[#C5A065]">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        name="function"
                                        required
                                        value={formData.function}
                                        onChange={handleChange}
                                        className="w-full bg-sb-cream/30 border border-sb-green-dark/5 px-4 py-3 text-sb-green-dark focus:border-[#C5A065] focus:bg-white outline-none transition-all rounded-[2px]" 
                                        placeholder="DG, Responsable QHSE, Directeur de Site..." 
                                    />
                                </div>

                                {/* Message */}
                                <div className="md:col-span-2 group relative">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-sb-green-dark/40 mb-2 block transition-colors group-focus-within:text-[#C5A065]">
                                        Enjeux ou Objectifs de l'échange
                                    </label>
                                    <textarea 
                                        name="message"
                                        rows={4} 
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full bg-sb-cream/30 border border-sb-green-dark/5 px-4 py-3 text-sb-green-dark focus:border-[#C5A065] focus:bg-white outline-none transition-all rounded-[2px] resize-none" 
                                        placeholder="Décrivez brièvement votre contexte actuel..."
                                    ></textarea>
                                </div>
                            </div>

                            {status === 'error' && (
                              <div className="p-4 bg-red-50 text-red-800 text-xs rounded-[2px] border border-red-100">
                                Une erreur est survenue. Veuillez vérifier votre saisie ou contacter le cabinet par e-mail.
                              </div>
                            )}

                            <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-8">
                                <p className="text-[9px] text-gray-400 uppercase tracking-widest max-w-xs text-center md:text-left">
                                    En soumettant ce formulaire, vous acceptez d'être recontacté exclusivement pour ce diagnostic.
                                </p>
                                <button 
                                  type="submit" 
                                  disabled={status === 'submitting'}
                                  className={`group px-12 py-5 bg-[#C5A065] text-sb-green-dark font-bold uppercase tracking-math-wide hover:bg-sb-green-dark hover:text-white transition-all rounded-[2px] shadow-xl flex items-center justify-center gap-3 min-w-[280px] ${status === 'submitting' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {status === 'submitting' ? (
                                      <>Traitement... <Loader2 size={18} className="animate-spin" /></>
                                    ) : (
                                      <>Valider ma demande <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      </Section>
    </>
  );
};

// Simple icon for alert/shield decorative
const ShieldAlert: React.FC<{size?: number, className?: string}> = ({size = 16, className = ""}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
);

export default Contact;
