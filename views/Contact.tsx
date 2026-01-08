
import React from 'react';
import Section from '../components/Section';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <>
      <Section bg="cream" className="py-32 md:py-48 min-h-screen">
        
        {/* HEADER */}
        <div className="max-w-4xl mx-auto text-center mb-16 px-6">
             <h1 className="font-serif text-hero-mobile md:text-hero text-sb-green-dark mb-6 tracking-math-tight">
                PARLONS STRATÉGIE.
             </h1>
             <div className="w-24 h-px bg-sb-green-dark mx-auto mb-8"></div>
             <p className="text-body text-sb-green-dark/80 font-light leading-relaxed max-w-2xl mx-auto">
                Cet échange de 30 minutes est un diagnostic de faisabilité. Vérifions ensemble si votre structure est prête pour l'accélération.
             </p>
        </div>

        {/* FORMULAIRE - STYLE PAPIER OFFICIEL */}
        <div className="max-w-5xl mx-auto px-6">
            <div className="bg-white p-8 md:p-14 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-gray-200 rounded-[2px]">
                
                <form className="space-y-12" onSubmit={(e) => e.preventDefault()}>
                    
                    {/* BLOC A : IDENTITÉ */}
                    <div className="space-y-8">
                        <h3 className="text-xs font-bold uppercase tracking-math-wide text-sb-green-dark border-b border-gray-100 pb-2">01. Identité</h3>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Prénom & Nom</label>
                                    <input type="text" className="w-full border border-gray-300 px-4 py-3 text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] transition-colors" placeholder="Jean Dupont" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Entreprise</label>
                                    <input type="text" className="w-full border border-gray-300 px-4 py-3 text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] transition-colors" placeholder="Nom de votre société" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Email Professionnel</label>
                                    <input type="email" className="w-full border border-gray-300 px-4 py-3 text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] transition-colors" placeholder="jean.dupont@entreprise.com" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Fonction</label>
                                    <input type="text" className="w-full border border-gray-300 px-4 py-3 text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] transition-colors" placeholder="Directeur Général, Responsable QSE..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Téléphone Direct</label>
                                    <input type="tel" className="w-full border border-gray-300 px-4 py-3 text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] transition-colors" placeholder="+33 6 00 00 00 00" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BLOC B : QUALIFICATION */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-math-wide text-sb-green-dark border-b border-gray-100 pb-2">02. Qualification</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Quel est votre enjeu prioritaire ?</label>
                            <div className="relative">
                                <select className="w-full border border-gray-300 px-4 py-3 text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] appearance-none bg-white transition-colors cursor-pointer">
                                    <option value="" disabled selected className="text-gray-400">Sélectionnez votre problématique...</option>
                                    <option value="robustesse">Identifier mes Risques (Audit Robustesse)</option>
                                    <option value="processus">Structurer ma Croissance (Processus)</option>
                                    <option value="audit_iso">Valider ma Certification (Audit Blanc ISO 9001)</option>
                                    <option value="data">Sécuriser mon Pilotage (Data & KPI)</option>
                                    <option value="autre">Autre / Demande Globale</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                    {/* BLOC C : MODULE AGENDA */}
                    <div className="bg-sb-cream/50 p-8 rounded-[2px] border border-gray-200/60">
                         <div className="mb-6">
                             <h3 className="text-sm font-bold uppercase tracking-math-wide text-sb-green-dark mb-1 flex items-center gap-2">
                                <Calendar size={16} />
                                Proposez 3 Créneaux (30 min au calme)
                             </h3>
                             <p className="text-xs text-gray-500 italic font-light ml-6">
                                Privilégiez un moment où vous ne serez pas dérangé par l'opérationnel.
                             </p>
                         </div>
                         
                         <div className="space-y-4">
                            {/* Option 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-400 md:col-span-1">Option 1</span>
                                <div className="md:col-span-3">
                                    <input type="date" className="w-full border border-gray-300 px-3 py-2 text-sm text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] bg-white" />
                                </div>
                                <div className="md:col-span-3 relative">
                                    <input type="time" className="w-full border border-gray-300 px-3 py-2 text-sm text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] bg-white" />
                                </div>
                            </div>

                             {/* Option 2 */}
                             <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-400 md:col-span-1">Option 2</span>
                                <div className="md:col-span-3">
                                    <input type="date" className="w-full border border-gray-300 px-3 py-2 text-sm text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] bg-white" />
                                </div>
                                <div className="md:col-span-3 relative">
                                    <input type="time" className="w-full border border-gray-300 px-3 py-2 text-sm text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] bg-white" />
                                </div>
                            </div>

                             {/* Option 3 */}
                             <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-400 md:col-span-1">Option 3</span>
                                <div className="md:col-span-3">
                                    <input type="date" className="w-full border border-gray-300 px-3 py-2 text-sm text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] bg-white" />
                                </div>
                                <div className="md:col-span-3 relative">
                                    <input type="time" className="w-full border border-gray-300 px-3 py-2 text-sm text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] bg-white" />
                                </div>
                            </div>
                         </div>
                    </div>

                    {/* BLOC D : MESSAGE */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-math-wide text-sb-green-dark border-b border-gray-100 pb-2">03. Contexte & Précisions</h3>
                        <div className="space-y-2">
                             <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Message (Optionnel)</label>
                            <textarea rows={4} className="w-full border border-gray-300 px-4 py-3 text-sb-green-dark focus:border-sb-green-dark outline-none rounded-[2px] resize-none transition-colors" placeholder="Décrivez brièvement la situation actuelle..."></textarea>
                        </div>
                    </div>

                    {/* BOUTON ACTION */}
                    <button type="submit" className="w-full bg-sb-beige text-sb-green-dark py-5 font-bold uppercase tracking-math-wide hover:bg-sb-green-dark hover:text-sb-beige transition-all rounded-[2px] shadow-lg hover:shadow-xl text-sm md:text-base border border-transparent">
                        SOLLICITER MON CRÉNEAU STRATÉGIQUE
                    </button>

                </form>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-8 font-light">
                Vos données sont strictement confidentielles. Aucune information n'est partagée.
            </p>
        </div>

      </Section>
    </>
  );
};

export default Contact;
