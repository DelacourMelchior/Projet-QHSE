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

const PAGE_TO_HASH: Record<Page, string> = {
  [Page.HOME]: '#/',
  [Page.ABOUT]: '#/a-propos',
  [Page.SERVICES]: '#/prestations',
  [Page.METHOD]: '#/methode',
  [Page.CONTACT]: '#/contact',
  [Page.LEGAL]: '#/mentions-legales',
  [Page.OFFER_ISO]: '#/iso-9001',
  [Page.OFFER_EXECUTION]: '#/structuration-performance',
  [Page.OFFER_AUDIT]: '#/audit-blanc',
  [Page.OFFER_ROBUSTESSE]: '#/audit-robustesse',
  [Page.IMPACT_RISQUE]: '#/impact-financier',
  [Page.IMPACT_SYSTEME]: '#/impact-systeme',
  [Page.IMPACT_DATA]: '#/impact-data',
};

const HASH_TO_PAGE: Record<string, Page> = Object.entries(PAGE_TO_HASH).reduce(
  (acc, [page, hash]) => ({ ...acc, [hash]: page as Page }),
  {}
);

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);

  const getPageFromHash = useCallback(() => {
    const hash = window.location.hash;
    // Si pas de hash ou hash vide, on est sur HOME
    if (!hash || hash === '#' || hash === '#/') return Page.HOME;
    return HASH_TO_PAGE[hash] || Page.HOME;
  }, []);

  useEffect(() => {
    // Détection initiale de la page au chargement
    setCurrentPage(getPageFromHash());

    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [getPageFromHash]);

  const navigate = (page: Page) => {
    const hash = PAGE_TO_HASH[page];
    if (window.location.hash !== hash) {
      window.location.hash = hash;
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
