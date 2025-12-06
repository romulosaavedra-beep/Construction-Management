import React, { useState, useEffect } from 'react';
import { ProjectProvider } from '@/contexts/project-context';
import { BudgetProvider } from '@/contexts/budget-context';
import { Sidebar, Header, MobileHeader } from '@/components/layout';
import { Toaster } from '@/components/ui-advanced/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import Dashboard from '@/modules/Dashboard';
import DiarioDeObra from '@/modules/DiarioDeObra';
import Orcamento from '@/modules/Orcamento';
import ComposicaoCustos from '@/modules/ComposicaoCustos';
import Planejamento from '@/modules/Planejamento';
import CurvaABC from '@/modules/CurvaABC';
import Medicao from '@/modules/Medicao';
import Compras from '@/modules/Compras';
import Financeiro from '@/modules/Financeiro';
import Clima from '@/modules/Clima';
import Settings from '@/modules/Settings';
import type { Module, OrcamentoItem, PlanejamentoItem } from '@/types';
import { initialOrcamentoData } from '@/data/mockData';
import { BudgetService } from '@/services/BudgetService';
import '@/styles/design-system.css';
import '@/styles/globals.css';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orcamentoData, setOrcamentoData] = useState<OrcamentoItem[]>(initialOrcamentoData);
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);

  useEffect(() => {
    const loadedBudget = BudgetService.loadBudget();
    if (loadedBudget) {
      setOrcamentoData(loadedBudget);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'orcamento':
        return <Orcamento orcamentoData={orcamentoData} setOrcamentoData={setOrcamentoData} />;
      case 'planejamento':
        return <Planejamento />;
      case 'composicao':
        return <ComposicaoCustos />;
      case 'diario':
        return <DiarioDeObra />;
      case 'medicao':
        return <Medicao />;
      case 'curva-abc':
        return <CurvaABC />;
      case 'compras':
        return <Compras />;
      case 'financeiro':
        return <Financeiro />;
      case 'clima':
        return <Clima setActiveModule={setActiveModule} />;
      case 'settings':
        return (
          <ErrorBoundary>
            <Settings />
          </ErrorBoundary>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProjectProvider>
      <BudgetProvider>
        <TooltipProvider>
          {/* Toast Notifications System */}
          <Toaster />

          {/* Mobile Menu Overlay */}
          <div
            className={`fixed inset-0 bg-black/50 z-[999] transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
              }`}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Mobile Header */}
          <MobileHeader
            isMobileMenuOpen={isMobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />

          {/* Main Layout */}
          <div className="flex h-screen w-screen overflow-hidden bg-[var(--ds-bg-base)]">
            {/* Sidebar Navigation */}
            <Sidebar
              activeModule={activeModule}
              setActiveModule={setActiveModule}
              isMobileMenuOpen={isMobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 lg:p-8">
                {renderModule()}
              </main>
            </div>
          </div>
        </TooltipProvider>
      </BudgetProvider>
    </ProjectProvider >
  );
};

export default App;
