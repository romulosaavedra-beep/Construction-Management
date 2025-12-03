// src/components/planning/EvmKpiCards.tsx
import React from 'react';
import { DollarSign, Clock, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { constructionProTheme } from '@/lib/theme/colors';
import { Card } from '@/components/ui/card';
import type { EvmMetrics } from '@/utils/planning/evmCalculator';

interface EvmKpiCardsProps {
    metrics: EvmMetrics;
}

interface KpiCardData {
    label: string;
    value: string;
    subtext: string;
    status: 'success' | 'warning' | 'critical' | 'neutral';
    icon: React.ReactNode;
    trend?: 'up' | 'down';
}

export const EvmKpiCards: React.FC<EvmKpiCardsProps> = ({ metrics }) => {
    const formatCurrency = (value: number) => {
        return `R$ ${(value / 1000).toFixed(1)}K`;
    };

    // Determinar status
    const cpiStatus = metrics.cpi >= 1 ? 'success' : metrics.cpi >= 0.9 ? 'warning' : 'critical';
    const spiStatus = metrics.spi >= 1 ? 'success' : metrics.spi >= 0.9 ? 'warning' : 'critical';
    const vacStatus = metrics.vac >= 0 ? 'success' : metrics.vac >= -metrics.bac * 0.1 ? 'warning' : 'critical';

    const kpis: KpiCardData[] = [
        {
            label: 'CPI (Custo)',
            value: metrics.cpi.toFixed(2),
            subtext: metrics.cpi >= 1 ? 'Sob-orçamento' : 'Sobre-orçamento',
            status: cpiStatus,
            icon: <DollarSign className="w-6 h-6" />,
            trend: metrics.cpi >= 1 ? 'up' : 'down',
        },
        {
            label: 'SPI (Prazo)',
            value: metrics.spi.toFixed(2),
            subtext: metrics.spi >= 1 ? 'Adiantado' : 'Atrasado',
            status: spiStatus,
            icon: <Clock className="w-6 h-6" />,
            trend: metrics.spi >= 1 ? 'up' : 'down',
        },
        {
            label: 'EAC (Custo Final)',
            value: formatCurrency(metrics.eac),
            subtext: `vs ${formatCurrency(metrics.bac)} planejado`,
            status: metrics.eac <= metrics.bac ? 'success' : 'warning',
            icon: <TrendingUp className="w-6 h-6" />,
        },
        {
            label: 'VAC (Variação)',
            value: formatCurrency(Math.abs(metrics.vac)),
            subtext: metrics.vac >= 0 ? 'Economia' : 'Excedente',
            status: vacStatus,
            icon: metrics.vac >= 0 ? <TrendingUp className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />,
            trend: metrics.vac >= 0 ? 'up' : 'down',
        },
    ];

    const statusColors = {
        success: 'text-green-600',
        warning: 'text-orange-600',
        critical: 'text-red-600',
        neutral: 'text-gray-600',
    };

    const statusBgColors = {
        success: 'bg-green-50 border-green-200',
        warning: 'bg-orange-50 border-orange-200',
        critical: 'bg-red-50 border-red-200',
        neutral: 'bg-gray-50 border-gray-200',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => (
                <div
                    key={index}
                    className={`p-4 rounded-lg border transition-all hover:shadow-md ${statusBgColors[kpi.status]}`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">{kpi.label}</span>
                        <span className={statusColors[kpi.status]}>{kpi.icon}</span>
                    </div>

                    {/* Valor Principal */}
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-3xl font-bold ${statusColors[kpi.status]}`}>
                            {kpi.value}
                        </span>
                        {kpi.trend && (
                            <span className="text-sm">
                                {kpi.trend === 'up' ? (
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                )}
                            </span>
                        )}
                    </div>

                    {/* Subtexto */}
                    <div className="text-xs text-gray-600">
                        {kpi.subtext}
                    </div>
                </div>
            ))}
        </div>
    );
};
