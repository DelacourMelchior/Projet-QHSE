
import React from 'react';
import Section from '../components/Section';
import { Shield, Lock, FileText, Server, Mail } from 'lucide-react';

const Legal: React.FC = () => {
  return (
    <>
      <div className="bg-sb-green-dark text-sb-cream py-32 text-center border-b-4 border-sb-beige">
        <div className="container mx-auto px-6">
            <h1 className="font-serif text-4xl md:text-6xl mb-6 text-white uppercase tracking-math-tight">Mentions Légales</h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto font-light">
                Transparence, confidentialité et rigueur institutionnelle.
            </p>
        </div>
      </div>

      <Section bg="cream">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Bloc 1 : Éditeur */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px] shadow-sm">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <FileText size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark font-bold uppercase">1. Éditeur du site</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed space-y-3">
                <p>Le site internet <strong>Cabinet Delacour</strong> est édité par :</p>
                <ul className="list-none pl-0 space-y-2 mt-2">
                    <li><span className="font-bold text-sb-green-dark uppercase text-xs tracking-widest mr-2">Raison sociale :</span> Cabinet Delacour</li>
                    <li><span className="font-bold text-sb-green-dark uppercase text-xs tracking-widest mr-2">Directeur de la publication :</span> Melchior Delacour</li>
                    <li className="flex items-center gap-2">
                        <span className="font-bold text-sb-green-dark uppercase text-xs tracking-widest mr-2">Email :</span> 
                        <a href="mailto:delacour.melchior@cabinetdelacour.com" className="text-[#C5A065] hover:text-sb-green-dark transition-colors font-medium border-b border-transparent hover:border-sb-green-dark">
                            delacour.melchior@cabinetdelacour.com
                        </a>
                    </li>
                    <li><span className="font-bold text-sb-green-dark uppercase text-xs tracking-widest mr-2">SIRET :</span> 999372469</li>
                </ul>
            </div>
          </div>

          {/* Bloc 2 : Hébergement */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px] shadow-sm">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <Server size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark font-bold uppercase">2. Hébergement</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed">
                <p>
                    Ce site est hébergé par une infrastructure cloud sécurisée respectant les normes européennes.
                </p>
                <p className="mt-4">
                    <strong>Hébergeur :</strong> Hostinger<br/>
                    Hostinger International Ltd., 61 Lordou Vironos Street, 6023 Larnaca, Chypre.
                </p>
            </div>
          </div>

          {/* Bloc 3 : Propriété Intellectuelle */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px] shadow-sm">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <Shield size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark font-bold uppercase">3. Propriété Intellectuelle</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed space-y-4">
                <p>
                    L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                </p>
                <p>
                    Toute reproduction, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de <strong>Cabinet Delacour</strong>.
                </p>
            </div>
          </div>

          {/* Bloc 4 : Données Personnelles (RGPD) */}
          <div className="bg-white p-10 border border-gray-200 rounded-[2px] shadow-sm">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 bg-sb-green-dark flex items-center justify-center text-sb-beige rounded-[2px]">
                    <Lock size={20} />
                </div>
                <h2 className="font-serif text-2xl text-sb-green-dark font-bold uppercase">4. Protection des Données (RGPD)</h2>
            </div>
            <div className="text-sb-green-dark/80 font-light leading-relaxed space-y-6">
                <p>
                    Cabinet Delacour s'engage à ce que la collecte et le traitement de vos données, effectués à partir du site, soient conformes au règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.
                </p>
                
                <div className="space-y-4">
                    <h3 className="font-bold text-sb-green-dark uppercase tracking-widest text-[10px] border-l-2 border-[#C5A065] pl-3">Données collectées</h3>
                    <p className="text-sm">
                        Les données personnelles collectées via le formulaire de contact (Nom, Prénom, Email, Société) sont destinées exclusivement à Cabinet Delacour pour le traitement de votre demande. Elles ne sont en aucun cas transmises à des tiers.
                    </p>

                    <h3 className="font-bold text-sb-green-dark uppercase tracking-widest text-[10px] border-l-2 border-[#C5A065] pl-3">Vos droits</h3>
                    <p className="text-sm">
                        Conformément à la réglementation, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition concernant vos données personnelles. Pour exercer ce droit, contactez-nous par email à : <a href="mailto:delacour.melchior@cabinetdelacour.com" className="text-[#C5A065] font-bold hover:underline">delacour.melchior@cabinetdelacour.com</a>
                    </p>
                </div>
            </div>
          </div>

        </div>
      </Section>
    </>
  );
};

export default Legal;
