import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Home from './views/Home';
import About from './views/About';
import Services from './views/Services';
import Method from './views/Method';
import Contact from './views/Contact';
import Legal from './views/Legal';
import OfferIso from './views/OfferIso';
import OfferExecution from './views/OfferExecution';
import OfferAudit from './views/OfferAudit';
import OfferRobustesse from './views/OfferRobustesse';
import ImpactRisque from './views/ImpactRisque';
import ImpactSysteme from './views/ImpactSysteme';
import ImpactData from './views/ImpactData';
import { Page } from './types';

// Définition simplifiée des routes
const ROUTES: { path: string; page: Page }[] = [
  { path: '/a-propos', page: Page.ABOUT },
  { path: '/prestations', page: Page.SERVICES },
  { path: '/methode', page: Page.METHOD },
  { path: '/contact', page: Page.CONTACT },
  { path: '/mentions-legales', page: Page.LEGAL },
  { path: '/iso-9001', page: Page.OFFER_ISO },
  { path: '/structuration-performance', page: Page.OFFER_EXECUTION },
  { path: '/audit-blanc', page: Page.OFFER_AUDIT },
  { path: '/audit-robustesse', page: Page.OFFER_ROBUSTESSE },
  { path: '/impact-financier', page: Page.IMPACT_RISQUE },
  { path: '/impact-systeme', page: Page.IMPACT_SYSTEME },
  { path: '/impact-data', page: Page.IMPACT_DATA },
];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);

  const getPageFromHash = useCallback(() => {
    const hash = window.location.hash || '';
    
    // 1. Si on a un paramètre ?p= (ancienne méthode), on nettoie l'URL et on ignore
    if (window.location.search.includes('p=')) {
        window.history.replaceState(null, '', window.location.pathname + (hash || '#/'));
    }

    // 2. Recherche de la page correspondante
    // On utilise endsWith pour être compatible avec les sous-dossiers de GitHub Pages
    const matchedRoute = ROUTES.find(route => hash.endsWith(route.path));
    
    if (matchedRoute) {
        return matchedRoute.page;
    }

    // 3. Par défaut, c'est l'accueil
    return Page.HOME;
  }, []);

  useEffect(() => {
    // Initialisation
    setCurrentPage(getPageFromHash());

    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [getPageFromHash]);

  const navigate = (page: Page) => {
    if (page === Page.HOME) {
        window.location.hash = '#/';
        return;
    }
    const route = ROUTES.find(r => r.page === page);
    if (route) {
        window.location.hash = '#' + route.path;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.HOME: return <Home onNavigate={navigate} />;
      case Page.ABOUT: return <About onNavigate={navigate} />;
      case Page.SERVICES: return <Services onNavigate={navigate} />;
      case Page.METHOD: return <Method onNavigate={navigate} />;
      case Page.CONTACT: return <Contact onNavigate={navigate} />;
      case Page.LEGAL: return <Legal onNavigate={navigate} />;
      case Page.OFFER_ISO: return <OfferIso onNavigate={navigate} />;
      case Page.OFFER_EXECUTION: return <OfferExecution onNavigate={navigate} />;
      case Page.OFFER_AUDIT: return <OfferAudit onNavigate={navigate} />;
      case Page.OFFER_ROBUSTESSE: return <OfferRobustesse onNavigate={navigate} />;
      case Page.IMPACT_RISQUE: return <ImpactRisque onNavigate={navigate} />;
      case Page.IMPACT_SYSTEME: return <ImpactSysteme onNavigate={navigate} />;
      case Page.IMPACT_DATA: return <ImpactData onNavigate={navigate} />;
      default: return <Home onNavigate={navigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      {renderPage()}
    </Layout>
  );
};

export default App;
