
import React, { useState } from 'react';
import Section from '../components/Section';
import { Mail, Send, Clock, Phone, CheckCircle2, Loader2 } from 'lucide-react';

const Contact: React.FC = () => {
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
      // Utilisation de l'ID Formspree fourni par l'utilisateur
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
                Je reviendrai vers vous personnellement sous <span className="font-bold border-b border-[#C5A065]">24 heures ouvrées</span> (hors week-end) pour convenir de notre créneau d'échange téléphonique de 30 minutes.
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
      <Section bg="cream" className="py-32 md:py-48 min-h-screen">
        
        {/* HEADER */}
        <div className="max-w-4xl mx-auto text-center mb-24 px-6">
             <h1 className="font-serif text-hero-mobile md:text-hero text-sb-green-dark mb-6 tracking-math-tight uppercase">
                PARLONS STRATÉGIE.
             </h1>
             <div className="w-24 h-px bg-sb-green-dark mx-auto mb-8"></div>
             <p className="text-body text-sb-green-dark/80 font-light leading-relaxed max-w-2xl mx-auto">
                Demandez votre diagnostic de faisabilité offert. Un échange stratégique de 30 minutes pour évaluer le potentiel de structuration de votre organisation.
             </p>
        </div>

        <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-16">
                
                {/* COLONNE GAUCHE : INFOS DIRECTES */}
                <div className="md:col-span-1 space-y-12">
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-math-wide text-sb-green-dark border-b border-sb-green-dark/20 pb-2">Contact Direct</h3>
                        <div className="group">
                            <p className="text-xs font-bold uppercase text-gray-400 mb-1">Disponibilité</p>
                            <p className="text-sb-green-dark font-medium text-lg flex items-center gap-2">
                                <Clock size={16} className="text-[#C5A065]" />
                                Sous 24h ouvrées
                            </p>
                        </div>
                    </div>

                    <div className="bg-sb-green-dark text-white p-8 rounded-[2px] shadow-xl space-y-6">
                        <div>
                            <h4 className="font-serif text-xl mb-4 text-sb-beige flex items-center gap-2">
                                <Phone size={20} className="text-[#C5A065]" /> 
                                Format du RDV
                            </h4>
                            <p className="text-sm font-light leading-relaxed opacity-80">
                                Le diagnostic dure <span className="text-sb-beige font-bold">30 minutes</span> et se déroule par téléphone.
                            </p>
                        </div>
                        <div className="pt-6 border-t border-white/10">
                            <h4 className="font-serif text-xl mb-4 text-sb-beige">Engagement</h4>
                            <p className="text-sm font-light leading-relaxed opacity-80 italic">
                                "Chaque demande est traitée personnellement pour fixer un créneau de rappel. Confidentialité garantie."
                            </p>
                            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-sb-beige">— M. Delacour</p>
                        </div>
                    </div>
                </div>

                {/* COLONNE DROITE : FORMULAIRE */}
                <div className="md:col-span-2">
                    <div className="bg-white p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-gray-100 rounded-[2px]">
                        <div className="mb-10 p-4 bg-sb-beige/30 border-l-4 border-[#C5A065] text-sb-green-dark">
                            <p className="text-sm font-bold uppercase tracking-math-wide">Demande de Diagnostic de Faisabilité</p>
                            <p className="text-xs opacity-70">Remplissez ce formulaire pour être rappelé et fixer votre rendez-vous.</p>
                        </div>

                        <form className="space-y-10" onSubmit={handleSubmit}>
                            {/* Champ Honeypot (Anti-Spam) caché */}
                            <input type="text" name="_gotcha" value={formData._gotcha} onChange={handleChange} style={{ display: 'none' }} />

                            <div className="space-y-6">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                                    <h3 className="text-xs font-bold uppercase tracking-math-wide text-sb-green-dark">01. Identité & Coordonnées</h3>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#C5A065] italic">* Champs obligatoires</span>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-x-6 gap-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                            Prénom & Nom <span className="text-[#C5A065]">*</span>
                                        </label>
                                        <input 
                                          type="text" 
                                          name="name"
                                          required
                                          value={formData.name}
                                          onChange={handleChange}
                                          className="w-full border-b border-gray-200 py-2 text-sb-green-dark focus:border-sb-green-dark outline-none transition-colors bg-transparent" 
                                          placeholder="Ex: Jean Dupont" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                            E-mail Pro <span className="text-[#C5A065]">*</span>
                                        </label>
                                        <input 
                                          type="email" 
                                          name="email"
                                          required
                                          value={formData.email}
                                          onChange={handleChange}
                                          className="w-full border-b border-gray-200 py-2 text-sb-green-dark focus:border-sb-green-dark outline-none transition-colors bg-transparent" 
                                          placeholder="jean.dupont@societe.com" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                            Téléphone <span className="text-[#C5A065]">*</span>
                                        </label>
                                        <input 
                                          type="tel" 
                                          name="phone"
                                          required
                                          value={formData.phone}
                                          onChange={handleChange}
                                          className="w-full border-b border-gray-200 py-2 text-sb-green-dark focus:border-sb-green-dark outline-none transition-colors bg-transparent" 
                                          placeholder="06 00 00 00 00" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                            Société <span className="text-[#C5A065]">*</span>
                                        </label>
                                        <input 
                                          type="text" 
                                          name="company"
                                          required
                                          value={formData.company}
                                          onChange={handleChange}
                                          className="w-full border-b border-gray-200 py-2 text-sb-green-dark focus:border-sb-green-dark outline-none transition-colors bg-transparent" 
                                          placeholder="Raison sociale" 
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                            Fonction <span className="text-[#C5A065]">*</span>
                                        </label>
                                        <input 
                                          type="text" 
                                          name="function"
                                          required
                                          value={formData.function}
                                          onChange={handleChange}
                                          className="w-full border-b border-gray-200 py-2 text-sb-green-dark focus:border-sb-green-dark outline-none transition-colors bg-transparent" 
                                          placeholder="DG, Responsable QHSE..." 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase tracking-math-wide text-sb-green-dark border-b border-gray-100 pb-2">02. Votre Enjeu (Optionnel)</h3>
                                <textarea 
                                  name="message"
                                  rows={4} 
                                  value={formData.message}
                                  onChange={handleChange}
                                  className="w-full border-b border-gray-200 py-2 text-sb-green-dark focus:border-sb-green-dark outline-none resize-none transition-colors bg-transparent" 
                                  placeholder="Détaillez brièvement votre problématique actuelle ou vos contraintes temporelles..."
                                ></textarea>
                            </div>

                            {status === 'error' && (
                              <div className="p-4 bg-red-50 text-red-800 text-xs rounded-[2px] border border-red-100 animate-pulse">
                                Une erreur est survenue lors de l'envoi. Veuillez vérifier votre connexion ou me contacter directement par e-mail.
                              </div>
                            )}

                            <div className="space-y-4">
                                <button 
                                  type="submit" 
                                  disabled={status === 'submitting'}
                                  className={`group w-full bg-[#C5A065] text-sb-green-dark py-5 font-bold uppercase tracking-math-wide hover:bg-sb-green-dark hover:text-white transition-all rounded-[2px] shadow-lg flex items-center justify-center gap-3 ${status === 'submitting' ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {status === 'submitting' ? (
                                      <>ENVOI EN COURS <Loader2 size={16} className="animate-spin" /></>
                                    ) : (
                                      <>DEMANDER MON RDV DIAGNOSTIC <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                                    )}
                                </button>
                                <p className="text-center text-[9px] text-gray-400 uppercase tracking-widest">
                                    En envoyant ce formulaire, vous acceptez d'être recontacté pour planifier cet échange.
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <p className="text-center text-[10px] text-gray-400 mt-16 font-light uppercase tracking-widest">
                Cabinet Delacour — Respect du RGPD & Confidentialité des Données.
            </p>
        </div>

      </Section>
    </>
  );
};

export default Contact;
