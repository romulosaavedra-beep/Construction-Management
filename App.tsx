
import React, { useState, useEffect } from 'react';
import { ProjectProvider } from './contexts/ProjectContext';
import { BudgetProvider } from './contexts/BudgetContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileHeader } from './components/MobileHeader';
import Dashboard from './modules/Dashboard';
import DiarioDeObra from './modules/DiarioDeObra';
import Orcamento from './modules/Orcamento';
import ComposicaoCustos from './modules/ComposicaoCustos';
import Planejamento from './modules/Planejamento';
import CurvaABC from './modules/CurvaABC';
import Medicao from './modules/Medicao';
import Compras from './modules/Compras';
import Financeiro from './modules/Financeiro';
import Clima from './modules/Clima';
import Settings from './modules/Settings';
import type { Module, OrcamentoItem, PlanejamentoItem } from './types';
import { initialOrcamentoData } from './data/mockData';
import { BudgetService } from './services/BudgetService';

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
      case 'dashboard': return <Dashboard />;
      case 'orcamento': return <Orcamento orcamentoData={orcamentoData} setOrcamentoData={setOrcamentoData} />;
      case 'planejamento': return <Planejamento orcamentoData={orcamentoData} savedData={planejamentoData} onSave={setPlanejamentoData} />;
      case 'composicao': return <ComposicaoCustos />;
      case 'diario': return <DiarioDeObra />;
      case 'medicao': return <Medicao />;
      case 'curva-abc': return <CurvaABC />;
      case 'compras': return <Compras />;
      case 'financeiro': return <Financeiro />;
      case 'clima': return <Clima setActiveModule={setActiveModule} />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <ProjectProvider>
      <BudgetProvider>
        <div
          className={`fixed inset-0 bg-black/50 z-[999] transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
          onClick={() => setMobileMenuOpen(false)}
        ></div>

        <MobileHeader isMobileMenuOpen={isMobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        <div className="flex h-screen w-screen overflow-hidden bg-[#0f1419]">
          <Sidebar
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            isMobileMenuOpen={isMobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />

          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 lg:p-8">
              {renderModule()}
            </main>
          </div>
        </div>
      </BudgetProvider>
    </ProjectProvider>
  );
};

export default App;