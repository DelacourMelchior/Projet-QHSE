


import React, { useState, useEffect } from 'react';
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

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case Page.HOME:
        return <Home onNavigate={setCurrentPage} />;
      case Page.ABOUT:
        return <About onNavigate={setCurrentPage} />;
      case Page.SERVICES:
        return <Services onNavigate={setCurrentPage} />;
      case Page.METHOD:
        return <Method onNavigate={setCurrentPage} />;
      case Page.CONTACT:
        return <Contact />;
      case Page.LEGAL:
        return <Legal />;
      case Page.OFFER_ISO:
        return <OfferIso onNavigate={setCurrentPage} />;
      case Page.OFFER_EXECUTION:
        return <OfferExecution onNavigate={setCurrentPage} />;
      case Page.OFFER_AUDIT:
        return <OfferAudit onNavigate={setCurrentPage} />;
      case Page.OFFER_ROBUSTESSE:
        return <OfferRobustesse onNavigate={setCurrentPage} />;
      case Page.IMPACT_RISQUE:
        return <ImpactRisque onNavigate={setCurrentPage} />;
      case Page.IMPACT_SYSTEME:
        return <ImpactSysteme onNavigate={setCurrentPage} />;
      case Page.IMPACT_DATA:
        return <ImpactData onNavigate={setCurrentPage} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default App;