import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './views/Home';
import About from './views/About';
import Services from './views/Services';
import Method from './views/Method';
import Contact from './views/Contact';
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