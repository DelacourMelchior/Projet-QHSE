
import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../constants';
import { Page } from '../types';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const LogoIcon: React.FC<{ className?: string, starColor?: string }> = ({ className = "text-current", starColor = "currentColor" }) => (
  <svg viewBox="0 0 100 87" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M50 3L97 84H3L50 3Z" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter"/>
    <path d="M50 25L78 74H22L50 25Z" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"/>
    <path d="M50 49L52 55L58 57L52 59L50 65L48 59L42 57L48 55L50 49Z" fill={starColor} />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const hasDarkHero = [
    Page.HOME, 
    Page.SERVICES, 
    Page.METHOD, 
    Page.LEGAL,
    Page.OFFER_ISO,
    Page.OFFER_EXECUTION,
    Page.OFFER_AUDIT,
    Page.OFFER_ROBUSTESSE,
    Page.IMPACT_RISQUE,
    Page.IMPACT_SYSTEME,
    Page.IMPACT_DATA
  ].includes(currentPage);
  
  const showSolidNav = isScrolled || !hasDarkHero;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-sb-cream font-sans text-sb-green-dark selection:bg-sb-green-dark selection:text-sb-beige">
      <nav
        className={`fixed w-full z-50 transition-all duration-300 border-b ${
          showSolidNav 
            ? 'bg-sb-green-dark border-sb-beige/10 py-4 shadow-xl' 
            : 'bg-transparent border-transparent py-8'
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          <button 
            onClick={() => onNavigate(Page.HOME)} 
            className="flex items-center space-x-4 group focus:outline-none"
          >
            <div className={`w-14 h-14 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 text-white`}>
                <LogoIcon className="w-full h-full" starColor="#F0EAD6" />
            </div>
            
            <div className="flex flex-col items-start">
                 <span className={`font-sans text-lg tracking-math-wide uppercase font-bold transition-colors leading-none text-sb-beige`}>Cabinet</span>
                 <span className={`font-sans text-lg tracking-math-wide uppercase font-bold transition-colors leading-none text-white`}>Delacour</span>
            </div>
          </button>

          <div className="hidden md:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => {
                const isActive = currentPage === item.page;
                let textClass = isActive ? 'text-sb-beige border-b-2 border-sb-beige' : 'text-white hover:text-sb-beige';
                return (
                    <button
                        key={item.page}
                        onClick={() => onNavigate(item.page)}
                        className={`py-1 text-xs uppercase tracking-math-wide font-medium transition-all duration-300 ${textClass}`}
                    >
                        {item.label}
                    </button>
                );
            })}
          </div>

          <button 
            className={`md:hidden transition-colors text-sb-beige`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
          <div className="md:hidden bg-sb-green-dark fixed inset-0 z-[60] flex flex-col justify-center items-center space-y-10">
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 text-sb-beige z-[70]">
                <X size={32} />
            </button>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate(item.page);
                  setIsMobileMenuOpen(false);
                }}
                className="text-2xl font-serif text-white hover:text-sb-beige transition-colors uppercase tracking-math-wide"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-sb-green-dark text-white pt-24 pb-12 border-t-4 border-sb-beige">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 pb-20">
              
              {/* COLONNE 1 : IDENTITÉ (4/12) */}
              <div className="md:col-span-4 space-y-8">
                  <div className="flex items-start space-x-5">
                       <div className="w-16 h-16 text-white flex-shrink-0">
                          <LogoIcon className="w-full h-full" starColor="#F0EAD6" />
                      </div>
                      <div className="flex flex-col">
                           <h3 className="font-sans text-2xl font-black tracking-[0.05em] uppercase leading-[0.85] text-white">Cabinet</h3>
                           <h3 className="font-sans text-2xl font-black tracking-[0.05em] uppercase leading-[0.85] text-white">Delacour</h3>
                      </div>
                  </div>
                  <div className="space-y-3 pt-2">
                      <p className="font-sans text-xl font-bold tracking-tight text-white">
                        Stratégie & Performance QHSE.
                      </p>
                      <p className="font-sans text-lg font-light text-white/60 leading-relaxed max-w-sm">
                        Rigueur institutionnelle et excellence opérationnelle.
                      </p>
                  </div>
              </div>

              {/* COLONNE 2 : NAVIGATION (3/12) */}
              <div className="md:col-span-3">
                  <h4 className="font-sans font-bold text-[11px] uppercase tracking-[0.25em] text-white mb-8 inline-block border-b border-white/30 pb-1">Navigation</h4>
                  <ul className="space-y-4">
                      {NAV_ITEMS.map((item) => (
                        <li key={item.page}>
                            <button 
                                onClick={() => onNavigate(item.page)}
                                className="font-sans text-sm uppercase tracking-widest text-white/60 hover:text-white transition-colors text-left"
                            >
                                {item.label}
                            </button>
                        </li>
                      ))}
                  </ul>
              </div>
              
              {/* COLONNE 3 : CONTACT (5/12 - Élargie pour l'email) */}
              <div className="md:col-span-5">
                  <h4 className="font-sans font-bold text-[11px] uppercase tracking-[0.25em] text-white mb-8 inline-block border-b border-white/30 pb-1">Contact</h4>
                  <div className="space-y-5">
                      <p className="font-sans text-sm tracking-wide text-white/60">
                        13770 Venelles, France
                      </p>
                      <div className="block">
                          <a 
                            href="mailto:delacour.melchior@cabinetdelacour.com" 
                            className="font-sans text-[13px] lg:text-sm tracking-wide text-white/60 hover:text-white transition-colors block md:whitespace-nowrap"
                            title="delacour.melchior@cabinetdelacour.com"
                          >
                            delacour.melchior@cabinetdelacour.com
                          </a>
                      </div>
                  </div>
              </div>
            </div>
            
            {/* BASEMENT */}
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] text-white/30 font-medium uppercase tracking-[0.2em]">
                <p>© 2026 Cabinet Delacour. Tous droits réservés.</p>
                <div className="mt-4 md:mt-0 flex space-x-8">
                    <button 
                        onClick={() => onNavigate(Page.LEGAL)} 
                        className="hover:text-white transition-colors"
                    >
                        Mentions Légales
                    </button>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
