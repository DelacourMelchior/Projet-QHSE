
import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Plane, Eye, Target } from 'lucide-react';
import Section from '../components/Section';
import { Page } from '../types';

interface AboutProps {
  onNavigate: (page: Page) => void;
}

const About: React.FC<AboutProps> = ({ onNavigate }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <>
      <Section bg="cream" className="pt-32 pb-32 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h3 className="text-xs text-sb-green-dark font-bold uppercase tracking-widest mb-4 border-b border-sb-green-dark inline-block pb-2">
              À propos
            </h3>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-sb-green-dark leading-[1.1] mt-4 tracking-tight uppercase max-w-4xl mx-auto">
              LA RIGUEUR DES GRANDS GROUPES.<br/>
              <span className="text-sb-green-dark/80 italic font-serif">L'AGILITÉ D'UNE PME.</span>
            </h2>
            <p className="mt-10 text-xl md:text-2xl text-sb-green-dark/80 font-light max-w-3xl mx-auto leading-relaxed italic">
              "Mon approche ne vient pas de la théorie, mais du terrain critique. Pour autant, elle s'appuie sur une base académique rigoureuse et spécialisée."
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 mt-16"
          >
            {/* Block 1: Académique */}
            <motion.div variants={itemVariants} className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-sb-green-dark/5 relative overflow-hidden group hover:border-sb-green-dark/20 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
              <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none">
                <GraduationCap size={160} className="text-sb-green-dark" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-sb-green-dark/5 rounded-xl flex items-center justify-center mb-6">
                  <GraduationCap size={28} className="text-sb-green-dark" />
                </div>
                <h4 className="text-2xl font-serif text-sb-green-dark mb-4">Le Socle Académique</h4>
                <p className="text-lg leading-relaxed text-sb-green-dark/80 font-light">
                  Titulaire d'un <span className="font-medium text-sb-green-dark">Master 2 en Management QHSE et Excellence Opérationnelle</span>, j'ai suivi un cursus universitaire de 5 années exclusivement dédié à ces disciplines. Ce socle m'a permis de maîtriser les normes et les outils de performance les plus exigeants.
                </p>
              </div>
            </motion.div>

            {/* Block 2: Terrain */}
            <motion.div variants={itemVariants} className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-sb-green-dark/5 relative overflow-hidden group hover:border-sb-green-dark/20 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
              <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none">
                <Plane size={160} className="text-sb-green-dark" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-sb-green-dark/5 rounded-xl flex items-center justify-center mb-6">
                  <Plane size={28} className="text-sb-green-dark" />
                </div>
                <h4 className="text-2xl font-serif text-sb-green-dark mb-4">Le Terrain Critique</h4>
                <p className="text-lg leading-relaxed text-sb-green-dark/80 font-light">
                  J'ai construit ma méthodologie au cœur de la <span className="font-medium text-sb-green-dark">Sûreté Aéroportuaire</span>, de l'<span className="font-medium text-sb-green-dark">Industrie Aéronautique</span> et de la <span className="font-medium text-sb-green-dark">Mécanique de Précision</span>. Dans ces environnements, j'ai appris que la fiabilité n'est pas un hasard : c'est une architecture.
                </p>
              </div>
            </motion.div>

            {/* Block 3: Constat */}
            <motion.div variants={itemVariants} className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-sb-green-dark/5 relative overflow-hidden group hover:border-sb-green-dark/20 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
              <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none">
                <Eye size={160} className="text-sb-green-dark" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-sb-green-dark/5 rounded-xl flex items-center justify-center mb-6">
                  <Eye size={28} className="text-sb-green-dark" />
                </div>
                <h4 className="text-2xl font-serif text-sb-green-dark mb-4">Le Constat</h4>
                <p className="text-lg leading-relaxed text-sb-green-dark/80 font-light">
                  Aujourd'hui, je transfère cette culture de l'excellence vers les PME. <span className="font-medium text-sb-green-dark">Trop de dirigeants subissent leur croissance au lieu de la piloter</span>. Il leur manque la structure pour passer à l'échelle supérieure sans créer de chaos interne.
                </p>
              </div>
            </motion.div>

            {/* Block 4: Promesse */}
            <motion.div variants={itemVariants} className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-sb-green-dark/5 relative overflow-hidden group hover:border-sb-green-dark/20 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
              <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none">
                <Target size={160} className="text-sb-green-dark" strokeWidth={1} />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-sb-green-dark/5 rounded-xl flex items-center justify-center mb-6">
                  <Target size={28} className="text-sb-green-dark" />
                </div>
                <h4 className="text-2xl font-serif text-sb-green-dark mb-4">La Promesse</h4>
                <p className="text-lg leading-relaxed text-sb-green-dark/80 font-light">
                  Je n'interviens pas pour alourdir votre quotidien. J'interviens pour <span className="font-medium text-sb-green-dark">bâtir la colonne vertébrale qui soutiendra votre développement futur</span>. Mon rôle est d'élever vos standards opérationnels, tout en préservant votre pragmatisme.
                </p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="pt-20 mt-12 text-center"
          >
            <div className="w-24 h-px bg-sb-green-dark/20 mx-auto mb-10"></div>
            <p className="font-serif text-4xl text-sb-green-dark italic">M. DELACOUR</p>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sb-green-dark/40 mt-4">Fondateur du Cabinet Delacour</p>
          </motion.div>
        </div>
      </Section>
    </>
  );
};

export default About;
