import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Mapeia palavras-chave de status (português) para variants do Badge
 * Usado principalmente em contextos de planejamento/cronograma
 */
const getStatusVariant = (status: string): "success" | "error" | "warning" | "info" | "default" => {
  const lowerStatus = status.toLowerCase();

  // VERDE: Sucesso / Concluído / Positivo
  if (['finalizado', 'no prazo', 'adiantado', 'recebido', 'aprovado', 'concluído'].includes(lowerStatus)) {
    return 'success';
  }

  // AZUL: Em Progresso / Informação
  if (['em andamento', 'cotado', 'em análise', 'processando'].includes(lowerStatus)) {
    return 'info';
  }

  // AMARELO: Atenção / Pendente / Aguardando
  if (['não iniciado', 'atenção', 'aguardando', 'pendente início'].includes(lowerStatus)) {
    return 'warning';
  }

  // VERMELHO: Atrasado / Crítico / Erro
  if (['atrasado', 'pendente', 'crítico', 'bloqueado', 'cancelado'].includes(lowerStatus)) {
    return 'error';
  }

  // CINZA: Padrão
  return 'default';
};

/**
 * StatusBadge - Componente especializado para exibir status de tarefas/atividades
 * Usa Badge (ui) como base, adicionando lógica de mapeamento automático
 * 
 * @example
 * <StatusBadge status="Finalizado" />
 * <StatusBadge status="Em andamento" />
 * <StatusBadge status="Atrasado" />
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const variant = getStatusVariant(status);

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
};
