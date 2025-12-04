import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from '@/contexts/project-context';
import { BudgetProvider } from '@/contexts/budget-context';
import { Layout } from '@/components/layout/Layout';
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
import type { OrcamentoItem, PlanejamentoItem } from '@/types';
import { initialOrcamentoData } from '@/data/mockData';
import { BudgetService } from '@/services/BudgetService';
import '@/styles/design-system.css';
import '@/styles/globals.css';

const App: React.FC = () => {
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

  return (
    <ProjectProvider>
      <BudgetProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Layout
                    isMobileMenuOpen={isMobileMenuOpen}
                    setMobileMenuOpen={setMobileMenuOpen}
                  />
                }
              >
                <Route index element={<Dashboard />} />
                <Route
                  path="orcamento"
                  element={
                    <Orcamento
                      orcamentoData={orcamentoData}
                      setOrcamentoData={setOrcamentoData}
                    />
                  }
                />
                <Route path="planejamento" element={<Planejamento />} />
                <Route path="composicao" element={<ComposicaoCustos />} />
                <Route path="diario" element={<DiarioDeObra />} />
                <Route path="medicao" element={<Medicao />} />
                <Route path="curva-abc" element={<CurvaABC />} />
                <Route path="compras" element={<Compras />} />
                <Route path="financeiro" element={<Financeiro />} />
                <Route path="clima" element={<Clima />} />
                <Route
                  path="settings"
                  element={
                    <ErrorBoundary>
                      <Settings />
                    </ErrorBoundary>
                  }
                />
                {/* Rota padrão para redirecionar URLs desconhecidas para o Dashboard */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </BudgetProvider>
    </ProjectProvider>
  );
};

export default App;
