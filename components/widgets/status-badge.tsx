
import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const getStatusClasses = (status: string) => {
  const lowerStatus = status.toLowerCase();
  if (['finalizado', 'no prazo', 'adiantado', 'recebido', 'aprovado'].includes(lowerStatus)) {
    return 'bg-green-500/10 text-green-400';
  }
  if (['em andamento', 'cotado'].includes(lowerStatus)) {
    return 'bg-blue-500/10 text-blue-400';
  }
  if (['não iniciado', 'atenção'].includes(lowerStatus)) {
    return 'bg-yellow-500/10 text-yellow-400';
  }
  if (['atrasado', 'pendente', 'crítico'].includes(lowerStatus)) {
    return 'bg-red-500/10 text-red-400';
  }
  return 'bg-gray-500/10 text-gray-400';
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusClasses(status)}`}>
      {status}
    </span>
  );
};
