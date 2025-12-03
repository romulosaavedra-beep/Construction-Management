// src/utils/planning/evmCalculator.ts
// Earned Value Management (EVM) - Gestão de Valor Agregado

export interface EvmMetrics {
    date: string;
    pv: number;  // Planned Value (Valor Planejado)
    ev: number;  // Earned Value (Valor Agregado)
    ac: number;  // Actual Cost (Custo Real)
    cpi: number; // Cost Performance Index
    spi: number; // Schedule Performance Index
    cv: number;  // Cost Variance
    sv: number;  // Schedule Variance
    eac: number; // Estimate At Completion
    etc: number; // Estimate To Complete
    vac: number; // Variance At Completion
    bac: number; // Budget at Completion
    percentComplete: number; // % Conclusão Real
}

export interface Alert {
    id: string;
    tipo: 'CRÍTICO' | 'AVISO' | 'INFO';
    titulo: string;
    descricao: string;
    metrica: string;
    valor: number;
    severidade: number; // 1-10
    dataDate: Date;
    acaoRecomendada: string;
}

export class EVMCalculator {
    private historico: EvmMetrics[] = [];
    private bac: number; // Budget inicial

    constructor(budgetAtCompletion: number) {
        this.bac = budgetAtCompletion;
    }

    /**
     * CONCEITO: Planned Value (PV)
     * Quanto deveria ter gasto até a data, conforme o plano
     * 
     * FÓRMULA: PV = (% concluído planejado) × BAC
     */
    private calculatePV(plannedPercentComplete: number): number {
        return this.bac * (plannedPercentComplete / 100);
    }

    /**
     * CONCEITO: Earned Value (EV)
     * Quanto realmente avancei, em valor
     * 
     * FÓRMULA: EV = (% concluído REAL) × BAC
     */
    private calculateEV(actualPercentComplete: number): number {
        return this.bac * (actualPercentComplete / 100);
    }

    /**
     * CONCEITO: Cost Performance Index (CPI)
     * Eficiência em custo
     * 
     * FÓRMULA: CPI = EV / AC
     * 
     * INTERPRETAÇÃO:
     * - CPI = 1.0 → On-budget (perfeito)
     * - CPI > 1.0 → Sob-orçamento (eficiente) ✅
     * - CPI < 1.0 → Sobre-orçamento (ineficiente) ⚠️
     */
    private calculateCPI(ev: number, ac: number): number {
        if (ac === 0) return 0;
        return ev / ac;
    }

    /**
     * CONCEITO: Schedule Performance Index (SPI)
     * Eficiência no cronograma
     * 
     * FÓRMULA: SPI = EV / PV
     * 
     * INTERPRETAÇÃO:
     * - SPI = 1.0 → On-schedule (no prazo)
     * - SPI > 1.0 → Adiantado ✅
     * - SPI < 1.0 → Atrasado ⚠️
     */
    private calculateSPI(ev: number, pv: number): number {
        if (pv === 0) return 0;
        return ev / pv;
    }

    /**
     * CONCEITO: Cost Variance (CV)
     * Desvio em custo (em reais)
     * 
     * FÓRMULA: CV = EV - AC
     */
    private calculateCV(ev: number, ac: number): number {
        return ev - ac;
    }

    /**
     * CONCEITO: Schedule Variance (SV)
     * Desvio em cronograma (em valor)
     * 
     * FÓRMULA: SV = EV - PV
     */
    private calculateSV(ev: number, pv: number): number {
        return ev - pv;
    }

    /**
     * CONCEITO: Estimate At Completion (EAC)
     * Previsão de custo final do projeto
     * 
     * FÓRMULA: EAC = BAC / CPI
     */
    private calculateEAC(cpi: number): number {
        if (cpi === 0) return this.bac;
        return this.bac / cpi;
    }

    /**
     * CONCEITO: Estimate To Complete (ETC)
     * Quanto ainda falta gastar
     * 
     * FÓRMULA: ETC = EAC - AC
     */
    private calculateETC(eac: number, ac: number): number {
        return eac - ac;
    }

