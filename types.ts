
export type Module =
  | 'dashboard'
  | 'orcamento'
  | 'planejamento'
  | 'composicao'
  | 'diario'
  | 'medicao'
  | 'curva-abc'
  | 'compras'
  | 'financeiro'
  | 'clima'
  | 'settings';

export interface NavItemType {
  id: Module;
  icon: string;
  label: string;
}

export interface Etapa {
  nome: string;
  descricao: string;
  previsto: number;
  realizado: number;
  porcentagem: number;
}

export interface ServicoExecutado {
  id: number;
  servico: string;
  quantidadeExecutada: number;
  quantidadePrevista: number;
  unidade: string;
  equipe: number;
}

export interface DiarioRegistro {
  id: number;
  data: string;
  responsavel: string;
  etapa: string;
  servicos: ServicoExecutado[];
  observacoes: string;
  clima: string;
  status: string;
  fotos?: string[];
  horario_inicial?: string;
  horario_final?: string;
  recursos?: string[];
}

export interface OrcamentoItem {
  id: number;
  nivel: string;
  pai: number | null;
  fonte: string;
  codigo: string;
  discriminacao: string;
  unidade: string;
  quantidade: number;
  mat_unit: number;
  mo_unit: number;
  expandido: boolean;
  use_total_unit?: boolean;
  sourceMetadata?: {
    origin: 'manual' | 'ai_import';
    originalRaw?: string;
    confidence?: number;
  };
}

export interface Restriction {
  id: string;
  tipo: "material" | "clima" | "liberação" | "rh" | "outro";
  descricao: string;
  data_impacto: string; // YYYY-MM-DD
  severidade: "BAIXA" | "MÉDIA" | "ALTA";
  atividades_bloqueadas: number[];
  dias_atraso_estimado: number;
  mitigacao?: string;
  impacto_financeiro?: number;
}

export interface PlanejamentoItem {
  id: number;
  orcamentoId: number;
  nivel: string;
  pai: number | null;
  discriminacao: string;
  unidade: string;
  quantidade: number;
  valorTotal: number;

  // PILAR 1: SCHEDULE BUILDER
  duracao: number; // dias úteis
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  predecessores: number[];
  sucessores: number[];
  tipoRelacao: "FS" | "SS" | "FF" | "SF";
  lag: number;
  responsavel: string;
  folga_total: number;
  folga_livre: number;
  eh_critica: boolean;
  caminho_critico: boolean;

  // PILAR 2: PREDICTIVE ADJUSTER
  percentualConclusao: number;
  status: "Não iniciado" | "Em andamento" | "Atrasado" | "Concluído";
  duracaoReal: number;
  inicioReal: string; // Mapped to dataInicio_real
  fimReal: string;    // Mapped to dataFim_real
  data_update_real: string;
  usuario_update: string;
  observacoes: string;
  desvio_inicio: number;
  desvio_prazo: number;

  // PILAR 3: OPTIMIZE CPM ENGINE
  custo_por_dia: number;
  quantidade_recursos_minimo: number;
  quantidade_recursos_maximo: number;
  pode_fasttrack: boolean;
  pode_crash: boolean;
  producao_planejada: number;
  producao_real: number;
  indice_produtividade: number;

  // PILAR 4: CONSTRAINT MANAGER
  restricoes: Restriction[];
  dependencia_externa: boolean;
  materiais_requeridos: string[];
  data_liberacao_minima: string;

  // PILAR 5: REPORT GENERATOR
  custoOrcado: number;
  custoRealizado: number;
  risco_nivel: "BAIXO" | "MÉDIO" | "ALTO";
  foto_progresso: string[];
  data_conclusao_esperada: string;

  // UI State
  expandido: boolean;
  isParent: boolean;
  quantidadeExecutada: number; // Legacy support
}

export interface MedicaoItem extends OrcamentoItem {
  quantMedida: number;
  medicaoAcumAnterior: number;
}

export interface Cotacao {
  fornecedor: string;
  vendedor?: string;
  preco: number;
  prazo: number;
}

export interface Compra {
  id: string;
  data_solicitacao: string;
  responsavel: string;
  item: string;
  quantidade: number;
  unidade: string;
  data_necessaria: string;
  etapa: string;
  justificativa?: string;
  status: 'Solicitado' | 'Cotado' | 'Aprovado' | 'Recebido';
  fornecedor: string;
  cotacoes: Cotacao[];
}

export interface Fornecedor {
  nome: string;
  vendedor: string;
  cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
}

export interface Profissional {
  id: number;
  cargo: string;
  nome: string;
  email?: string;
  telefone?: string;
}

// Re-export for backward compatibility, aliasing Restriction
export type ConstraintItem = Restriction;
