// src/components/planning/CriticalActivitiesTable.tsx
import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'; // ADICIONAR
import { Card } from '@/components/ui/card';
import { constructionProTheme } from '@/lib/theme/colors';
import type { Activity } from '@/utils/planning/cpmCalculator';

interface CriticalActivitiesTableProps {
    activities: Activity[];
}

export const CriticalActivitiesTable: React.FC<CriticalActivitiesTableProps> = ({
    activities
}) => {
    const criticalActivities = activities.filter(a => a.isCritical);

    return (
        <Card
            title={
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>Atividades Críticas</span>
                </div>
            }
            subtitle={`${criticalActivities.length} atividades no caminho crítico`}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-2 font-semibold text-gray-700">Atividade</th>
                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Duração</th>
                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Folga</th>
                            <th className="text-center py-3 px-2 font-semibold text-gray-700">% Concluído</th>
                            <th className="text-left py-3 px-2 font-semibold text-gray-700">Responsável</th>
                            <th className="text-center py-3 px-2 font-semibold text-gray-700">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {criticalActivities.map((activity) => {
                            const percentComplete = activity.percentualConclusao || 0;
                            const isDelayed = percentComplete < 50;

                            return (
                                <tr
                                    key={activity.id}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                >
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                            <span className="font-medium">{activity.nome}</span>
                                        </div>
                                    </td>
                                    <td className="text-center py-3 px-2">
                                        <div className="flex items-center justify-center gap-1">
                                            <Clock className="w-3 h-3 text-gray-500" />
                                            <span>{activity.duracao}d</span>
                                        </div>
                                    </td>
                                    <td className="text-center py-3 px-2">
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                            {activity.float || 0}d
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${percentComplete >= 80
                                                        ? 'bg-green-500'
                                                        : percentComplete >= 50
                                                            ? 'bg-orange-500'
                                                            : 'bg-red-500'
                                                        }`}
                                                    style={{ width: `${percentComplete}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium w-10 text-right">
                                                {percentComplete}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className="text-gray-600 text-xs">
                                            {activity.responsavel || 'Não atribuído'}
                                        </span>
                                    </td>
                                    <td className="text-center py-3 px-2">
                                        {isDelayed ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                                <AlertCircle className="w-3 h-3" />
                                                Atenção
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                                <CheckCircle className="w-3 h-3" />
                                                Normal
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {criticalActivities.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-lg font-semibold mb-2">Nenhuma atividade crítica!</p>
                        <p className="text-sm">Todas as atividades têm folga disponível.</p>
                    </div>
                )}
            </div>

            {/* Legenda */}
            <div className="mt-4 pt-4 border-t text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <p>
                    <strong>Atenção:</strong> Atividades críticas não têm folga. Qualquer atraso impacta o prazo final do projeto.
                </p>
            </div>
        </Card>
    );
};