    /**
     * CONCEITO: Variance At Completion (VAC)
     * Desvio esperado no final
     * 
     * FÓRMULA: VAC = BAC - EAC
     */
    private calculateVAC(eac: number): number {
        return this.bac - eac;
    }

    /**
     * Adicionar medição (usar isso toda semana/mês)
     */
    public addMeasurement(
        date: string,
        plannedPercentComplete: number,
        actualPercentComplete: number,
        actualCost: number
    ): EvmMetrics {
        const pv = this.calculatePV(plannedPercentComplete);
        const ev = this.calculateEV(actualPercentComplete);
        const ac = actualCost;

        const cpi = this.calculateCPI(ev, ac);
        const spi = this.calculateSPI(ev, pv);
        const cv = this.calculateCV(ev, ac);
        const sv = this.calculateSV(ev, pv);
        const eac = this.calculateEAC(cpi);
        const etc = this.calculateETC(eac, ac);
        const vac = this.calculateVAC(eac);

        const metrics: EvmMetrics = {
            date,
            pv,
            ev,
            ac,
            cpi,
            spi,
            cv,
            sv,
            eac,
            etc,
            vac,
            bac: this.bac,
            percentComplete: actualPercentComplete,
        };

        this.historico.push(metrics);
        return metrics;
    }

    /**
     * Obter última medição
     */
    public getLatest(): EvmMetrics | null {
        if (this.historico.length === 0) return null;
        return this.historico[this.historico.length - 1];
    }

    /**
     * Obter histórico completo (para Curva S)
     */
    public getHistorico(): EvmMetrics[] {
        return this.historico;
    }

    /**
     * CONCEITO: Previsão Linear
     * Usar regressão linear para prever EAC futuro
     */
    public forecastUsingTrend(): {
        forecastedEAC: number;
        forecastedETC: number;
        trendCPI: number;
    } {
        if (this.historico.length < 2) {
            const latest = this.getLatest();
            return {
                forecastedEAC: latest?.eac || this.bac,
                forecastedETC: latest?.etc || this.bac,
                trendCPI: latest?.cpi || 1.0,
            };
        }

        // Calcular CPI médio
        const cpiValues = this.historico.map(m => m.cpi);
        const avgCPI = cpiValues.reduce((a, b) => a + b, 0) / cpiValues.length;

        const latest = this.getLatest()!;
        const remainingWork = this.bac - latest.ev;
        const forecastedETC = remainingWork / avgCPI;
        const forecastedEAC = latest.ac + forecastedETC;

        return {
            forecastedEAC,
            forecastedETC,
            trendCPI: avgCPI,
        };
    }

