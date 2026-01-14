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

// On mappe le "slug" (le dernier mot de l'URL) directement vers la Page
const SLUG_TO_PAGE: Record<string, Page> = {
  'a-propos': Page.ABOUT,
  'prestations': Page.SERVICES,
  'methode': Page.METHOD,
  'contact': Page.CONTACT,
  'mentions-legales': Page.LEGAL,
  'iso-9001': Page.OFFER_ISO,
  'structuration-performance': Page.OFFER_EXECUTION,
  'audit-blanc': Page.OFFER_AUDIT,
  'audit-robustesse': Page.OFFER_ROBUSTESSE,
  'impact-financier': Page.IMPACT_RISQUE,
  'impact-systeme': Page.IMPACT_SYSTEME,
  'impact-data': Page.IMPACT_DATA,
  // Pas de slug pour Home, c'est le défaut
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);

  const getPageFromHash = useCallback(() => {
    // 1. Récupération du hash brut
    let hash = window.location.hash;

    // 2. Nettoyage radical : on enlève les paramètres de requête (?) et le slash de fin
    if (hash.includes('?')) hash = hash.split('?')[0];
    if (hash.endsWith('/')) hash = hash.slice(0, -1);

    // 3. Extraction du dernier segment (ex: "#/mon-repo/contact" -> "contact")
    const segments = hash.split('/');
    const lastSegment = segments[segments.length - 1];

    // 4. Correspondance
    // Si le segment est vide ou n'existe pas dans notre liste, c'est l'ACCUEIL
    if (!lastSegment || lastSegment === '#' || !SLUG_TO_PAGE[lastSegment]) {
        return Page.HOME;
    }

    return SLUG_TO_PAGE[lastSegment];
  }, []);

  useEffect(() => {
    // Nettoyage de l'URL au chargement (suppression des vieux ?p=)
    if (window.location.search.includes('p=')) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // Définition de la page initiale
    setCurrentPage(getPageFromHash());

    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [getPageFromHash]);

  const navigate = (page: Page) => {
    // Pour naviguer, on reconstruit un hash simple
    if (page === Page.HOME) {
        window.location.hash = '#/';
        return;
    }

    // On trouve le slug correspondant à la page demandée
    const slug = Object.keys(SLUG_TO_PAGE).find(key => SLUG_TO_PAGE[key] === page);
    
    if (slug) {
        window.location.hash = '#/' + slug;
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
