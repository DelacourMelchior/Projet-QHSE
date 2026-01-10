
import React from 'react';
import Section from '../components/Section';
import { Page } from '../types';

interface AboutProps {
  onNavigate: (page: Page) => void;
}

const About: React.FC<AboutProps> = ({ onNavigate }) => {
  return (
    <>
      <Section bg="cream" className="pt-fib-144 pb-32">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center">
              <h3 className="text-xs text-sb-green-dark font-bold uppercase tracking-math-wide mb-4 border-b border-sb-green-dark inline-block pb-2">À propos</h3>
              <h2 className="font-serif text-4xl md:text-6xl text-sb-green-dark leading-[1.1] mt-4 tracking-math-tight uppercase">
              LA RIGUEUR DES <br/>GRANDS GROUPES.<br/> L'AGILITÉ D'UNE PME.
              </h2>
          </div>
          
          <div className="space-y-8 text-body leading-relaxed text-sb-green-dark/80 font-light text-justify font-sans">
            <p>
              Mon approche ne vient pas de la théorie, mais du terrain critique. Pour autant, elle s'appuie sur une base académique rigoureuse et spécialisée.
            </p>
            <p>
              Titulaire d'un <span className="text-sb-green-dark font-medium italic">Master 2 en Management QHSE et Excellence Opérationnelle</span>, j'ai suivi un cursus universitaire de 5 années exclusivement dédié à ces disciplines. Ce socle théorique m'a permis de maîtriser les normes et les outils de performance les plus exigeants avant de les confronter à la réalité des flux industriels.
            </p>
            <p>
              J'ai construit ma méthodologie au cœur de la Sûreté Aéroportuaire, de l'Industrie Aéronautique et de la Mécanique de Précision. Dans ces environnements où l'erreur a des conséquences immédiates, j'ai appris que la fiabilité n'est pas un hasard. C'est le résultat d'une architecture invisible et implacable.
            </p>
            <p>
              Aujourd'hui, je transfère cette culture de l'excellence vers les PME ambitieuses. Mon constat est simple : trop de dirigeants subissent leur croissance au lieu de la piloter. Ils possèdent la vision et l'énergie, mais il leur manque la structure pour passer à l'échelle supérieure sans créer de chaos interne.
            </p>
            <p>
              Je n'interviens pas pour alourdir votre quotidien. J'interviens pour bâtir la colonne vertébrale qui soutiendra votre développement futur. Mon rôle est d'élever vos standards opérationnels au niveau des leaders industriels, tout en préservant votre pragmatisme de dirigeant.
            </p>
          </div>
          
          <div className="pt-12 border-t border-sb-green-dark/10 text-center">
               <p className="font-serif text-3xl text-sb-green-dark italic">M. DELACOUR</p>
               <p className="text-xs font-bold uppercase tracking-widest text-sb-green-dark/40 mt-2">Fondateur du Cabinet Delacour</p>
          </div>
        </div>
      </Section>
    </>
  );
};

export default About;
