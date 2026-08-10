import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { X, LogOut, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExitModalProps {
  onNavigate: (page: Page) => void;
}

const ExitModal: React.FC<ExitModalProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  useEffect(() => {
    // Vérification de la session
    const dismissedSession = sessionStorage.getItem('exit_modal_dismissed');
    if (dismissedSession) {
      setHasDismissed(true);
    }

    // Gestion du départ via la fermeture d'onglet/navigateur (beforeunload)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    // Détection d'intention de sortie (mouvement de la souris vers le haut de la fenêtre)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 15 && !hasDismissed) {
        setIsOpen(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasDismissed]);

  const handleClose = () => {
    setIsOpen(false);
    setHasDismissed(true);
    sessionStorage.setItem('exit_modal_dismissed', 'true');
  };

  const handleStay = () => {
    handleClose();
  };

  const handleGoToDiagnostic = () => {
    handleClose();
    onNavigate(Page.DIAGNOSTIC);
  };

  const handleConfirmExit = () => {
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Arrière-plan flouté */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleStay}
            className="fixed inset-0 bg-sb-black/80 backdrop-blur-md"
          />

          {/* Pop-up Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-sb-green-dark border-2 border-sb-beige/30 p-8 shadow-2xl z-10 rounded-sm text-white overflow-hidden"
          >
            {/* Ligne décorative dorée supérieure */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sb-beige via-white to-sb-beige" />

            {/* Bouton Fermer (X) */}
            <button
              onClick={handleStay}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-2"
              aria-label="Fermer la boîte de dialogue"
            >
              <X size={24} />
            </button>

            {/* Contenu */}
            <div className="flex flex-col items-center text-center space-y-6 pt-2">
              {/* Icône */}
              <div className="w-16 h-16 rounded-full bg-sb-beige/10 border border-sb-beige/30 flex items-center justify-center text-sb-beige shadow-inner">
                <LogOut size={28} className="ml-1 text-sb-beige" />
              </div>

              {/* Titre & Message */}
              <div className="space-y-2">
                <h3 className="font-serif text-2xl md:text-3xl text-sb-beige font-bold leading-tight">
                  Voulez-vous vraiment quitter la page ?
                </h3>
                <p className="font-sans text-sm text-white/80 leading-relaxed max-w-md">
                  Avant de partir, évaluez gratuitement la maturité et les opportunités QHSE de votre entreprise en seulement 2 minutes.
                </p>
              </div>

              {/* Points forts / Avantages */}
              <div className="w-full bg-white/5 border border-white/10 rounded p-4 text-left space-y-2">
                <div className="flex items-start space-x-3 text-xs md:text-sm text-sb-beige">
                  <CheckCircle2 size={18} className="text-sb-beige shrink-0 mt-0.5" />
                  <span>Identification des gisements de marge inexploités</span>
                </div>
                <div className="flex items-start space-x-3 text-xs md:text-sm text-sb-beige">
                  <CheckCircle2 size={18} className="text-sb-beige shrink-0 mt-0.5" />
                  <span>Rapport personnalisé instantané 100% confidentiel</span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col w-full space-y-3 pt-2">
                <button
                  onClick={handleGoToDiagnostic}
                  className="w-full py-4 bg-sb-beige text-sb-green-dark font-sans font-bold text-xs uppercase tracking-math-wide hover:bg-white transition-all shadow-lg flex items-center justify-center space-x-2 group rounded-sm"
                >
                  <span>Lancer le diagnostic offert (2 min)</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={handleStay}
                    className="py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-sans text-xs uppercase tracking-math-wide transition-colors rounded-sm"
                  >
                    Rester sur le site
                  </button>
                  <button
                    onClick={handleConfirmExit}
                    className="py-3 px-4 bg-transparent hover:bg-red-500/20 border border-red-400/30 text-red-200 hover:text-red-100 font-sans text-xs uppercase tracking-math-wide transition-colors rounded-sm"
                  >
                    Quitter la page
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExitModal;
