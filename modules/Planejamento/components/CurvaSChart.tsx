// src/components/planning/CurvaSChart.tsx
import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface CurvaSChartProps {
    data: Array<{
        date: string;
        PV: number;
        EV: number;
        AC: number;
    }>;
    title?: string;
}

export const CurvaSChart: React.FC<CurvaSChartProps> = ({
    data,
    title = 'Curva S - Análise de Valor Agregado'
}) => {
    // Formatar valores para exibição (milhares/milhões)
    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `R$ ${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `R$ ${(value / 1000).toFixed(0)}K`;
        }
        return `R$ ${value.toFixed(0)}`;
    };

    // Tooltip customizado
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const pvValue = payload[0]?.value || 0;
            const evValue = payload[1]?.value || 0;
            const acValue = payload[2]?.value || 0;

            const isAhead = evValue > pvValue;
            const isBehind = evValue < pvValue;
            const isOnTrack = Math.abs(evValue - pvValue) < pvValue * 0.05; // 5% margem

            return (
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                        {payload[0].payload.date}
                    </p>

                    {/* Valores */}
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs mb-1">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="font-medium min-w-[80px]">{entry.name}:</span>
                            <span className="text-gray-600">{formatCurrency(entry.value)}</span>
                        </div>
                    ))}

                    {/* Análise rápida COM ÍCONES SVG */}
                    <div className="mt-3 pt-2 border-t border-gray-100">
                        {isOnTrack && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">No prazo</span>
                            </div>
                        )}
                        {isAhead && !isOnTrack && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">
                                    Adiantado ({((evValue / pvValue - 1) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        )}
                        {isBehind && !isOnTrack && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="font-medium">
                                    Atrasado ({((1 - evValue / pvValue) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        )}

                        {/* Análise de custo */}
                        {acValue > evValue && (
                            <div className="flex items-center gap-1.5 text-xs text-orange-600 mt-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="font-medium">
                                    Sobre-orçamento ({((acValue / evValue - 1) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        )}
                        {acValue < evValue && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-medium">
                                    Sob-orçamento ({((1 - acValue / evValue) * 100).toFixed(1)}%)
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (

        <Card>
            <CardHeader>
                <CardTitle>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary-600" />
                        <span>{title}</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        {/* Grid de fundo */}
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E5E7EB"
                            strokeOpacity={0.5}
                        />

                        {/* Eixo X (Datas) */}
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            stroke="#D1D5DB"
                            tickLine={{ stroke: '#D1D5DB' }}
                        />

                        {/* Eixo Y (Valores) */}
                        <YAxis
                            tick={{ fill: '#6B7280', fontSize: 12 }}
                            tickFormatter={formatCurrency}
                            stroke="#D1D5DB"
                            tickLine={{ stroke: '#D1D5DB' }}
                        />

                        {/* Tooltip customizado */}
                        <Tooltip content={<CustomTooltip />} />

                        {/* Legenda */}
                        <Legend
                            wrapperStyle={{
                                paddingTop: '20px',
                                fontSize: '14px',
                                fontWeight: 500,
                            }}
                            iconType="line"
                        />

                        {/* Linha Azul: PV (Planejado) */}
                        <Line
                            type="monotone"
                            dataKey="PV"
                            name="Planejado (PV)"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, fill: '#3B82F6', strokeWidth: 3, stroke: '#fff' }}
                        />

                        {/* Linha Verde: EV (Realizado) */}
                        <Line
                            type="monotone"
                            dataKey="EV"
                            name="Realizado (EV)"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 7, fill: '#10B981', strokeWidth: 3, stroke: '#fff' }}
                        />

                        {/* Linha Vermelha: AC (Custo Real) - Tracejada */}
                        <Line
                            type="monotone"
                            dataKey="AC"
                            name="Custo Real (AC)"
                            stroke="#EF4444"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, fill: '#EF4444', strokeWidth: 3, stroke: '#fff' }}
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* Legenda explicativa */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="flex items-start gap-2">
                            <div className="w-8 h-0.5 bg-blue-500 mt-2 flex-shrink-0"></div>
                            <div>
                                <span className="font-semibold text-blue-700 block mb-1">
                                    PV (Planejado)
                                </span>
                                <span className="text-gray-600">
                                    Valor que deveria ter sido agregado até a data, conforme cronograma
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <div className="w-8 h-0.5 bg-green-500 mt-2 flex-shrink-0"></div>
                            <div>
                                <span className="font-semibold text-green-700 block mb-1">
                                    EV (Realizado)
                                </span>
                                <span className="text-gray-600">
                                    Valor realmente agregado até o momento (progresso físico × orçamento)
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <div className="w-8 h-0.5 mt-2 flex-shrink-0 dashed-line-horizontal"></div>
                            <div>
                                <span className="font-semibold text-red-700 block mb-1">
                                    AC (Custo Real)
                                </span>
                                <span className="text-gray-600">
                                    Custo efetivamente gasto até o momento
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Guia de interpretação */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-900 font-medium mb-2">
                            Como interpretar a Curva S:
                        </p>
                        <ul className="text-xs text-blue-800 space-y-1">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>EV acima de PV:</strong> Projeto adiantado no cronograma
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>EV abaixo de PV:</strong> Projeto atrasado
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>AC abaixo de EV:</strong> Gastando menos que o valor agregado (eficiente)
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                <span>
                                    <strong>AC acima de EV:</strong> Gastando mais que o valor agregado (ineficiente)
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
