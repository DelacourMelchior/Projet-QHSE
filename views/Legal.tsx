import React from 'react';
import Section from '../components/Section';
import { Shield, Lock, FileText, Server } from 'lucide-react';

const Legal: React.FC = () => {
  return (
    <>
      <div className="bg-sb-green-dark text-sb-cream py-32 text-center border-b-4 border-sb-beige">
        <div className="container mx-auto px-6">
            <h1 className="font-serif text-4xl md:text-6xl mb-6 text-white">Mentions Légales</h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto font-light">
                Transparence, confidentialité et respect des données.
            </p>
        </div>
      </div>

      <Section bg="cream">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Bloc 1 : Éditeur */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px]">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <FileText size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark">1. Éditeur du site</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed space-y-2">
                <p>Le site internet <strong>Cabinet Delacour</strong> est édité par :</p>
                <ul className="list-none pl-0 space-y-1 mt-2">
                    <li><strong>Raison sociale :</strong> Cabinet Delacour EI</li>
                    <li><strong>Siège social :</strong> 15 Avenue des Champs-Élysées, 75008 Paris, France</li>
                    <li><strong>Directeur de la publication :</strong> Jean Dupont</li>
                    <li><strong>Email :</strong> contact@cabinet-delacour.fr</li>
                    <li><strong>Téléphone :</strong> +33 1 23 45 67 89</li>
                    <li><strong>SIRET :</strong> 000 000 000 00000</li>
                </ul>
            </div>
          </div>

          {/* Bloc 2 : Hébergement */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px]">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <Server size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark">2. Hébergement</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed">
                <p>
                    Ce site est hébergé par une infrastructure cloud sécurisée respectant les normes européennes.
                </p>
                <p className="mt-2">
                    <strong>Hébergeur :</strong> Netlify Inc.<br/>
                    2325 3rd Street, Suite 215, San Francisco, California 94107, USA.
                </p>
            </div>
          </div>

          {/* Bloc 3 : Propriété Intellectuelle */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px]">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <Shield size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark">3. Propriété Intellectuelle</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed space-y-4">
                <p>
                    L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                </p>
                <p>
                    Toute reproduction, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de Cabinet Delacour.
                </p>
            </div>
          </div>

          {/* Bloc 4 : Données Personnelles (RGPD) */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px]">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <Lock size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark">4. Politique de Confidentialité (RGPD)</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed space-y-4">
                <p>
                    Cabinet Delacour s'engage à ce que la collecte et le traitement de vos données, effectués à partir du site, soient conformes au règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.
                </p>
                
                <h3 className="font-bold text-sb-green-dark mt-4 uppercase tracking-widest text-xs">Données collectées</h3>
                <p>
                    Les données personnelles collectées via le formulaire de contact (Nom, Prénom, Email, Téléphone) sont destinées exclusivement à Cabinet Delacour pour le traitement de votre demande. Elles ne sont en aucun cas transmises à des tiers.
                </p>

                <h3 className="font-bold text-sb-green-dark mt-4 uppercase tracking-widest text-xs">Durée de conservation</h3>
                <p>
                    Vos données sont conservées pendant une durée maximale de 3 ans à compter du dernier contact.
                </p>

                <h3 className="font-bold text-sb-green-dark mt-4 uppercase tracking-widest text-xs">Vos droits</h3>
                <p>
                    Conformément à la réglementation, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition concernant vos données personnelles. Pour exercer ce droit, contactez-nous par email à : contact@cabinet-delacour.fr
                </p>
            </div>
          </div>

           {/* Bloc 5 : Cookies */}
           <div className="bg-sb-beige/20 p-10 border border-sb-beige rounded-[2px]">
             <h2 className="font-serif text-2xl text-sb-green-dark mb-4">5. Cookies</h2>
             <p className="text-sb-green-dark/80 font-light leading-relaxed">
                 Ce site utilise uniquement des cookies techniques nécessaires à son bon fonctionnement. Aucune donnée de traçage publicitaire n'est collectée sans votre consentement explicite.
             </p>
           </div>

        </div>
      </Section>
    </>
  );
};

export default Legal;