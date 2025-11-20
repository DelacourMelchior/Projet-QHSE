import React, { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../constants';
import { Page } from '../types';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-sb-cream font-sans text-sb-black selection:bg-sb-green-light selection:text-white">
      {/* Navigation */}
      <nav
        className={`fixed w-full z-50 transition-all duration-500 ${
          isScrolled ? 'bg-sb-green-dark/95 backdrop-blur-md shadow-lg py-3' : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <button 
            onClick={() => onNavigate(Page.HOME)} 
            className="flex items-center space-x-3 group focus:outline-none"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isScrolled ? 'bg-white/10 text-white' : 'bg-sb-green-dark text-white'}`}>
               <span className="font-serif text-2xl font-bold pt-1">M</span>
            </div>
            <span className={`font-serif text-lg tracking-widest uppercase font-bold transition-colors ${isScrolled ? 'text-white' : 'text-sb-green-dark'}`}>Maison Delacour</span>
          </button>

          {/* Desktop Menu */}
          <div className={`hidden md:flex p-1.5 rounded-full ${isScrolled ? '' : 'bg-sb-green-dark/5 backdrop-blur-sm'}`}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`px-6 py-2 rounded-full text-sm uppercase tracking-widest transition-all duration-300 ${
                  currentPage === item.page 
                    ? 'bg-sb-green-dark text-white shadow-md' 
                    : isScrolled ? 'text-white hover:bg-white/10' : 'text-sb-green-dark hover:bg-white/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile Toggle */}
          <button 
            className={`md:hidden transition-colors ${isScrolled ? 'text-white' : 'text-sb-green-dark'}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-sb-green-dark fixed inset-0 z-40 flex flex-col justify-center items-center space-y-8">
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-6 text-white">
                <X size={32} />
            </button>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate(item.page);
                  setIsMobileMenuOpen(false);
                }}
                className="text-3xl font-serif text-white hover:text-sb-beige transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-sb-green-dark text-sb-cream py-20 mt-auto">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <span className="font-serif text-xl font-bold pt-1">M</span>
                </div>
                <h3 className="font-serif text-2xl">Maison Delacour</h3>
            </div>
            <p className="text-sb-green-light max-w-md leading-relaxed font-light text-lg">
              Conseil et Excellence en Management de la Qualité.<br/>
              Des interventions à forte valeur ajoutée pour renforcer la performance de votre organisation.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest mb-8 text-xs text-sb-beige">Navigation</h4>
            <ul className="space-y-4 text-sb-green-light">
              {NAV_ITEMS.map(item => (
                <li key={item.page}>
                  <button onClick={() => onNavigate(item.page)} className="hover:text-white transition-colors hover:translate-x-1 transform duration-300 inline-block">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest mb-8 text-xs text-sb-beige">Contact</h4>
            <ul className="space-y-4 text-sb-green-light font-light">
              <li>Paris, France</li>
              <li>contact@maison-delacour.fr</li>
              <li>+33 1 23 45 67 89</li>
              <li className="pt-8 text-xs opacity-40">© 2024 Maison Delacour.<br/>Tous droits réservés.</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;