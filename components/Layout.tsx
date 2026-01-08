
import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../constants';
import { Page } from '../types';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

// Reproduction vectorielle fidèle du logo Cabinet Delacour
// Double Triangle + Étoile Centrale (Recentrée optiquement Y+7)
const LogoIcon: React.FC<{ className?: string, starColor?: string }> = ({ className = "text-current", starColor = "currentColor" }) => (
  <svg viewBox="0 0 100 87" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Grand Triangle Extérieur */}
    <path d="M50 3L97 84H3L50 3Z" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter"/>
    {/* Petit Triangle Intérieur */}
    <path d="M50 25L78 74H22L50 25Z" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"/>
    {/* Étoile Centrale (Style Polaire/Compas) - Recentrée Y+7 */}
    <path d="M50 49L52 55L58 57L52 59L50 65L48 59L42 57L48 55L50 49Z" fill={starColor} />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pages that start with a dark green background
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
  
  // Show Solid Dark Navbar if scrolled OR if the page has a light hero (to ensure contrast)
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
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-300 border-b ${
          showSolidNav 
            ? 'bg-sb-green-dark border-sb-beige/10 py-4 shadow-xl' 
            : 'bg-transparent border-transparent py-8'
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <button 
            onClick={() => onNavigate(Page.HOME)} 
            className="flex items-center space-x-4 group focus:outline-none"
          >
            {/* Logo Vectoriel - Always White Theme in Navbar */}
            <div className={`w-14 h-14 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 text-white`}>
                <LogoIcon className="w-full h-full" starColor="#F0EAD6" />
            </div>
            
            <div className="flex flex-col items-start">
                 <span className={`font-sans text-lg tracking-math-wide uppercase font-bold transition-colors leading-none text-sb-beige`}>Cabinet</span>
                 <span className={`font-sans text-lg tracking-math-wide uppercase font-bold transition-colors leading-none text-white`}>Delacour</span>
            </div>
          </button>

          {/* Desktop Menu - Strict & Square - Always White Theme */}
          <div className="hidden md:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => {
                const isActive = currentPage === item.page;
                
                // Text color logic - Always White Theme
                let textClass = '';
                if (isActive) {
                    textClass = 'text-sb-beige border-b-2 border-sb-beige';
                } else {
                    textClass = 'text-white hover:text-sb-beige';
                }

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

          {/* Mobile Toggle - Always White Theme */}
          <button 
            className={`md:hidden transition-colors text-sb-beige`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu - Strict */}
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

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer - Massive & Dark */}
      <footer className="bg-sb-green-dark text-sb-cream pt-fib-89 pb-12 mt-auto border-t-4 border-sb-beige">
        <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-16 border-b border-sb-beige/10 pb-16">
            <div className="col-span-1 md:col-span-2 space-y-8">
                <div className="flex items-center space-x-4 mb-4">
                     <div className="w-20 text-white">
                        <LogoIcon className="w-full h-full" starColor="#F0EAD6" />
                    </div>
                    <div>
                         <h3 className="font-sans text-2xl font-bold tracking-math-wide uppercase leading-none text-sb-beige">Cabinet</h3>
                         <h3 className="font-sans text-2xl font-bold tracking-math-wide uppercase leading-none text-white">Delacour</h3>
                    </div>
                </div>
                <p className="text-white/80 max-w-md leading-phi font-light text-body">
                <span className="text-sb-beige font-medium">Stratégie & Performance QHSE.</span><br/>
                Rigueur institutionnelle et excellence opérationnelle.
                </p>
            </div>
            <div>
                <h4 className="font-bold uppercase tracking-math-wide mb-8 text-xs text-sb-beige border-b border-sb-beige/20 pb-2 inline-block">Navigation</h4>
                <ul className="space-y-4 text-white/80 text-sm tracking-wide">
                {NAV_ITEMS.map(item => (
                    <li key={item.page}>
                    <button onClick={() => onNavigate(item.page)} className="hover:text-sb-beige transition-colors duration-300 uppercase">
                        {item.label}
                    </button>
                    </li>
                ))}
                </ul>
            </div>
            <div>
                <h4 className="font-bold uppercase tracking-math-wide mb-8 text-xs text-sb-beige border-b border-sb-beige/20 pb-2 inline-block">Contact</h4>
                <ul className="space-y-4 text-white/80 font-light text-sm tracking-wide">
                <li>13100 Aix En Provence, France</li>
                <li><a href="mailto:delacour.melchior@cabinetdelacour.com" className="hover:text-sb-beige transition-colors">contact@cabinet-delacour.fr</a></li>
                </ul>
            </div>
            </div>
            
            <div className="pt-8 flex flex-col md:flex-row justify-between items-center text-meta text-white/40 font-light uppercase tracking-wider">
                <p>© 2026 Cabinet Delacour. Tous droits réservés.</p>
                <div className="mt-4 md:mt-0">
                    <button 
                        onClick={() => onNavigate(Page.LEGAL)} 
                        className="hover:text-sb-beige transition-colors"
                    >
                        Mentions Légales & Politique de Confidentialité
                    </button>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