    /**
     * CONCEITO: Gerar Alertas Automáticos
     * Baseado em limiares
     */
    public generateAlerts(): Alert[] {
        const alerts: Alert[] = [];
        const latest = this.getLatest();

        if (!latest) return alerts;

        // 1. Alerta de Cronograma (SPI)
        if (latest.spi < 0.90) {
            alerts.push({
                id: 'EVM_SPI_CRITICAL',
                tipo: 'CRÍTICO',
                titulo: `⏱️ Projeto ${((1 - latest.spi) * 100).toFixed(1)}% atrasado`,
                descricao: `SPI = ${latest.spi.toFixed(2)}. Cronograma está em risco crítico.`,
                metrica: 'SPI',
                valor: latest.spi,
                severidade: 10,
                dataDate: new Date(latest.date),
                acaoRecomendada: 'Comprimir cronograma. Verifique atividades críticas e considere fast-tracking.',
            });
        } else if (latest.spi < 0.95) {
            alerts.push({
                id: 'EVM_SPI_WARNING',
                tipo: 'AVISO',
                titulo: `⚠️ Leve atraso no cronograma (${((1 - latest.spi) * 100).toFixed(1)}%)`,
                descricao: `SPI = ${latest.spi.toFixed(2)}`,
                metrica: 'SPI',
                valor: latest.spi,
                severidade: 6,
                dataDate: new Date(latest.date),
                acaoRecomendada: 'Monitorar de perto. Evitar que desvio aumente.',
            });
        }

        // 2. Alerta de Custo (CPI)
        if (latest.cpi < 0.85) {
            alerts.push({
                id: 'EVM_CPI_CRITICAL',
                tipo: 'CRÍTICO',
                titulo: `💰 Projeto ${((1 - latest.cpi) * 100).toFixed(1)}% sobre-orçamento`,
                descricao: `CPI = ${latest.cpi.toFixed(2)}. Orçamento em risco crítico.`,
                metrica: 'CPI',
                valor: latest.cpi,
                severidade: 10,
                dataDate: new Date(latest.date),
                acaoRecomendada: 'Revisar custos urgentemente. Otimizar recursos e renegociar fornecedores.',
            });
        } else if (latest.cpi < 0.95) {
            alerts.push({
                id: 'EVM_CPI_WARNING',
                tipo: 'AVISO',
                titulo: `💸 Leve estouro de orçamento (${((1 - latest.cpi) * 100).toFixed(1)}%)`,
                descricao: `CPI = ${latest.cpi.toFixed(2)}`,
                metrica: 'CPI',
                valor: latest.cpi,
                severidade: 7,
                dataDate: new Date(latest.date),
                acaoRecomendada: 'Controlar custos. Evitar desperdícios.',
            });
        }

        // 3. Forecast de Excedente (VAC)
        if (latest.vac < -this.bac * 0.10) { // Exceder 10% do orçamento
            alerts.push({
                id: 'EVM_VAC_CRITICAL',
                tipo: 'CRÍTICO',
                titulo: `📉 Previsão de excedente de R$ ${Math.abs(latest.vac).toLocaleString('pt-BR')}`,
                descricao: `EAC previsto: R$ ${latest.eac.toLocaleString('pt-BR')} (${((latest.eac / this.bac - 1) * 100).toFixed(1)}% acima)`,
                metrica: 'VAC',
                valor: latest.vac,
                severidade: 9,
                dataDate: new Date(latest.date),
                acaoRecomendada: 'Solicitar aprovação urgente para exceder orçamento. Replanejar escopo.',
            });
        } else if (latest.vac < 0) {
            alerts.push({
                id: 'EVM_VAC_WARNING',
                tipo: 'AVISO',
                titulo: `⚠️ Previsão de leve excedente de R$ ${Math.abs(latest.vac).toLocaleString('pt-BR')}`,
                descricao: `EAC previsto: R$ ${latest.eac.toLocaleString('pt-BR')}`,
                metrica: 'VAC',
                valor: latest.vac,
                severidade: 5,
                dataDate: new Date(latest.date),
                acaoRecomendada: 'Monitorar tendência. Considerar contingência.',
            });
        }

        // 4. Alerta Positivo (Projeto indo bem)
        if (latest.cpi >= 1.05 && latest.spi >= 1.05) {
            alerts.push({
                id: 'EVM_PERFORMANCE_GOOD',
                tipo: 'INFO',
                titulo: `✅ Projeto performando acima do esperado`,
                descricao: `CPI = ${latest.cpi.toFixed(2)}, SPI = ${latest.spi.toFixed(2)}`,
                metrica: 'CPI_SPI',
                valor: (latest.cpi + latest.spi) / 2,
                severidade: 1,
                dataDate: new Date(latest.date),
                acaoRecomendada: 'Manter o ritmo. Documentar boas práticas.',
            });
        }

        return alerts;
    }

    /**
     * Exportar dados para Curva S (gráfico)
     */
    public exportForCurvaSChart(): Array<{
        date: string;
        PV: number;
        EV: number;
        AC: number;
    }> {
        return this.historico.map(m => ({
            date: new Date(m.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short'
            }),
            PV: m.pv,
            EV: m.ev,
            AC: m.ac,
        }));
    }
}
